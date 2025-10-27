#!/bin/bash

# Test Lambda Execution Role for PrivacyComply Agent
ROLE_ARN="$1"

if [ -z "$ROLE_ARN" ]; then
    echo "Usage: $0 <role-arn>"
    echo "Example: $0 arn:aws:iam::123456789012:role/PrivacyComply-Lambda-ExecutionRole"
    exit 1
fi

echo "Testing Lambda execution role: $ROLE_ARN"
echo ""

# Extract role name from ARN
ROLE_NAME=$(echo $ROLE_ARN | cut -d'/' -f2)

# Test 1: Check if role exists
echo "1. Checking if role exists..."
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    echo "   ✅ Role exists"
else
    echo "   ❌ Role not found"
    exit 1
fi

# Test 2: Check attached policies
echo "2. Checking attached policies..."
POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query 'AttachedPolicies[].PolicyName' --output text)
echo "   📋 Attached policies: $POLICIES"

# Test 3: Validate ARN format
echo "3. Validating ARN format..."
if [[ $ROLE_ARN =~ ^arn:aws:iam::[0-9]{12}:role/.+ ]]; then
    echo "   ✅ ARN format is valid"
else
    echo "   ❌ Invalid ARN format"
    exit 1
fi

# Test 4: Check trust policy
echo "4. Checking trust policy..."
TRUST_POLICY=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.AssumeRolePolicyDocument' --output text)
if echo "$TRUST_POLICY" | grep -q "lambda.amazonaws.com"; then
    echo "   ✅ Trust policy allows Lambda service"
else
    echo "   ❌ Trust policy doesn't allow Lambda service"
fi

echo ""
echo "🎉 Role validation complete!"
echo "You can use this ARN in the PrivacyComply Agent setup wizard."