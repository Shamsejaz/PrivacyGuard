import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testNaturalLanguageQueries() {
    const bedrockService = new BedrockService();
    
    const testQueries = [
        'What are my GDPR compliance obligations for customer data?',
        'How should I handle a data breach notification?',
        'What encryption standards are required for HIPAA compliance?',
        'Explain the difference between GDPR and CCPA data subject rights'
    ];
    
    const context = {
        organization: 'Healthcare Provider',
        dataTypes: ['patient records', 'billing information'],
        regions: ['EU', 'California']
    };
    
    try {
        console.log('💬 Testing natural language queries...');
        
        for (const query of testQueries) {
            console.log(`\n🤔 Query: "${query}"`);
            
            const response = await bedrockService.processComplianceQuery(query, context);
            
            console.log('✅ Response received');
            console.log('Confidence:', response.confidence);
            console.log('Sources:', response.sources.length);
            console.log('Follow-up questions:', response.followUpQuestions.length);
        }
        
        console.log('\n🎉 All queries processed successfully!');
        
    } catch (error) {
        console.error('❌ Query processing failed:', error.message);
        throw error;
    }
}

testNaturalLanguageQueries();