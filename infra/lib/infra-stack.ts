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
} from 'aws-cdk-lib';

const DB_NAME = 'newsfeed';
const DB_USERNAME = 'newsfeed';
const BACKEND_CONTAINER_PORT = 3000;
const FRONTEND_CONTAINER_PORT = 80;

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

    // CloudFront - Shared
    const albOrigin = new origins.HttpOrigin(alb.loadBalancerDnsName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: albOrigin,
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
    });

    // ECR repo, Fargate service and target group for the React app - Frontend
    const frontendRepo = new ecr.Repository(this, 'FrontendRepo', {
      repositoryName: 'bluerose-frontend',
      lifecycleRules: [{ maxImageCount: 10 }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    const frontendServiceSecurityGroup = new ec2.SecurityGroup(this, 'FrontendServiceSecurityGroup', {
      vpc,
      description: 'Allow traffic from the ALB to the frontend service',
    });
    frontendServiceSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(FRONTEND_CONTAINER_PORT),
      'ALB to frontend',
    );

    const frontendTaskDefinition = new ecs.FargateTaskDefinition(this, 'FrontendTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    frontendTaskDefinition.addContainer('FrontendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(frontendRepo, 'latest'),
      portMappings: [{ containerPort: FRONTEND_CONTAINER_PORT }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'frontend',
        logRetention: logs.RetentionDays.TWO_WEEKS,
      }),
    });

    const frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster: ecsCluster,
      taskDefinition: frontendTaskDefinition,
      desiredCount: 0,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [frontendServiceSecurityGroup],
      circuitBreaker: { rollback: true },
    });

    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'FrontendTargetGroup', {
      vpc,
      port: FRONTEND_CONTAINER_PORT,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      targets: [frontendService],
      healthCheck: { path: '/' },
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
        CORS_ORIGIN: `https://${distribution.distributionDomainName}`,
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(database.secret!, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, 'password'),
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

    // Listener - Routes /api/* to backend, everything else to frontend - Shared
    const listener = alb.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultTargetGroups: [frontendTargetGroup],
    });
    listener.addAction('BackendApiRouting', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
      action: elbv2.ListenerAction.forward([backendTargetGroup]),
    });

    // Outputs - HTTPS URL, ALB DNS name and both ECR repo URIs - Shared
    new cdk.CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'AlbDnsName', { value: alb.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'FrontendRepoUri', { value: frontendRepo.repositoryUri });
    new cdk.CfnOutput(this, 'BackendRepoUri', { value: backendRepo.repositoryUri });
  }
}
