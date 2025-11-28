import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeminiChat } from '../GeminiChat';
import * as geminiHooks from '@/hooks/gemini/useGeminiChat';

vi.mock('@/hooks/gemini/useGeminiChat');

describe('GeminiChat', () => {
  const mockSendMessageStream = vi.fn();
  const mockStopStreaming = vi.fn();
  const mockClearMessages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(geminiHooks.useGeminiChat).mockReturnValue({
      messages: [],
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      sendMessage: vi.fn(),
      sendMessageStream: mockSendMessageStream,
      stopStreaming: mockStopStreaming,
      clearMessages: mockClearMessages,
    });
  });

  it('renders empty state when no messages', () => {
    render(<GeminiChat />);
    
    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Gemini anything...')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    const mockMessages = [
      {
        role: 'user' as const,
        content: 'Hello Gemini',
        timestamp: new Date('2025-01-28T10:00:00'),
      },
      {
        role: 'assistant' as const,
        content: 'Hello! How can I help you today?',
        timestamp: new Date('2025-01-28T10:00:05'),
      },
    ];

    vi.mocked(geminiHooks.useGeminiChat).mockReturnValue({
      messages: mockMessages,
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      sendMessage: vi.fn(),
      sendMessageStream: mockSendMessageStream,
      stopStreaming: mockStopStreaming,
      clearMessages: mockClearMessages,
    });

    render(<GeminiChat />);

    expect(screen.getByText('Hello Gemini')).toBeInTheDocument();
    expect(screen.getByText(/Hello! How can I help you today?/)).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    render(<GeminiChat />);

    const textarea = screen.getByPlaceholderText('Ask Gemini anything...');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.submit(textarea.closest('form')!);

    await waitFor(() => {
      expect(mockSendMessageStream).toHaveBeenCalledWith('Test message');
    });
  });

  it('displays streaming content', () => {
    vi.mocked(geminiHooks.useGeminiChat).mockReturnValue({
      messages: [],
      isLoading: false,
      isStreaming: true,
      streamingContent: 'Streaming response...',
      sendMessage: vi.fn(),
      sendMessageStream: mockSendMessageStream,
      stopStreaming: mockStopStreaming,
      clearMessages: mockClearMessages,
    });

    render(<GeminiChat />);

    expect(screen.getByText(/Streaming response\.\.\./)).toBeInTheDocument();
  });
});
