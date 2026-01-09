'use client';

/**
 * AI Chat Interface (TaxGPT-Style)
 * 
 * Intelligent conversational interface for tax, audit, and accounting queries.
 * Routes to specialized AI agents based on intent.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    agent?: string;
    confidence?: number;
    sources?: Source[];
    actions?: Action[];
    thinking?: boolean;
}

interface Source {
    title: string;
    type: 'regulation' | 'guidance' | 'document' | 'calculation';
    reference: string;
    url?: string;
}

interface Action {
    id: string;
    label: string;
    type: 'navigate' | 'execute' | 'confirm';
    payload: unknown;
}

interface SuggestedPrompt {
    icon: string;
    label: string;
    prompt: string;
}

interface AIChatInterfaceProps {
    engagementId?: string;
    initialContext?: Record<string, unknown>;
    onAction?: (action: Action) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
    { icon: '🗺️', label: 'Check Nexus Status', prompt: 'What is our current nexus exposure across all states?' },
    { icon: '📅', label: 'Upcoming Deadlines', prompt: 'What tax filings are due in the next 30 days?' },
    { icon: '🔍', label: 'Audit Alerts', prompt: 'Show me any critical audit findings that need attention' },
    { icon: '📊', label: 'Risk Assessment', prompt: 'What is our overall audit risk score and key factors?' },
    { icon: '💰', label: 'Tax Calculation', prompt: 'Calculate sales tax liability for California Q1 2026' },
    { icon: '📋', label: 'ISA Requirements', prompt: 'What are the ISA 315 requirements for risk assessment?' },
];

const AGENT_ICONS: Record<string, string> = {
    'tax': '💰',
    'audit': '🔍',
    'accounting': '📊',
    'compliance': '📋',
    'general': '🤖',
};

// ============================================================================
// COMPONENTS
// ============================================================================

function MessageBubble({ message, onAction }: { message: Message; onAction?: (action: Action) => void }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
                {/* Agent indicator */}
                {!isUser && message.agent && (
                    <div className="flex items-center gap-1 mb-1 text-sm text-gray-500">
                        <span>{AGENT_ICONS[message.agent] || '🤖'}</span>
                        <span>{message.agent.charAt(0).toUpperCase() + message.agent.slice(1)} Agent</span>
                        {message.confidence && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {Math.round(message.confidence * 100)}% confidence
                            </span>
                        )}
                    </div>
                )}

                {/* Message content */}
                <div className={`p-4 rounded-lg ${isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border shadow-sm'
                    }`}>
                    {message.thinking ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span>Thinking...</span>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {message.sources.map((source, i) => (
                            <a
                                key={i}
                                href={source.url}
                                className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <span>📎</span>
                                <span>{source.title}</span>
                            </a>
                        ))}
                    </div>
                )}

                {/* Actions */}
                {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {message.actions.map((action) => (
                            <button
                                key={action.id}
                                onClick={() => onAction?.(action)}
                                className="inline-flex items-center gap-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded transition"
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Timestamp */}
                <div className={`text-xs mt-1 ${isUser ? 'text-right text-blue-200' : 'text-gray-400'}`}>
                    {message.timestamp.toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}

function SuggestedPrompts({ prompts, onSelect }: { prompts: SuggestedPrompt[]; onSelect: (prompt: string) => void }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
            {prompts.map((item, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(item.prompt)}
                    className="flex items-center gap-2 p-3 bg-white border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition text-left"
                >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIChatInterface({ engagementId, initialContext, onAction }: AIChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Detect agent type from message
    const detectAgentType = useCallback((text: string): string => {
        const lower = text.toLowerCase();
        if (lower.includes('tax') || lower.includes('nexus') || lower.includes('filing') || lower.includes('vat')) {
            return 'tax';
        }
        if (lower.includes('audit') || lower.includes('isa') || lower.includes('risk') || lower.includes('control')) {
            return 'audit';
        }
        if (lower.includes('journal') || lower.includes('ledger') || lower.includes('reconcil')) {
            return 'accounting';
        }
        if (lower.includes('compliance') || lower.includes('regulation') || lower.includes('deadline')) {
            return 'compliance';
        }
        return 'general';
    }, []);

    // Simulate API response (would be real API in production)
    const simulateResponse = useCallback(async (userMessage: string): Promise<Message> => {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const agentType = detectAgentType(userMessage);
        const lower = userMessage.toLowerCase();

        // Generate contextual response
        let content = '';
        let sources: Source[] = [];
        let actions: Action[] = [];

        if (lower.includes('nexus')) {
            content = `Based on current monitoring data, here's your nexus exposure summary:\n\n` +
                `🔴 **Exceeded Threshold (1):**\n` +
                `• Texas: $520,000 (104% of $500,000 threshold)\n\n` +
                `🟡 **Approaching Threshold (2):**\n` +
                `• California: $485,000 (97%) - ~12 days to threshold\n` +
                `• New York: $380,000 (76%)\n\n` +
                `🟢 **Registered (1):** Florida\n` +
                `🟢 **Safe (1):** Washington\n\n` +
                `**Recommended Actions:**\n` +
                `1. Prepare TX sales tax registration immediately\n` +
                `2. Monitor CA closely - consider proactive registration`;

            sources = [
                { title: 'TX Nexus Rules', type: 'regulation', reference: 'TX Tax Code §151.107' },
                { title: 'CA Economic Nexus', type: 'guidance', reference: 'CA R&TC 6203' },
            ];

            actions = [
                { id: '1', label: 'View Nexus Dashboard', type: 'navigate', payload: '/dashboard/nexus' },
                { id: '2', label: 'Start TX Registration', type: 'execute', payload: { action: 'register', jurisdiction: 'US-TX' } },
            ];
        } else if (lower.includes('deadline') || lower.includes('filing')) {
            content = `Here are upcoming tax filing deadlines:\n\n` +
                `📅 **Next 30 Days:**\n\n` +
                `1. **California Sales Tax Q1 2026**\n` +
                `   Due: January 31, 2026 (5 days)\n` +
                `   Estimated: $34,200\n\n` +
                `2. **Texas Sales Tax Q1 2026**\n` +
                `   Due: January 20, 2026 (Registration needed first)\n\n` +
                `3. **Federal Form 1120 Extension**\n` +
                `   Due: February 15, 2026`;

            actions = [
                { id: '1', label: 'View Filing Calendar', type: 'navigate', payload: '/filings' },
                { id: '2', label: 'Prepare CA Filing', type: 'execute', payload: { action: 'prepare_filing', jurisdiction: 'US-CA' } },
            ];
        } else if (lower.includes('audit') || lower.includes('alert') || lower.includes('finding')) {
            content = `Here's a summary of current audit findings:\n\n` +
                `🚨 **Critical (1):**\n` +
                `• Filing Deadline: CA Sales Tax Q1 due in 5 days\n\n` +
                `⚠️ **High (1):**\n` +
                `• Unusual Journal Entry: Manual entry to revenue account exceeding $50,000\n\n` +
                `📢 **Medium (1):**\n` +
                `• Missing Approval: 3 transactions above threshold without 2nd approval\n\n` +
                `**Continuous Monitoring Stats:**\n` +
                `• Transactions processed: 1,247\n` +
                `• Anomalies detected: 23 (1.8%)\n` +
                `• Overall risk score: 42/100 (Medium)`;

            sources = [
                { title: 'ISA 315 Risk Assessment', type: 'guidance', reference: 'ISA 315.25-32' },
            ];

            actions = [
                { id: '1', label: 'Review Alerts', type: 'navigate', payload: '/audit/alerts' },
                { id: '2', label: 'View Risk Assessment', type: 'navigate', payload: '/audit/risk' },
            ];
        } else if (lower.includes('isa')) {
            content = `**ISA 315 - Identifying and Assessing Risks of Material Misstatement**\n\n` +
                `Key requirements:\n\n` +
                `1. **Understanding the Entity (ISA 315.11)**\n` +
                `   - Industry, regulatory, and external factors\n` +
                `   - Nature of the entity\n` +
                `   - Accounting policies\n\n` +
                `2. **Internal Controls (ISA 315.12-20)**\n` +
                `   - Control environment evaluation\n` +
                `   - Risk assessment process\n` +
                `   - Information system understanding\n\n` +
                `3. **Risk Identification (ISA 315.25-27)**\n` +
                `   - Identify risks at financial statement and assertion levels\n` +
                `   - Determine significant risks\n\n` +
                `Would you like me to generate an ISA 315 compliant risk assessment template?`;

            sources = [
                { title: 'ISA 315 (Revised 2019)', type: 'regulation', reference: 'IAASB Handbook' },
            ];

            actions = [
                { id: '1', label: 'Generate Template', type: 'execute', payload: { action: 'generate_template', standard: 'ISA315' } },
            ];
        } else {
            content = `I can help you with tax, audit, and accounting questions. Here are some things I can do:\n\n` +
                `💰 **Tax:**\n• Nexus monitoring and alerts\n• Filing preparation and deadlines\n• Jurisdiction research\n\n` +
                `🔍 **Audit:**\n• Risk assessment\n• Continuous monitoring alerts\n• ISA compliance guidance\n\n` +
                `📊 **Accounting:**\n• Journal entry review\n• Reconciliation support\n• Financial analysis\n\n` +
                `What would you like to know?`;
        }

        return {
            id: crypto.randomUUID(),
            role: 'assistant',
            content,
            timestamp: new Date(),
            agent: agentType,
            confidence: 0.92,
            sources,
            actions,
        };
    }, [detectAgentType]);

    // Handle send message
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Show thinking indicator
        const thinkingMessage: Message = {
            id: 'thinking',
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            thinking: true,
        };
        setMessages(prev => [...prev, thinkingMessage]);

        try {
            const response = await simulateResponse(userMessage.content);
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), response]);
        } catch (error) {
            setMessages(prev => [...prev.filter(m => m.id !== 'thinking'), {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] bg-gray-50 rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <span>🤖</span>
                    PrismaGPT
                </h2>
                <p className="text-sm text-blue-100">Your AI assistant for tax, audit & accounting</p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.length === 0 ? (
                    <div>
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">👋</div>
                            <h3 className="text-xl font-semibold text-gray-700">Welcome to PrismaGPT</h3>
                            <p className="text-gray-500 mt-2">Ask me anything about tax, audit, or accounting</p>
                        </div>
                        <SuggestedPrompts
                            prompts={SUGGESTED_PROMPTS}
                            onSelect={(prompt) => {
                                setInput(prompt);
                                inputRef.current?.focus();
                            }}
                        />
                    </div>
                ) : (
                    messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            onAction={onAction}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-white p-4">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about tax nexus, audit procedures, filing deadlines..."
                        className="flex-1 resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {isLoading ? '...' : 'Send'}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}

export default AIChatInterface;
