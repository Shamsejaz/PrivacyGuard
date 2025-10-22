#!/usr/bin/env node

/**
 * AWS Agent Test Runner
 * Comprehensive testing suite for PrivacyGuard AWS integration
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';
import { AWSConfigManager } from './src/services/privacy-comply-agent/config/aws-config.js';

class AWSTestRunner {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runTest(testName, testFunction) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧪 Running Test: ${testName}`);
        console.log(`${'='.repeat(60)}`);
        
        const startTime = Date.now();
        
        try {
            await testFunction();
            const duration = Date.now() - startTime;
            
            console.log(`✅ ${testName} PASSED (${duration}ms)`);
            this.results.passed++;
            this.results.tests.push({
                name: testName,
                status: 'PASSED',
                duration,
                error: null
            });
        } catch (error) {
            const duration = Date.now() - startTime;
            
            console.error(`❌ ${testName} FAILED (${duration}ms)`);
            console.error(`Error: ${error.message}`);
            
            this.results.failed++;
            this.results.tests.push({
                name: testName,
                status: 'FAILED',
                duration,
                error: error.message
            });
        }
    }

    async testPrerequisites() {
        console.log('🔍 Checking prerequisites...');
        
        // Check environment variables
        const requiredEnvVars = [
            'AWS_REGION',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'BEDROCK_MODEL_ID'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
        }
        
        // Check AWS CLI
        try {
            execSync('aws --version', { stdio: 'pipe' });
            console.log('✅ AWS CLI installed');
        } catch (error) {
            console.warn('⚠️  AWS CLI not found (optional for testing)');
        }
        
        // Test AWS credentials
        const configManager = AWSConfigManager.getInstance();
        const validation = await configManager.validateCredentials();
        
        if (!validation.valid) {
            throw new Error(`AWS credentials validation failed: ${validation.missingPermissions?.join(', ')}`);
        }
        
        console.log('✅ AWS credentials valid');
        console.log(`✅ Account ID: ${validation.accountId}`);
        console.log(`✅ Region: ${validation.region}`);
    }

    async testBedrockConnectivity() {
        console.log('🤖 Testing Bedrock connectivity...');
        
        const bedrockService = new BedrockService();
        
        // Test model listing
        const models = await bedrockService.listFoundationModels();
        if (models.length === 0) {
            throw new Error('No foundation models available');
        }
        console.log(`✅ Found ${models.length} foundation models`);
        
        // Test model info
        const modelInfo = await bedrockService.getModelInfo();
        if (!modelInfo) {
            throw new Error('Could not retrieve model information');
        }
        console.log(`✅ Model info retrieved: ${modelInfo.modelName || 'Claude 3 Sonnet'}`);
        
        // Test simple invocation
        const response = await bedrockService.invokeClaudeForCompliance(
            'What is GDPR? Provide a brief one-sentence answer.'
        );
        
        if (!response.response || response.response.length < 10) {
            throw new Error('Invalid response from Bedrock');
        }
        
        console.log(`✅ Bedrock invocation successful (${response.response.length} chars)`);
        console.log(`✅ Confidence score: ${response.confidence}`);
    }

    async testComplianceAnalysis() {
        console.log('🔍 Testing compliance analysis...');
        
        const bedrockService = new BedrockService();
        
        const mockFindings = [
            {
                id: 'test-finding-001',
                resourceArn: 'arn:aws:s3:::test-bucket-unencrypted',
                findingType: 'ENCRYPTION',
                severity: 'HIGH',
                description: 'S3 bucket lacks server-side encryption',
                detectedAt: new Date()
            },
            {
                id: 'test-finding-002',
                resourceArn: 'arn:aws:iam::123456789012:role/overprivileged-role',
                findingType: 'ACCESS_CONTROL',
                severity: 'MEDIUM',
                description: 'IAM role has excessive permissions including s3:*',
                detectedAt: new Date()
            }
        ];
        
        const analysis = await bedrockService.analyzeComplianceFindings(mockFindings);
        
        if (!analysis.analysis || analysis.analysis.length < 50) {
            throw new Error('Analysis response too short or empty');
        }
        
        if (typeof analysis.riskScore !== 'number' || analysis.riskScore < 0 || analysis.riskScore > 100) {
            throw new Error('Invalid risk score');
        }
        
        if (!Array.isArray(analysis.recommendations) || analysis.recommendations.length === 0) {
            throw new Error('No recommendations provided');
        }
        
        console.log(`✅ Analysis completed (${analysis.analysis.length} chars)`);
        console.log(`✅ Risk score: ${analysis.riskScore}/100`);
        console.log(`✅ Recommendations: ${analysis.recommendations.length}`);
        console.log(`✅ Priority actions: ${analysis.priorityActions.length}`);
    }

    async testReportGeneration() {
        console.log('📄 Testing report generation...');
        
        const bedrockService = new BedrockService();
        
        const mockData = {
            organization: 'Test Healthcare Provider Inc.',
            dataProcessingActivities: [
                {
                    name: 'Patient Records Management',
                    purpose: 'Healthcare service delivery',
                    dataTypes: ['medical records', 'personal identifiers', 'billing information'],
                    legalBasis: 'Vital interests and legal obligation'
                },
                {
                    name: 'Marketing Communications',
                    purpose: 'Patient engagement and health education',
                    dataTypes: ['email addresses', 'communication preferences'],
                    legalBasis: 'Consent'
                }
            ],
            timeframe: '2024-Q1',
            riskFactors: ['Cross-border data transfers', 'Third-party processors']
        };
        
        // Test DPIA report
        const dpiaReport = await bedrockService.generateComplianceReport('DPIA', mockData);
        
        if (!dpiaReport.report || dpiaReport.report.length < 200) {
            throw new Error('DPIA report too short or empty');
        }
        
        if (!dpiaReport.executiveSummary || dpiaReport.executiveSummary.length < 50) {
            throw new Error('Executive summary missing or too short');
        }
        
        console.log(`✅ DPIA report generated (${dpiaReport.report.length} chars)`);
        console.log(`✅ Executive summary included (${dpiaReport.executiveSummary.length} chars)`);
        console.log(`✅ Recommendations: ${dpiaReport.recommendations.length}`);
        
        // Test ROPA report
        const ropaReport = await bedrockService.generateComplianceReport('ROPA', mockData);
        
        if (!ropaReport.report || ropaReport.report.length < 200) {
            throw new Error('ROPA report too short or empty');
        }
        
        console.log(`✅ ROPA report generated (${ropaReport.report.length} chars)`);
    }

    async testNaturalLanguageQueries() {
        console.log('💬 Testing natural language queries...');
        
        const bedrockService = new BedrockService();
        
        const testQueries = [
            {
                query: 'What are the key GDPR requirements for healthcare data?',
                expectedKeywords: ['gdpr', 'healthcare', 'consent', 'lawful basis']
            },
            {
                query: 'How do I handle a data breach under CCPA?',
                expectedKeywords: ['ccpa', 'breach', 'notification', 'consumer']
            },
            {
                query: 'What encryption is required for HIPAA compliance?',
                expectedKeywords: ['hipaa', 'encryption', 'phi', 'safeguards']
            }
        ];
        
        const context = {
            organization: 'Healthcare Provider',
            dataTypes: ['patient records', 'billing information', 'insurance data'],
            regions: ['United States', 'European Union'],
            regulations: ['GDPR', 'HIPAA', 'CCPA']
        };
        
        for (const testCase of testQueries) {
            console.log(`\n🤔 Testing query: "${testCase.query}"`);
            
            const response = await bedrockService.processComplianceQuery(testCase.query, context);
            
            if (!response.answer || response.answer.length < 50) {
                throw new Error(`Query response too short: "${testCase.query}"`);
            }
            
            if (response.confidence < 0.5) {
                throw new Error(`Low confidence score (${response.confidence}) for: "${testCase.query}"`);
            }
            
            // Check for expected keywords
            const answerLower = response.answer.toLowerCase();
            const foundKeywords = testCase.expectedKeywords.filter(keyword => 
                answerLower.includes(keyword.toLowerCase())
            );
            
            if (foundKeywords.length < testCase.expectedKeywords.length / 2) {
                console.warn(`⚠️  Few expected keywords found in response for: "${testCase.query}"`);
            }
            
            console.log(`✅ Response received (${response.answer.length} chars, confidence: ${response.confidence})`);
            console.log(`✅ Sources: ${response.sources.length}, Follow-ups: ${response.followUpQuestions.length}`);
        }
    }

    async testStreamingResponse() {
        console.log('🌊 Testing streaming responses...');
        
        const bedrockService = new BedrockService();
        
        const query = 'Explain the GDPR data subject rights and provide examples of how to implement each right in a healthcare setting.';
        
        const stream = await bedrockService.streamComplianceAnalysis(query);
        
        let streamedContent = '';
        let chunkCount = 0;
        
        for await (const chunk of stream) {
            streamedContent += chunk;
            chunkCount++;
            
            // Show progress
            if (chunkCount % 10 === 0) {
                process.stdout.write('.');
            }
        }
        
        console.log(''); // New line after progress dots
        
        if (streamedContent.length < 100) {
            throw new Error('Streamed content too short');
        }
        
        if (chunkCount < 5) {
            throw new Error('Too few chunks received');
        }
        
        console.log(`✅ Streaming completed (${streamedContent.length} chars in ${chunkCount} chunks)`);
    }

    async testErrorHandling() {
        console.log('🚨 Testing error handling...');
        
        const bedrockService = new BedrockService();
        
        // Test with invalid/empty query
        try {
            await bedrockService.invokeClaudeForCompliance('');
            throw new Error('Should have failed with empty query');
        } catch (error) {
            if (error.message.includes('Should have failed')) {
                throw error;
            }
            console.log('✅ Empty query properly rejected');
        }
        
        // Test with extremely long query (should handle gracefully)
        const longQuery = 'What is GDPR? '.repeat(1000);
        try {
            const response = await bedrockService.invokeClaudeForCompliance(longQuery);
            console.log('✅ Long query handled gracefully');
        } catch (error) {
            console.log('✅ Long query properly rejected with error handling');
        }
    }

    printSummary() {
        console.log(`\n${'='.repeat(80)}`);
        console.log('📊 TEST SUMMARY');
        console.log(`${'='.repeat(80)}`);
        
        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
        
        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`  • ${test.name}: ${test.error}`);
                });
        }
        
        console.log('\n📋 DETAILED RESULTS:');
        this.results.tests.forEach(test => {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            console.log(`  ${status} ${test.name} (${test.duration}ms)`);
        });
        
        if (this.results.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! AWS integration is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the errors above and verify your AWS configuration.');
        }
    }

    async run() {
        console.log('🚀 Starting AWS Agent Test Suite');
        console.log('=====================================');
        
        await this.runTest('Prerequisites Check', () => this.testPrerequisites());
        await this.runTest('Bedrock Connectivity', () => this.testBedrockConnectivity());
        await this.runTest('Compliance Analysis', () => this.testComplianceAnalysis());
        await this.runTest('Report Generation', () => this.testReportGeneration());
        await this.runTest('Natural Language Queries', () => this.testNaturalLanguageQueries());
        await this.runTest('Streaming Response', () => this.testStreamingResponse());
        await this.runTest('Error Handling', () => this.testErrorHandling());
        
        this.printSummary();
        
        // Exit with appropriate code
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const testRunner = new AWSTestRunner();
    testRunner.run().catch(error => {
        console.error('💥 Test runner crashed:', error);
        process.exit(1);
    });
}

export default AWSTestRunner;