import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();
const stack = new InfraStack(app, 'TestStack', {
  env: { account: '123456789012', region: 'ap-southeast-2' },
});
const template = Template.fromStack(stack);

describe('InfraStack', () => {
  test('frontend bucket blocks all public access', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('database is not publicly accessible', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      PubliclyAccessible: false,
    });
  });

  test('backend secrets never leak into plain environment variables', () => {
    const SENSITIVE_NAMES = ['DB_USERNAME', 'DB_PASSWORD', 'SESSION_SECRET', 'GEMINI_API_KEY'];

    const [taskDef] = Object.values(template.findResources('AWS::ECS::TaskDefinition'));
    const [container] = taskDef.Properties.ContainerDefinitions;
    const secretNames = container.Secrets.map((s: { Name: string }) => s.Name);
    const envNames = (container.Environment ?? []).map((e: { Name: string }) => e.Name);

    for (const name of SENSITIVE_NAMES) {
      expect(secretNames).toContain(name);
      expect(envNames).not.toContain(name);
    }
  });

  test('CloudFront redirects HTTP to HTTPS for both the site and /api/*', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: 'redirect-to-https' }),
        CacheBehaviors: Match.arrayWith([
          Match.objectLike({ PathPattern: '/api/*', ViewerProtocolPolicy: 'redirect-to-https' }),
        ]),
      }),
    });
  });

  test('ALB health check hits the backend /health route', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      HealthCheckPath: '/health',
    });
  });

  test('database security group has no rule open to the internet', () => {
    const groups = template.findResources('AWS::EC2::SecurityGroup', {
      Properties: { GroupDescription: 'Allow Postgres access from the backend service only' },
    });
    expect(Object.keys(groups)).toHaveLength(1);

    const [group] = Object.values(groups);
    for (const rule of group.Properties.SecurityGroupIngress ?? []) {
      expect(rule.CidrIp).not.toBe('0.0.0.0/0');
      expect(rule.CidrIpv6).not.toBe('::/0');
    }

    const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress', {
      Properties: { GroupId: { 'Fn::GetAtt': [Object.keys(groups)[0], 'GroupId'] } },
    });
    for (const rule of Object.values(ingressRules)) {
      expect(rule.Properties.CidrIp).not.toBe('0.0.0.0/0');
      expect(rule.Properties.CidrIpv6).not.toBe('::/0');
      expect(rule.Properties.SourceSecurityGroupId).toBeDefined();
    }
  });

  test('ALB security group has no rule open to the internet', () => {
    const groups = template.findResources('AWS::EC2::SecurityGroup', {
      Properties: { GroupDescription: 'Allow inbound HTTP from CloudFront only' },
    });
    expect(Object.keys(groups)).toHaveLength(1);
    const [groupId, group] = Object.entries(groups)[0];

    for (const rule of group.Properties.SecurityGroupIngress ?? []) {
      expect(rule.CidrIp).not.toBe('0.0.0.0/0');
      expect(rule.CidrIpv6).not.toBe('::/0');
    }

    const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress', {
      Properties: { GroupId: { 'Fn::GetAtt': [groupId, 'GroupId'] } },
    });
    for (const rule of Object.values(ingressRules)) {
      expect(rule.Properties.CidrIp).not.toBe('0.0.0.0/0');
      expect(rule.Properties.CidrIpv6).not.toBe('::/0');
    }
  });
});
