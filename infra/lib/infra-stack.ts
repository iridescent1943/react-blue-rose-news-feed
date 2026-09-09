import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  aws_ec2 as ec2,
  aws_rds as rds,
  aws_ecr as ecr,
  aws_ecs as ecs,
  aws_logs as logs,
  aws_elasticloadbalancingv2 as elbv2,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_iam as iam,
  aws_s3 as s3,
  aws_secretsmanager as secretsmanager,
} from 'aws-cdk-lib';

const DB_NAME = 'newsfeed';
const DB_USERNAME = 'newsfeed';
const BACKEND_CONTAINER_PORT = 3000;
const GITHUB_REPO = 'iridescent1943/react-blue-rose-news-feed';
const GITHUB_DEPLOY_BRANCH = 'main';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC - Public and private subnets, no NAT gateway - Shared
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'Database', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
      restrictDefaultSecurityGroup: true,
    });

    // RDS - Postgres instance and its security group - Backend
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Allow Postgres access from the backend service only',
    });

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret(DB_USERNAME),
      databaseName: DB_NAME,
      multiAz: false,
      allocatedStorage: 20,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      port:5432,
    });

    // ECS - Cluster and internet-facing ALB - Shared
    const ecsCluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Allow inbound HTTP from CloudFront only',
    });
    const cloudFrontPrefixList = ec2.PrefixList.fromLookup(this, 'CloudFrontPrefixList', {
      prefixListName: 'com.amazonaws.global.cloudfront.origin-facing',
    });
    albSecurityGroup.addIngressRule(
      ec2.Peer.prefixList(cloudFrontPrefixList.prefixListId),
      ec2.Port.tcp(80),
      'HTTP from CloudFront only',
    );

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    // S3 bucket for the built React app - Frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront - Shared
    const albOrigin = new origins.HttpOrigin(alb.loadBalancerDnsName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: albOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // ECR repo, Fargate service and target group for the Sinatra API - Backend
    const backendRepo = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: 'bluerose-backend',
      lifecycleRules: [{ maxImageCount: 10 }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    const backendServiceSecurityGroup = new ec2.SecurityGroup(this, 'BackendServiceSecurityGroup', {
      vpc,
      description: 'Allow traffic from the ALB to the backend service',
    });
    backendServiceSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(BACKEND_CONTAINER_PORT),
      'ALB to backend',
    );
    dbSecurityGroup.addIngressRule(backendServiceSecurityGroup, ec2.Port.tcp(5432), 'Backend to Postgres');

    const sessionSecret = new secretsmanager.Secret(this, 'SessionSecret', {
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 64,
      },
    });

    const backendTaskDefinition = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    backendTaskDefinition.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo, 'latest'),
      portMappings: [{ containerPort: BACKEND_CONTAINER_PORT }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logRetention: logs.RetentionDays.TWO_WEEKS,
      }),
      environment: {
        RACK_ENV: 'development',
        DB_HOST: database.instanceEndpoint.hostname,
        DB_PORT: database.instanceEndpoint.port.toString(),
        DB_NAME,
        ALLOWED_ORIGINS: `https://${distribution.distributionDomainName}`,
      },
      secrets: {
        DB_USERNAME: ecs.Secret.fromSecretsManager(database.secret!, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, 'password'),
        SESSION_SECRET: ecs.Secret.fromSecretsManager(sessionSecret),
      },
    });

    const backendService = new ecs.FargateService(this, 'BackendService', {
      cluster: ecsCluster,
      taskDefinition: backendTaskDefinition,
      desiredCount: 0,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [backendServiceSecurityGroup],
      circuitBreaker: { rollback: true },
    });

    const backendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BackendTargetGroup', {
      vpc,
      port: BACKEND_CONTAINER_PORT,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      targets: [backendService],
      healthCheck: { path: '/health' },
    });

    // Listener - The ALB only ever receives /api/* traffic from CloudFront
    alb.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultTargetGroups: [backendTargetGroup],
    });

    // GitHub Actions OIDC
    const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const githubDeployRole = new iam.Role(this, 'GitHubActionsDeployRole', {
      description: 'Assumed by GitHub Actions to sync the frontend to S3 and to build/deploy the backend',
      assumedBy: new iam.WebIdentityPrincipal(githubOidcProvider.openIdConnectProviderArn, {
        StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
        StringLike: { 'token.actions.githubusercontent.com:sub': `repo:${GITHUB_REPO}:ref:refs/heads/${GITHUB_DEPLOY_BRANCH}` },
      }),
    });
    frontendBucket.grantReadWrite(githubDeployRole);
    githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudfront:CreateInvalidation'],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`],
      }),
    );
    backendRepo.grantPullPush(githubDeployRole);
    githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:UpdateService', 'ecs:DescribeServices'],
        resources: [backendService.serviceArn],
      }),
    );

    // Outputs - HTTPS URL, ALB DNS name, frontend bucket, distribution id, backend repo URI and the GitHub Actions role ARN
    new cdk.CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'AlbDnsName', { value: alb.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'FrontendBucketName', { value: frontendBucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'BackendRepoUri', { value: backendRepo.repositoryUri });
    new cdk.CfnOutput(this, 'GitHubActionsDeployRoleArn', { value: githubDeployRole.roleArn });
  }
}
