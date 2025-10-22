import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testReportGeneration() {
    const bedrockService = new BedrockService();
    
    const mockData = {
        organization: 'Test Company',
        dataProcessingActivities: [
            {
                name: 'Customer Data Processing',
                purpose: 'Service delivery',
                dataTypes: ['email', 'name', 'phone'],
                legalBasis: 'Contract'
            }
        ],
        timeframe: '2024-Q1'
    };
    
    try {
        console.log('📄 Testing DPIA report generation...');
        
        const report = await bedrockService.generateComplianceReport('DPIA', mockData);
        
        console.log('✅ DPIA report generated');
        console.log('Report length:', report.report.length);
        console.log('Has executive summary:', !!report.executiveSummary);
        console.log('Recommendations count:', report.recommendations.length);
        
        return report;
    } catch (error) {
        console.error('❌ Report generation failed:', error.message);
        throw error;
    }
}

testReportGeneration();