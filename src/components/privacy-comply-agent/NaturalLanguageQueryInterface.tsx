import React, { useState, useEffect, useRef } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { 
  MessageSquare, 
  Send, 
  Lightbulb,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  User,
  Bot,
  Sparkles
} from 'lucide-react';

interface QueryMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  confidence?: number;
  sources?: string[];
  suggestedActions?: string[];
  relatedFindings?: any[];
}

interface QuerySuggestion {
  text: string;
  category: string;
  description: string;
}

export const NaturalLanguageQueryInterface: React.FC = () => {
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSuggestions();
    initializeConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = () => {
    const newConversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setConversationId(newConversationId);
    
    // Add welcome message
    const welcomeMessage: QueryMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `Hello! I'm your Privacy Compliance AI Assistant. I can help you understand your compliance status, explain findings, generate reports, and provide guidance on privacy regulations like GDPR, PDPL, and CCPA.

What would you like to know about your privacy compliance?`,
      timestamp: new Date().toISOString(),
      confidence: 1.0
    };
    
    setMessages([welcomeMessage]);
  };

  const loadSuggestions = async () => {
    try {
      // In a real implementation, this would call the query API
      const mockSuggestions: QuerySuggestion[] = [
        {
          text: "What are my current critical compliance issues?",
          category: "Status",
          description: "Get an overview of critical compliance findings"
        },
        {
          text: "Show me all GDPR violations in the last 30 days",
          category: "Compliance",
          description: "Filter findings by regulation and time period"
        },
        {
          text: "What S3 buckets have encryption issues?",
          category: "Security",
          description: "Find specific resource types with security problems"
        },
        {
          text: "Generate a DPIA report for our data processing activities",
          category: "Reporting",
          description: "Create compliance reports for regulatory requirements"
        },
        {
          text: "How can I fix the IAM overprivileged access issues?",
          category: "Remediation",
          description: "Get guidance on resolving specific compliance issues"
        },
        {
          text: "What is our overall compliance score?",
          category: "Metrics",
          description: "Get high-level compliance health metrics"
        }
      ];
      
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSendQuery = async () => {
    if (!currentQuery.trim()) return;

    const userMessage: QueryMessage = {
      id: `msg-${Date.now()}-user`,
      type: 'user',
      content: currentQuery,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuery('');
    setLoading(true);

    try {
      // In a real implementation, this would call the query API
      // For now, we'll simulate the response
      await new Promise(resolve => setTimeout(resolve, 2000));

      const assistantMessage: QueryMessage = {
        id: `msg-${Date.now()}-assistant`,
        type: 'assistant',
        content: generateMockResponse(currentQuery),
        timestamp: new Date().toISOString(),
        confidence: 0.92,
        sources: [
          'AWS Security Hub findings',
          'GDPR Article 32 - Security of processing',
          'Current compliance scan results'
        ],
        suggestedActions: [
          'Enable S3 bucket encryption',
          'Review IAM policies',
          'Schedule compliance audit'
        ],
        relatedFindings: [
          { id: 'finding-001', severity: 'CRITICAL' },
          { id: 'finding-002', severity: 'HIGH' }
        ]
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: QueryMessage = {
        id: `msg-${Date.now()}-error`,
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your query. Please try again or rephrase your question.',
        timestamp: new Date().toISOString(),
        confidence: 0
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const generateMockResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('critical') || lowerQuery.includes('issues')) {
      return `Based on your current compliance scan, you have **3 critical issues** that require immediate attention:

1. **S3 Bucket Encryption** - 2 buckets are not encrypted at rest, violating GDPR Article 32 requirements for appropriate technical measures.

2. **Public PII Exposure** - 1 S3 bucket containing personal data is publicly accessible, creating a high risk of data breach.

3. **IAM Overprivileged Access** - 1 IAM role has excessive permissions that could lead to unauthorized data access.

**Recommended Actions:**
- Enable encryption on unencrypted S3 buckets
- Restrict public access to buckets containing PII
- Review and reduce IAM role permissions

Would you like me to help you start automated remediation for these issues?`;
    }
    
    if (lowerQuery.includes('gdpr')) {
      return `I found **8 GDPR-related findings** in the last 30 days:

**Article 32 (Security of Processing):** 5 findings
- Unencrypted data storage
- Insufficient access controls
- Missing audit logging

**Article 30 (Records of Processing):** 2 findings
- Incomplete processing records
- Missing legal basis documentation

**Article 25 (Data Protection by Design):** 1 finding
- Default settings allow public access

**Compliance Score:** 78% (needs improvement)

The most critical issue is the publicly accessible S3 bucket containing personal data, which could result in significant GDPR penalties. I recommend immediate remediation.`;
    }
    
    if (lowerQuery.includes('s3') && lowerQuery.includes('encryption')) {
      return `I found **3 S3 buckets** with encryption issues:

1. **my-customer-data-bucket** (us-east-1)
   - Status: No encryption
   - Risk: HIGH - Contains PII data
   - Recommendation: Enable AES-256 encryption

2. **backup-storage-bucket** (us-west-2)
   - Status: Default encryption only
   - Risk: MEDIUM - Should use customer-managed keys
   - Recommendation: Upgrade to KMS customer-managed keys

3. **logs-archive-bucket** (eu-west-1)
   - Status: No encryption
   - Risk: LOW - Contains system logs only
   - Recommendation: Enable default encryption

**Auto-remediation available** for all three buckets. Would you like me to start the remediation process?`;
    }
    
    if (lowerQuery.includes('score') || lowerQuery.includes('compliance')) {
      return `Your **overall compliance score is 87%** - Good, but with room for improvement.

**Category Breakdown:**
- 🔒 **Encryption:** 92% (Excellent)
- 👤 **Access Control:** 78% (Needs attention)
- 🔍 **PII Protection:** 85% (Good)
- 📝 **Logging:** 94% (Excellent)

**Trend Analysis:**
- 30-day trend: +5% improvement
- 90-day trend: +12% improvement
- Critical issues: 3 (down from 7 last month)

**Key Improvements Needed:**
1. Reduce overprivileged IAM roles
2. Implement data classification policies
3. Enhance monitoring for sensitive data access

Your compliance posture is strong overall, with consistent improvement over the past quarter.`;
    }
    
    return `I understand you're asking about "${query}". Based on your current compliance status, I can provide insights about:

- **Current findings and their severity levels**
- **Compliance scores and trends**
- **Specific regulatory requirements (GDPR, PDPL, CCPA)**
- **Remediation recommendations and automation**
- **Report generation and documentation**

Could you please be more specific about what aspect of privacy compliance you'd like to explore? I'm here to help you understand and improve your compliance posture.`;
  };

  const handleSuggestionClick = (suggestion: QuerySuggestion) => {
    setCurrentQuery(suggestion.text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Status': 'bg-blue-100 text-blue-800',
      'Compliance': 'bg-green-100 text-green-800',
      'Security': 'bg-red-100 text-red-800',
      'Reporting': 'bg-purple-100 text-purple-800',
      'Remediation': 'bg-orange-100 text-orange-800',
      'Metrics': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI Compliance Assistant</h2>
          <p className="text-gray-600">Ask questions about your privacy compliance in natural language</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Suggestions Panel */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                <h3 className="font-medium text-gray-900">Suggested Questions</h3>
              </div>
              
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={getCategoryColor(suggestion.category)}>
                        {suggestion.category}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {suggestion.text}
                    </div>
                    <div className="text-xs text-gray-600">
                      {suggestion.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                      </div>

                      {/* Message Metadata */}
                      <div className={`flex items-center space-x-2 mt-1 text-xs text-gray-500 ${
                        message.type === 'user' ? 'justify-end' : 'justify-start'
                      }`}>
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.confidence && (
                          <span>• Confidence: {Math.round(message.confidence * 100)}%</span>
                        )}
                      </div>

                      {/* Assistant Message Actions */}
                      {message.type === 'assistant' && message.id !== 'welcome' && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(message.content)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button size="sm" variant="outline">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Sources and Actions */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-1">Sources:</div>
                          <div className="text-xs text-gray-600">
                            {message.sources.join(' • ')}
                          </div>
                        </div>
                      )}

                      {message.suggestedActions && message.suggestedActions.length > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                          <div className="text-xs font-medium text-blue-700 mb-1">Suggested Actions:</div>
                          <div className="space-y-1">
                            {message.suggestedActions.map((action, index) => (
                              <div key={index} className="text-xs text-blue-600">
                                • {action}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex space-x-3 max-w-3xl">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block p-3 rounded-lg bg-gray-100">
                        <div className="flex items-center space-x-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={currentQuery}
                    onChange={(e) => setCurrentQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about your privacy compliance..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    disabled={loading}
                  />
                </div>
                <Button
                  onClick={handleSendQuery}
                  disabled={!currentQuery.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};