"use strict";
/**
 * IAM Policy Adjustment Lambda Function
 * Automatically adjusts IAM policies to follow principle of least privilege
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackHandler = exports.handler = void 0;
const client_iam_1 = require("@aws-sdk/client-iam");
/**
 * Lambda handler for IAM policy adjustments
 */
const handler = async (event) => {
    const iamClient = new client_iam_1.IAMClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const { principalType, principalName, adjustmentType, targetActions = [], targetResources = [], allowedActions = [], allowedResources = [], policyName = 'PrivacyComplianceAdjustment' } = event.parameters;
    const actionsPerformed = [];
    const rollbackData = { originalPolicies: [], attachedPolicies: [] };
    try {
        // Get current policies for rollback
        await captureCurrentPolicies(iamClient, principalType, principalName, rollbackData);
        switch (adjustmentType) {
            case 'REMOVE_OVERPRIVILEGED':
                await removeOverprivilegedAccess(iamClient, principalType, principalName, targetActions, targetResources, actionsPerformed);
                break;
            case 'ADD_RESTRICTIONS':
                await addRestrictions(iamClient, principalType, principalName, targetActions, targetResources, policyName, actionsPerformed);
                break;
            case 'APPLY_LEAST_PRIVILEGE':
                await applyLeastPrivilege(iamClient, principalType, principalName, allowedActions, allowedResources, policyName, actionsPerformed);
                break;
            default:
                throw new Error(`Unsupported adjustment type: ${adjustmentType}`);
        }
        return {
            success: true,
            message: `Successfully adjusted IAM policies for ${principalType} ${principalName}`,
            principalType,
            principalName,
            adjustmentType,
            actionsPerformed,
            rollbackData
        };
    }
    catch (error) {
        console.error('Error adjusting IAM policies:', error);
        return {
            success: false,
            message: `Failed to adjust IAM policies for ${principalType} ${principalName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            principalType,
            principalName,
            adjustmentType,
            actionsPerformed,
            rollbackData
        };
    }
};
exports.handler = handler;
/**
 * Capture current policies for rollback purposes
 */
async function captureCurrentPolicies(iamClient, principalType, principalName, rollbackData) {
    try {
        if (principalType === 'role') {
            // Get attached managed policies
            const attachedPolicies = await iamClient.send(new client_iam_1.ListAttachedRolePoliciesCommand({ RoleName: principalName }));
            rollbackData.attachedPolicies = attachedPolicies.AttachedPolicies || [];
            // Get inline policies (this would require listing them first, simplified for this example)
            // In a real implementation, you'd list all inline policies and capture each one
        }
        else if (principalType === 'user') {
            // Get attached managed policies
            const attachedPolicies = await iamClient.send(new client_iam_1.ListAttachedUserPoliciesCommand({ UserName: principalName }));
            rollbackData.attachedPolicies = attachedPolicies.AttachedPolicies || [];
        }
    }
    catch (error) {
        console.warn('Could not capture all current policies for rollback:', error);
    }
}
/**
 * Remove overprivileged access by detaching or modifying policies
 */
async function removeOverprivilegedAccess(iamClient, principalType, principalName, targetActions, targetResources, actionsPerformed) {
    // This is a simplified implementation
    // In practice, you'd need to analyze each policy and remove specific permissions
    const restrictivePolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Deny',
                Action: targetActions.length > 0 ? targetActions : ['*'],
                Resource: targetResources.length > 0 ? targetResources : ['*'],
                Condition: {
                    StringEquals: {
                        'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
                    }
                }
            }
        ]
    };
    const policyDocument = JSON.stringify(restrictivePolicy);
    if (principalType === 'role') {
        await iamClient.send(new client_iam_1.PutRolePolicyCommand({
            RoleName: principalName,
            PolicyName: 'PrivacyComplianceRestriction',
            PolicyDocument: policyDocument
        }));
    }
    else if (principalType === 'user') {
        await iamClient.send(new client_iam_1.PutUserPolicyCommand({
            UserName: principalName,
            PolicyName: 'PrivacyComplianceRestriction',
            PolicyDocument: policyDocument
        }));
    }
    actionsPerformed.push(`Added restrictive policy to deny overprivileged actions`);
}
/**
 * Add specific restrictions to limit access
 */
async function addRestrictions(iamClient, principalType, principalName, targetActions, targetResources, policyName, actionsPerformed) {
    const restrictionPolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Deny',
                Action: targetActions,
                Resource: targetResources,
                Condition: {
                    Bool: {
                        'aws:SecureTransport': 'false'
                    }
                }
            }
        ]
    };
    const policyDocument = JSON.stringify(restrictionPolicy);
    if (principalType === 'role') {
        await iamClient.send(new client_iam_1.PutRolePolicyCommand({
            RoleName: principalName,
            PolicyName: policyName,
            PolicyDocument: policyDocument
        }));
    }
    else if (principalType === 'user') {
        await iamClient.send(new client_iam_1.PutUserPolicyCommand({
            UserName: principalName,
            PolicyName: policyName,
            PolicyDocument: policyDocument
        }));
    }
    actionsPerformed.push(`Added restriction policy ${policyName}`);
}
/**
 * Apply least privilege principle by replacing with minimal permissions
 */
async function applyLeastPrivilege(iamClient, principalType, principalName, allowedActions, allowedResources, policyName, actionsPerformed) {
    const leastPrivilegePolicy = {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Action: allowedActions,
                Resource: allowedResources,
                Condition: {
                    Bool: {
                        'aws:SecureTransport': 'true'
                    },
                    StringEquals: {
                        'aws:RequestedRegion': process.env.AWS_REGION || 'us-east-1'
                    }
                }
            }
        ]
    };
    const policyDocument = JSON.stringify(leastPrivilegePolicy);
    if (principalType === 'role') {
        await iamClient.send(new client_iam_1.PutRolePolicyCommand({
            RoleName: principalName,
            PolicyName: policyName,
            PolicyDocument: policyDocument
        }));
    }
    else if (principalType === 'user') {
        await iamClient.send(new client_iam_1.PutUserPolicyCommand({
            UserName: principalName,
            PolicyName: policyName,
            PolicyDocument: policyDocument
        }));
    }
    actionsPerformed.push(`Applied least privilege policy ${policyName}`);
}
/**
 * Rollback function to restore previous IAM configuration
 */
const rollbackHandler = async (event) => {
    const iamClient = new client_iam_1.IAMClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const { principalType, principalName, rollbackData } = event.parameters;
    const actionsPerformed = [];
    try {
        // Remove policies that were added during adjustment
        const policiesToRemove = ['PrivacyComplianceRestriction', 'PrivacyComplianceAdjustment'];
        for (const policyName of policiesToRemove) {
            try {
                if (principalType === 'role') {
                    await iamClient.send(new client_iam_1.DeleteRolePolicyCommand({
                        RoleName: principalName,
                        PolicyName: policyName
                    }));
                }
                else if (principalType === 'user') {
                    await iamClient.send(new client_iam_1.DeleteUserPolicyCommand({
                        UserName: principalName,
                        PolicyName: policyName
                    }));
                }
                actionsPerformed.push(`Removed policy ${policyName}`);
            }
            catch (error) {
                // Policy might not exist, continue
            }
        }
        // Restore attached policies if available
        if (rollbackData.attachedPolicies) {
            for (const policy of rollbackData.attachedPolicies) {
                try {
                    if (principalType === 'role') {
                        await iamClient.send(new client_iam_1.AttachRolePolicyCommand({
                            RoleName: principalName,
                            PolicyArn: policy.PolicyArn
                        }));
                    }
                    else if (principalType === 'user') {
                        await iamClient.send(new client_iam_1.AttachUserPolicyCommand({
                            UserName: principalName,
                            PolicyArn: policy.PolicyArn
                        }));
                    }
                    actionsPerformed.push(`Restored attached policy ${policy.PolicyName}`);
                }
                catch (error) {
                    console.warn(`Could not restore policy ${policy.PolicyName}:`, error);
                }
            }
        }
        return {
            success: true,
            message: `Successfully rolled back IAM policy adjustments for ${principalType} ${principalName}`,
            principalType,
            principalName,
            adjustmentType: 'ROLLBACK',
            actionsPerformed
        };
    }
    catch (error) {
        console.error('Error rolling back IAM policy adjustments:', error);
        return {
            success: false,
            message: `Failed to rollback IAM policy adjustments for ${principalType} ${principalName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            principalType,
            principalName,
            adjustmentType: 'ROLLBACK',
            actionsPerformed
        };
    }
};
exports.rollbackHandler = rollbackHandler;
