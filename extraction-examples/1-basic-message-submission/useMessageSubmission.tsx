// useMessageSubmission.ts - 提取的消息提交逻辑
import { useState } from 'react';
import { useStream } from '@langchain/langgraph-sdk/react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@langchain/langgraph-sdk';

interface SubmissionConfig {
  apiUrl: string;
  apiKey?: string;
  assistantId: string;
  threadId?: string;
}

interface ContentBlock {
  type: string;
  [key: string]: any;
}

export function useMessageSubmission(config: SubmissionConfig) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const stream = useStream({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    assistantId: config.assistantId,
    threadId: config.threadId || null,
  });

  const submitMessage = async (
    input: string, 
    contentBlocks: ContentBlock[] = [],
    context?: Record<string, unknown>
  ) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // 创建人类消息
      const newHumanMessage: Message = {
        id: uuidv4(),
        type: "human",
        content: [
          ...(input.trim().length > 0 ? [{ type: "text", text: input }] : []),
          ...contentBlocks,
        ] as Message["content"],
      };

      // 这里需要实现 ensureToolCallsHaveResponses 逻辑
      // 简化版本：直接使用现有消息
      const toolMessages = stream.messages || [];

      // 提交到LangGraph
      await stream.submit(
        { 
          messages: [...toolMessages, newHumanMessage], 
          context 
        },
        {
          streamMode: ["values"],
          optimisticValues: (prev) => ({
            ...prev,
            context,
            messages: [
              ...(prev.messages ?? []),
              ...toolMessages,
              newHumanMessage,
            ],
          }),
        },
      );
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitMessage,
    isSubmitting,
    messages: stream.messages,
    isLoading: stream.isLoading,
    error: stream.error,
  };
}

// MessageSubmissionForm.tsx - 使用提取逻辑的表单组件
import React, { useState } from 'react';

interface Props {
  config: SubmissionConfig;
  onMessageSubmitted?: (message: string) => void;
}

export function MessageSubmissionForm({ config, onMessageSubmitted }: Props) {
  const [input, setInput] = useState('');
  const { submitMessage, isSubmitting, messages, error } = useMessageSubmission(config);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    await submitMessage(input);
    onMessageSubmitted?.(input);
    setInput('');
  };

  return (
    <div className="space-y-4">
      {/* 消息列表 */}
      <div className="space-y-2">
        {messages.map((message, index) => (
          <div key={index} className={`p-3 rounded ${
            message.type === 'human' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
          }`}>
            <div className="text-sm font-medium text-gray-600">
              {message.type === 'human' ? 'You' : 'Assistant'}
            </div>
            <div className="mt-1">
              {typeof message.content === 'string' 
                ? message.content 
                : JSON.stringify(message.content)
              }
            </div>
          </div>
        ))}
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
          错误: {error.message}
        </div>
      )}

      {/* 提交表单 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          className="flex-1 p-2 border border-gray-300 rounded"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isSubmitting ? '发送中...' : '发送'}
        </button>
      </form>
    </div>
  );
}