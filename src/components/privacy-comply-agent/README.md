# AWS PrivacyComply Agent - Frontend Components

This directory contains the frontend components for the AWS PrivacyComply Agent, an AI-powered privacy compliance monitoring and remediation system specifically designed for AWS cloud environments. This is part of a multi-cloud privacy compliance framework.

## Components Overview

### Core Components

#### `PrivacyComplyAgentDashboard.tsx`
The main dashboard component for the AWS PrivacyComply Agent that provides:
- AWS-specific agent status monitoring
- Compliance metrics visualization for AWS resources
- Setup status tracking for AWS services
- Navigation between different AWS compliance features

#### `SimpleOnboardingWizard.tsx`
A streamlined onboarding wizard that guides users through:
- AWS credentials configuration
- Service setup and validation
- Infrastructure deployment
- Final validation and activation

#### `SetupStatusCard.tsx`
A status card component that displays:
- Current setup progress
- Configuration validation status
- Quick access to setup actions
- Error reporting and troubleshooting

### Supporting Components

#### `AgentStatusDisplay.tsx`
Displays detailed agent status information including:
- Service health monitoring
- Performance metrics
- System alerts and notifications

#### `ComplianceFindingsTable.tsx`
Shows compliance findings and violations:
- Risk categorization
- Severity levels
- Remediation recommendations

#### `RemediationWorkflowPanel.tsx`
Manages automated remediation workflows:
- Workflow status tracking
- Approval processes
- Execution monitoring

#### `NaturalLanguageQueryInterface.tsx`
AI-powered query interface for:
- Natural language compliance questions
- Intelligent recommendations
- Interactive guidance

## Services Integration

### `onboarding-service.ts`
Core service for managing the onboarding process:
- AWS credentials validation
- Service configuration management
- Infrastructure deployment orchestration
- Configuration persistence

### `usePrivacyComplyAgentOnboarding.ts`
React hook that provides:
- State management for onboarding flow
- Validation result tracking
- Error handling and recovery
- Configuration persistence

## Setup Flow

### 1. Welcome Screen
- Introduction to AWS PrivacyComply Agent
- Overview of AWS-specific capabilities
- AWS setup requirements and prerequisites

### 2. AWS Configuration
- **Credentials Setup**: Access Key ID, Secret Access Key, Region
- **Service Configuration**: Enable/disable AWS services
- **Resource Configuration**: S3 buckets, DynamoDB tables, Lambda roles

### 3. Validation & Deployment
- Credential validation
- Service connectivity testing
- Infrastructure deployment
- Final system validation

## AWS Services Integration

The AWS PrivacyComply Agent integrates with the following AWS services:

### Core Services
- **Amazon Bedrock**: AI models for compliance reasoning
- **AWS Security Hub**: Security findings aggregation
- **Amazon Macie**: PII/PHI detection and classification
- **AWS CloudTrail**: API activity monitoring

### Storage & Compute
- **Amazon S3**: Report storage and data archival
- **Amazon DynamoDB**: Metadata and configuration storage
- **AWS Lambda**: Automated remediation functions

### Required Permissions

The AWS credentials must have permissions for:
- Bedrock model access
- Security Hub findings read access
- Macie job creation and management
- CloudTrail log access
- S3 bucket operations
- DynamoDB table operations
- Lambda function deployment and execution

## Configuration Structure

```typescript
interface OnboardingConfiguration {
  aws: {
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      sessionToken?: string;
    };
    services: {
      bedrock: {
        enabled: boolean;
        model: string;
        region: string;
      };
      securityHub: {
        enabled: boolean;
        region: string;
      };
      macie: {
        enabled: boolean;
        region: string;
      };
      cloudTrail: {
        enabled: boolean;
        bucketName: string;
      };
      s3: {
        reportsBucket: string;
        region: string;
      };
      dynamodb: {
        region: string;
        tablePrefix: string;
      };
      lambda: {
        region: string;
        executionRole: string;
      };
    };
  };
}
```

## Usage Examples

### Basic Setup
```tsx
import { PrivacyComplyAgentDashboard } from './components/privacy-comply-agent';

function App() {
  return (
    <div>
      {/* AWS PrivacyComply Agent Dashboard */}
      <PrivacyComplyAgentDashboard />
    </div>
  );
}
```

### Custom Onboarding
```tsx
import { SimpleOnboardingWizard } from './components/privacy-comply-agent';

function CustomSetup() {
  const handleComplete = () => {
    console.log('Setup completed');
  };

  const handleSkip = () => {
    console.log('Setup skipped');
  };

  return (
    <SimpleOnboardingWizard
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
```

### Using the Onboarding Hook
```tsx
import { usePrivacyComplyAgentOnboarding } from '../hooks/usePrivacyComplyAgentOnboarding';

function CustomComponent() {
  const {
    setupStatus,
    loading,
    error,
    validateCredentials,
    runFullValidation,
    saveConfiguration
  } = usePrivacyComplyAgentOnboarding();

  // Use the hook methods and state as needed
}
```

## Error Handling

The components include comprehensive error handling for:
- Invalid AWS credentials
- Service connectivity issues
- Permission errors
- Configuration validation failures
- Deployment errors

## Security Considerations

- AWS credentials are stored securely in browser localStorage
- Sensitive data is masked in UI components
- All API communications use HTTPS
- Configuration validation prevents insecure setups

## Development

### Running Tests
```bash
npm test -- --testPathPattern=privacy-comply-agent
```

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint -- src/components/privacy-comply-agent/
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Invalid**
   - Verify Access Key ID and Secret Access Key
   - Check IAM permissions
   - Ensure region is correct

2. **Service Validation Failures**
   - Check service availability in selected region
   - Verify IAM permissions for specific services
   - Ensure services are enabled in AWS account

3. **Deployment Errors**
   - Check Lambda execution role permissions
   - Verify S3 bucket naming conventions
   - Ensure DynamoDB table limits not exceeded

### Support

For additional support and documentation, refer to:
- AWS Documentation for service-specific requirements
- AWS PrivacyComply Agent backend service documentation
- Multi-cloud privacy compliance framework documentation
- Component-specific README files