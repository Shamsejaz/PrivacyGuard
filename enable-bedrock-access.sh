#!/bin/bash

# Enable and Test Amazon Bedrock Access for PrivacyComply Agent
echo "🤖 Checking Amazon Bedrock Access..."

REGION=${1:-us-east-1}
echo "Using region: $REGION"

# Check if Bedrock is available in the region
echo ""
echo "1. Checking Bedrock availability in region $REGION..."
AVAILABLE_REGIONS=("us-east-1" "us-west-2" "eu-west-1" "ap-southeast-1")

if [[ " ${AVAILABLE_REGIONS[@]} " =~ " ${REGION} " ]]; then
    echo "   ✅ Bedrock is available in $REGION"
else
    echo "   ❌ Bedrock is not available in $REGION"
    echo "   📋 Available regions: ${AVAILABLE_REGIONS[*]}"
    echo "   🔧 Please use one of the available regions"
    exit 1
fi

# Test Bedrock access
echo ""
echo "2. Testing Bedrock API access..."
if aws bedrock list-foundation-models --region $REGION >/dev/null 2>&1; then
    echo "   ✅ Bedrock API access granted"
    
    # List available models
    echo ""
    echo "3. Checking available foundation models..."
    MODELS=$(aws bedrock list-foundation-models --region $REGION --query 'modelSummaries[?contains(modelId, `claude`)].modelId' --output text)
    
    if [ -n "$MODELS" ]; then
        echo "   ✅ Claude models available:"
        for model in $MODELS; do
            echo "      - $model"
        done
        
        # Check if Claude 3 Sonnet is available
        if echo "$MODELS" | grep -q "claude-3-sonnet"; then
            echo "   ✅ Claude 3 Sonnet is available"
        else
            echo "   ⚠️  Claude 3 Sonnet not found, but other Claude models are available"
        fi
    else
        echo "   ❌ No Claude models available - you may need to request model access"
        echo ""
        echo "🔧 To enable model access:"
        echo "1. Go to AWS Console → Amazon Bedrock"
        echo "2. Click 'Model access' in the left sidebar"
        echo "3. Click 'Manage model access'"
        echo "4. Enable 'Anthropic Claude 3 Sonnet'"
        echo "5. Submit the request"
        echo "6. Wait for approval (usually instant for Claude models)"
    fi
else
    echo "   ❌ Bedrock API access denied"
    echo ""
    echo "🔧 Possible issues:"
    echo "1. Bedrock service not available in your region"
    echo "2. Insufficient IAM permissions"
    echo "3. AWS account doesn't have Bedrock access"
    echo ""
    echo "Required IAM permissions:"
    echo "- bedrock:ListFoundationModels"
    echo "- bedrock:InvokeModel"
    echo "- bedrock:GetFoundationModel"
fi

# Test specific Claude 3 Sonnet model
echo ""
echo "4. Testing Claude 3 Sonnet model access..."
CLAUDE_MODEL="anthropic.claude-3-sonnet-20240229-v1:0"

if aws bedrock get-foundation-model --model-identifier $CLAUDE_MODEL --region $REGION >/dev/null 2>&1; then
    echo "   ✅ Claude 3 Sonnet model accessible"
    echo "   📋 Model ID: $CLAUDE_MODEL"
else
    echo "   ❌ Claude 3 Sonnet model not accessible"
    echo "   🔧 You may need to request access to this specific model"
fi

echo ""
echo "🎉 Bedrock access check complete!"
echo ""
echo "📋 For PrivacyComply setup, use:"
echo "Model ID: $CLAUDE_MODEL"
echo "Region: $REGION"