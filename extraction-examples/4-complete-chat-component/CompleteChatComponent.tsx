// CompleteChatComponent.tsx - 完整的聊天组件，整合所有提取的功能
import React, { useState, useRef, useEffect } from 'react';
import { useStream } from '@langchain/langgraph-sdk/react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, AIMessage, ToolMessage } from '@langchain/langgraph-sdk';

// 重新导入我们之前提取的组件
// 注意：在实际使用中，这些应该是独立的npm包或模块
import { ToolInteractionDisplay, useToolCallExtraction } from '../2-tool-call-rendering/ToolCallRenderer';

// 配置接口
interface CompleteChatConfig {
  apiUrl: string;
  assistantId: string;
  apiKey?: string;
  threadId?: string;
  enableTools?: boolean;
  enableFileUpload?: boolean;
  maxMessages?: number;
}

// 聊天状态接口
interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  threadId: string | null;
}

// 主要的聊天Hook
export function useCompleteChat(config: CompleteChatConfig) {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    threadId: config.threadId || null,
  });

  const stream = useStream({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    assistantId: config.assistantId,
    threadId: chatState.threadId,
    
    onCustomEvent: (event, options) => {
      // 处理自定义事件（UI消息等）
      console.log('Custom event received:', event);
    },
    
    onThreadId: (id) => {
      setChatState(prev => ({ ...prev, threadId: id }));
    },
  });

  // 同步流状态到本地状态
  useEffect(() => {
    setChatState(prev => ({
      ...prev,
      messages: stream.messages || [],
      isLoading: stream.isLoading,
      error: stream.error,
    }));
  }, [stream.messages, stream.isLoading, stream.error]);

  // 提交消息
  const submitMessage = async (
    input: string,
    files: File[] = [],
    options: { context?: any; regenerate?: boolean } = {}
  ) => {
    if (!input.trim() && files.length === 0 && !options.regenerate) return;

    try {
      let messageContent: any[] = [];
      
      if (input.trim()) {
        messageContent.push({ type: "text", text: input });
      }
      
      // 处理文件上传
      if (config.enableFileUpload && files.length > 0) {
        for (const file of files) {
          if (file.type.startsWith('image/')) {
            const base64 = await fileToBase64(file);
            messageContent.push({
              type: "image",
              source: {
                type: "base64",
                media_type: file.type,
                data: base64.split(',')[1],
              }
            });
          }
        }
      }

      if (!options.regenerate) {
        const newMessage: Message = {
          id: uuidv4(),
          type: "human",
          content: messageContent,
        };

        await stream.submit(
          { 
            messages: [...(stream.messages || []), newMessage],
            ...(options.context && { context: options.context })
          },
          {
            streamMode: ["values"],
            optimisticValues: (prev) => ({
              ...prev,
              messages: [...(prev.messages ?? []), newMessage],
            }),
          }
        );
      } else {
        // 重新生成最后一个AI回复
        await stream.submit(undefined, {
          streamMode: ["values"],
        });
      }
    } catch (error) {
      console.error('Submit message error:', error);
      throw error;
    }
  };

  // 清除对话
  const clearChat = () => {
    setChatState(prev => ({
      ...prev,
      threadId: null,
      messages: [],
    }));
  };

  // 停止生成
  const stopGeneration = () => {
    stream.stop();
  };

  return {
    ...chatState,
    submitMessage,
    clearChat,
    stopGeneration,
    // 工具相关（如果启用）
    ...(config.enableTools && {
      ...useToolCallExtraction(chatState.messages)
    }),
  };
}

// 完整的聊天组件
export function CompleteChatComponent({
  config,
  className = "",
  onMessageSent,
  onError,
}: {
  config: CompleteChatConfig;
  className?: string;
  onMessageSent?: (message: string) => void;
  onError?: (error: Error) => void;
}) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showTools, setShowTools] = useState(config.enableTools ?? true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chat = useCompleteChat(config);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  // 错误回调
  useEffect(() => {
    if (chat.error && onError) {
      onError(chat.error);
    }
  }, [chat.error, onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    const messageText = input;
    setInput('');
    setFiles([]);

    try {
      await chat.submitMessage(messageText, files);
      onMessageSent?.(messageText);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRegenerate = async () => {
    try {
      await chat.submitMessage('', [], { regenerate: true });
    } catch (error) {
      console.error('重新生成失败:', error);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-4">
          <h2 className="font-semibold text-lg">智能助手</h2>
          {chat.threadId && (
            <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
              {chat.threadId.slice(0, 8)}...
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 工具显示开关 */}
          {config.enableTools && (
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={showTools}
                onChange={(e) => setShowTools(e.target.checked)}
                className="mr-2"
              />
              显示工具调用
            </label>
          )}
          
          {/* 清除对话 */}
          <button
            onClick={chat.clearChat}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            新对话
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          {chat.messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">开始对话</h3>
              <p>向AI助手提问任何问题，支持文本和图片输入</p>
            </div>
          ) : (
            chat.messages.map((message, index) => (
              <MessageDisplay
                key={message.id || index}
                message={message}
                showTools={showTools && config.enableTools}
                isLast={index === chat.messages.length - 1}
                onRegenerate={message.type === 'ai' ? handleRegenerate : undefined}
              />
            ))
          )}

          {/* 加载指示器 */}
          {chat.isLoading && (
            <div className="flex items-center justify-start">
              <div className="bg-gray-100 rounded-lg p-4 max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">正在思考...</span>
                </div>
              </div>
            </div>
          )}

          {/* 错误显示 */}
          {chat.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-red-400 mr-3 mt-1">⚠️</div>
                <div>
                  <h4 className="text-red-800 font-medium">发生错误</h4>
                  <p className="text-red-700 text-sm mt-1">
                    {(chat.error as any)?.message || '未知错误，请重试'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-white p-4">
        <div className="max-w-4xl mx-auto">
          {/* 文件预览 */}
          {files.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-blue-700 mr-2">
                    {file.type.startsWith('image/') ? '🖼️' : '📄'} {file.name}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-blue-500 hover:text-blue-700 ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            {/* 文本输入 */}
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入消息... (Shift+Enter 换行)"
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={Math.min(Math.max(input.split('\n').length, 1), 4)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>

            {/* 文件上传 */}
            {config.enableFileUpload && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="上传图片"
              >
                📎
              </button>
            )}

            {/* 发送/停止按钮 */}
            {chat.isLoading ? (
              <button
                type="button"
                onClick={chat.stopGeneration}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                停止
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && files.length === 0}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                发送
              </button>
            )}
          </form>

          {/* 隐藏的文件输入 */}
          {config.enableFileUpload && (
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept="image/*"
              multiple
              className="hidden"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 消息显示组件
function MessageDisplay({
  message,
  showTools,
  isLast,
  onRegenerate,
}: {
  message: Message;
  showTools: boolean;
  isLast: boolean;
  onRegenerate?: () => void;
}) {
  const isHuman = message.type === 'human';
  const isAI = message.type === 'ai';
  
  // 提取工具调用信息
  const { toolCalls, toolResults } = useToolCallExtraction([message]);

  return (
    <div className={`flex ${isHuman ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isHuman ? 'order-2' : 'order-1'}`}>
        {/* 发送者标识 */}
        <div className={`text-xs text-gray-500 mb-1 ${isHuman ? 'text-right' : 'text-left'}`}>
          {isHuman ? '您' : '🤖 AI助手'}
        </div>

        {/* 消息内容 */}
        <div
          className={`rounded-lg p-4 ${
            isHuman
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {renderMessageContent(message.content)}
          </div>

          {/* 工具调用显示 */}
          {showTools && isAI && (toolCalls.length > 0 || toolResults.length > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <ToolInteractionDisplay
                toolCalls={toolCalls}
                toolResults={toolResults}
              />
            </div>
          )}

          {/* 操作按钮 */}
          {isAI && isLast && (
            <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-200 space-x-2">
              <button
                onClick={onRegenerate}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
              >
                🔄 重新生成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 渲染消息内容
function renderMessageContent(content: any): React.ReactNode {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-2">
        {content.map((item, index) => {
          if (item.type === 'text') {
            return <div key={index}>{item.text}</div>;
          } else if (item.type === 'image') {
            return (
              <div key={index} className="mt-2">
                <div className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                  🖼️ 图片
                </div>
              </div>
            );
          } else {
            return (
              <div key={index} className="mt-2">
                <div className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm">
                  📄 {item.type}
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  }

  return <pre className="text-sm">{JSON.stringify(content, null, 2)}</pre>;
}

// 工具函数
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 默认配置
export const defaultChatConfig: Partial<CompleteChatConfig> = {
  enableTools: true,
  enableFileUpload: true,
  maxMessages: 100,
};

// 预设配置
export const presetConfigs = {
  basic: {
    enableTools: false,
    enableFileUpload: false,
  },
  standard: {
    enableTools: true,
    enableFileUpload: true,
  },
  advanced: {
    enableTools: true,
    enableFileUpload: true,
    maxMessages: 500,
  },
};