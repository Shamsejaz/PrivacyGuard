import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testBedrock() {
    try {
        console.log('🚀 Testing Bedrock Service...');
        
        const bedrockService = new BedrockService();
        
        // Test 1: List available models
        console.log('📋 Testing model listing...');
        const models = await bedrockService.listFoundationModels();
        console.log(`✅ Found ${models.length} models`);
        
        // Test 2: Get model info
        console.log('📊 Testing model info...');
        const modelInfo = await bedrockService.getModelInfo();
        console.log('✅ Model info retrieved:', modelInfo?.modelName || 'Claude 3 Sonnet');
        
        // Test 3: Simple compliance query
        console.log('🤖 Testing compliance query...');
        const response = await bedrockService.invokeClaudeForCompliance(
            'What are the key GDPR requirements for data encryption?'
        );
        console.log('✅ Compliance query successful');
        console.log('Response length:', response.response.length);
        console.log('Confidence:', response.confidence);
        
        // Test 4: Streaming response
        console.log('🌊 Testing streaming response...');
        const stream = await bedrockService.streamComplianceAnalysis(
            'Explain the CCPA data subject rights in simple terms.'
        );
        
        let streamedContent = '';
        for await (const chunk of stream) {
            streamedContent += chunk;
            process.stdout.write('.');
        }
        console.log('\n✅ Streaming test completed');
        console.log('Streamed content length:', streamedContent.length);
        
        console.log('🎉 All Bedrock tests passed!');
        
    } catch (error) {
        console.error('❌ Bedrock test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testBedrock();