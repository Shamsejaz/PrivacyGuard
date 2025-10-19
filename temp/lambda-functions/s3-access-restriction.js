"use strict";
/**
 * S3 Bucket Access Restriction Lambda Function
 * Automatically restricts public access to S3 buckets containing PII/PHI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackHandler = exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
/**
 * Lambda handler for S3 bucket access restriction
 */
const handler = async (event) => {
    const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const { bucketName, restrictPublicRead, restrictPublicWrite, blockPublicAcls, ignorePublicAcls, blockPublicPolicy, restrictPublicBuckets } = event.parameters;
    const actionsPerformed = [];
    const rollbackData = {};
    try {
        // Get current public access block configuration for rollback
        try {
            const currentConfig = await s3Client.send(new client_s3_1.GetPublicAccessBlockCommand({ Bucket: bucketName }));
            rollbackData.previousPublicAccessBlock = currentConfig.PublicAccessBlockConfiguration;
        }
        catch (error) {
            // No existing public access block configuration
            rollbackData.previousPublicAccessBlock = null;
        }
        // Get current bucket policy for rollback
        try {
            const currentPolicy = await s3Client.send(new client_s3_1.GetBucketPolicyCommand({ Bucket: bucketName }));
            rollbackData.previousBucketPolicy = currentPolicy.Policy;
        }
        catch (error) {
            // No existing bucket policy
            rollbackData.previousBucketPolicy = null;
        }
        // Apply public access block configuration
        const publicAccessBlockConfig = {
            BlockPublicAcls: blockPublicAcls,
            IgnorePublicAcls: ignorePublicAcls,
            BlockPublicPolicy: blockPublicPolicy,
            RestrictPublicBuckets: restrictPublicBuckets
        };
        await s3Client.send(new client_s3_1.PutPublicAccessBlockCommand({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: publicAccessBlockConfig
        }));
        actionsPerformed.push('Applied public access block configuration');
        // Remove bucket policy if it allows public access and we're restricting it
        if (rollbackData.previousBucketPolicy && (restrictPublicRead || restrictPublicWrite)) {
            try {
                const policy = JSON.parse(rollbackData.previousBucketPolicy);
                let hasPublicStatements = false;
                // Check if policy has public statements
                if (policy.Statement) {
                    hasPublicStatements = policy.Statement.some((statement) => statement.Principal === '*' ||
                        (statement.Principal && statement.Principal.AWS === '*'));
                }
                if (hasPublicStatements) {
                    await s3Client.send(new client_s3_1.DeleteBucketPolicyCommand({ Bucket: bucketName }));
                    actionsPerformed.push('Removed public bucket policy');
                }
            }
            catch (policyError) {
                // If policy parsing fails, still try to delete it if we're restricting access
                await s3Client.send(new client_s3_1.DeleteBucketPolicyCommand({ Bucket: bucketName }));
                actionsPerformed.push('Removed public bucket policy');
            }
        }
        return {
            success: true,
            message: `Successfully restricted access for bucket ${bucketName}`,
            bucketName,
            actionsPerformed,
            rollbackData
        };
    }
    catch (error) {
        console.error('Error restricting S3 bucket access:', error);
        return {
            success: false,
            message: `Failed to restrict access for bucket ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            bucketName,
            actionsPerformed,
            rollbackData
        };
    }
};
exports.handler = handler;
/**
 * Rollback function to restore previous S3 bucket configuration
 */
const rollbackHandler = async (event) => {
    const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const { bucketName, rollbackData } = event.parameters;
    const actionsPerformed = [];
    try {
        // Restore previous public access block configuration
        if (rollbackData.previousPublicAccessBlock) {
            await s3Client.send(new client_s3_1.PutPublicAccessBlockCommand({
                Bucket: bucketName,
                PublicAccessBlockConfiguration: rollbackData.previousPublicAccessBlock
            }));
            actionsPerformed.push('Restored previous public access block configuration');
        }
        // Restore previous bucket policy
        if (rollbackData.previousBucketPolicy) {
            await s3Client.send(new client_s3_1.PutBucketPolicyCommand({
                Bucket: bucketName,
                Policy: rollbackData.previousBucketPolicy
            }));
            actionsPerformed.push('Restored previous bucket policy');
        }
        return {
            success: true,
            message: `Successfully rolled back access restrictions for bucket ${bucketName}`,
            bucketName,
            actionsPerformed
        };
    }
    catch (error) {
        console.error('Error rolling back S3 bucket access restrictions:', error);
        return {
            success: false,
            message: `Failed to rollback access restrictions for bucket ${bucketName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            bucketName,
            actionsPerformed
        };
    }
};
exports.rollbackHandler = rollbackHandler;
