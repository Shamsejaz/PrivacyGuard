import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testComplianceAnalysis() {
    const bedrockService = new BedrockService();
    
    // Mock compliance findings
    const mockFindings = [
        {
            id: 'finding-001',
            resourceArn: 'arn:aws:s3:::test-bucket',
            findingType: 'ENCRYPTION',
            severity: 'HIGH',
            description: 'S3 bucket not encrypted at rest',
            detectedAt: new Date()
        },
        {
            id: 'finding-002',
            resourceArn: 'arn:aws:iam::123456789012:role/test-role',
            findingType: 'ACCESS_CONTROL',
            severity: 'MEDIUM',
            description: 'IAM role has overly broad permissions',
            detectedAt: new Date()
        }
    ];
    
    try {
        console.log('🔍 Testing compliance analysis...');
        
        const analysis = await bedrockService.analyzeComplianceFindings(mockFindings);
        
        console.log('✅ Analysis completed');
        console.log('Risk Score:', analysis.riskScore);
        console.log('Recommendations:', analysis.recommendations.length);
        console.log('Priority Actions:', analysis.priorityActions.length);
        
        return analysis;
    } catch (error) {
        console.error('❌ Compliance analysis failed:', error.message);
        throw error;
    }
}

testComplianceAnalysis();