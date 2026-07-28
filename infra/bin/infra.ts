#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NewsFeedStack } from '../lib/news-feed-stack';

const app = new cdk.App();

new NewsFeedStack(app, 'NewsFeedStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
