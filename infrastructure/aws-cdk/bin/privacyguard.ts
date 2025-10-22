#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PrivacyGuardStack } from '../lib/privacyguard-stack';
import { PrivacyGuardMultiRegionStack } from '../lib/privacyguard-multi-region-stack';
import { PrivacyGuardMonitoringStack } from '../lib/privacyguard-monitoring-stack';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';
const enableMultiRegion = app.node.tryGetContext('enableMultiRegion') === 'true';
const domainName = app.node.tryGetContext('domainName');
const certificateArn = app.node.tryGetContext('certificateArn');

// Account and region configuration
const accountConfig = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  staging: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  prod: {
    account: process.env.PROD_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
};

const env = {
  account: accountConfig[environment as keyof typeof accountConfig]?.account,
  region: accountConfig[environment as keyof typeof accountConfig]?.region,
};

// Primary stack (US East 1)
const primaryStack = new PrivacyGuardStack(app, `PrivacyGuard-${environment}`, {
  env,
  environment: environment as 'dev' | 'staging' | 'prod',
  domainName,
  certificateArn,
  enableMultiRegion,
  description: `PrivacyGuard primary stack for ${environment} environment`,
});

// Multi-region stacks (if enabled)
if (enableMultiRegion && environment === 'prod') {
  // EU West 1 for GDPR compliance
  const euStack = new PrivacyGuardMultiRegionStack(app, `PrivacyGuard-EU-${environment}`, {
    env: {
      account: env.account,
      region: 'eu-west-1',
    },
    environment: environment as 'dev' | 'staging' | 'prod',
    primaryRegion: 'us-east-1',
    complianceRegion: 'GDPR',
    primaryStack,
    description: `PrivacyGuard EU stack for ${environment} environment (GDPR compliance)`,
  });

  // AP Southeast 1 for PDPL compliance
  const apacStack = new PrivacyGuardMultiRegionStack(app, `PrivacyGuard-APAC-${environment}`, {
    env: {
      account: env.account,
      region: 'ap-southeast-1',
    },
    environment: environment as 'dev' | 'staging' | 'prod',
    primaryRegion: 'us-east-1',
    complianceRegion: 'PDPL',
    primaryStack,
    description: `PrivacyGuard APAC stack for ${environment} environment (PDPL compliance)`,
  });

  // Add dependencies
  euStack.addDependency(primaryStack);
  apacStack.addDependency(primaryStack);
}

// Monitoring stack
const monitoringStack = new PrivacyGuardMonitoringStack(app, `PrivacyGuard-Monitoring-${environment}`, {
  env,
  environment: environment as 'dev' | 'staging' | 'prod',
  primaryStack,
  description: `PrivacyGuard monitoring stack for ${environment} environment`,
});

monitoringStack.addDependency(primaryStack);

// Add stack-level tags
const commonTags = {
  Project: 'PrivacyGuard',
  Environment: environment,
  Owner: 'PrivacyGuard Team',
  Repository: 'privacyguard-aws-agent',
  ManagedBy: 'AWS CDK',
};

Object.entries(commonTags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

// Synthesis
app.synth();