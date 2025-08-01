// StreamingChatIntegration.tsx - 完整的流式聊天集成示例
import React, { useState, useRef, useEffect } from 'react';
import { useStream } from '@langchain/langgraph-sdk/react';
import { 
  uiMessageReducer, 
  isUIMessage, 
  isRemoveUIMessage 
} from '@langchain/langgraph-sdk/react-ui';
import type { Message } from '@langchain/langgraph-sdk';
import { v4 as uuidv4 } from 'uuid';

// 配置接口
interface StreamingConfig {
  apiUrl: string;
  assistantId: string;
  apiKey?: string;
  threadId?: string;
}

// 自定义Hook：流式聊天
export function useStreamingChat(config: StreamingConfig) {
  const [threadId, setThreadId] = useState(config.threadId || null);
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const lastErrorRef = useRef<string | undefined>(undefined);

  // 使用LangGraph SDK的流式Hook
  const stream = useStream({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    assistantId: config.assistantId,
    threadId,
    
    // 处理自定义UI事件
    onCustomEvent: (event, options) => {
      if (isUIMessage(event) || isRemoveUIMessage(event)) {
        options.mutate((prev) => {
          const ui = uiMessageReducer(prev.ui ?? [], event);
          return { ...prev, ui };
        });
      }
    },
    
    // 处理线程ID变化
    onThreadId: (id) => {
      setThreadId(id);
      console.log('Thread ID changed to:', id);
    },
  });

  // 监听消息变化，检测首个token
  const prevMessageLengthRef = useRef(0);
  useEffect(() => {
    const messages = stream.messages || [];
    if (
      messages.length !== prevMessageLengthRef.current &&
      messages.length &&
      messages[messages.length - 1]?.type === "ai"
    ) {
      setFirstTokenReceived(true);
    }
    prevMessageLengthRef.current = messages.length;
  }, [stream.messages]);

  // 错误处理
  useEffect(() => {
    if (!stream.error) {
      lastErrorRef.current = undefined;
      return;
    }

    try {
      const message = (stream.error as any)?.message;
      if (!message || lastErrorRef.current === message) {
        return;
      }

      lastErrorRef.current = message;
      console.error('Stream error:', message);
    } catch {
      // 忽略错误解析失败
    }
  }, [stream.error]);

  // 提交消息
  const submitMessage = async (
    input: string,
    files: File[] = [],
    context?: Record<string, unknown>
  ) => {
    if (!input.trim() && files.length === 0) return;
    if (stream.isLoading) return;

    setFirstTokenReceived(false);

    // 构建消息内容
    const content: any[] = [];
    
    if (input.trim()) {
      content.push({ type: "text", text: input });
    }
    
    // 添加文件内容
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: file.type,
            data: base64.split(',')[1], // 移除data:image/...;base64,前缀
          }
        });
      }
    }

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content,
    };

    // 确保工具调用有响应（简化版本）
    const existingMessages = stream.messages || [];

    try {
      await stream.submit(
        { 
          messages: [...existingMessages, newHumanMessage], 
          ...(context && { context })
        },
        {
          streamMode: ["values"],
          optimisticValues: (prev) => ({
            ...prev,
            ...(context && { context }),
            messages: [
              ...(prev.messages ?? []),
              newHumanMessage,
            ],
          }),
        },
      );
    } catch (error) {
      console.error('Submit error:', error);
      throw error;
    }
  };

  // 重新生成响应
  const regenerateResponse = async () => {
    if (stream.isLoading) return;
    
    prevMessageLengthRef.current = Math.max(0, prevMessageLengthRef.current - 1);
    setFirstTokenReceived(false);
    
    try {
      await stream.submit(undefined, {
        streamMode: ["values"],
      });
    } catch (error) {
      console.error('Regenerate error:', error);
      throw error;
    }
  };

  // 停止生成
  const stopGeneration = () => {
    stream.stop();
  };

  return {
    // 消息和状态
    messages: stream.messages || [],
    isLoading: stream.isLoading,
    error: stream.error,
    threadId,
    firstTokenReceived,
    
    // UI组件消息
    uiMessages: stream.values?.ui || [],
    
    // 方法
    submitMessage,
    regenerateResponse,
    stopGeneration,
    setThreadId,
    
    // 原始流对象（高级用法）
    stream,
  };
}

// 流式聊天组件
export function StreamingChatComponent({ 
  config, 
  className = "" 
}: { 
  config: StreamingConfig;
  className?: string;
}) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    error,
    threadId,
    firstTokenReceived,
    submitMessage,
    regenerateResponse,
    stopGeneration,
  } = useStreamingChat(config);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    try {
      await submitMessage(input, files);
      setInput('');
      setFiles([]);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 头部信息 */}
      <div className="border-b p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">聊天对话</h2>
          {threadId && (
            <span className="text-sm text-gray-500">
              线程: {threadId.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble 
            key={message.id || index} 
            message={message}
            isLast={index === messages.length - 1}
            onRegenerate={message.type === 'ai' ? regenerateResponse : undefined}
          />
        ))}
        
        {/* 加载指示器 */}
        {isLoading && !firstTokenReceived && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>AI正在思考...</span>
          </div>
        )}
        
        {/* 错误显示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">
            <strong>错误:</strong> {(error as any)?.message || '未知错误'}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t p-4 bg-white">
        {/* 文件预览 */}
        {files.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center bg-blue-50 rounded px-2 py-1 text-sm">
                <span className="mr-2">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          
          {/* 文件上传 */}
          <label className="flex items-center justify-center w-12 h-12 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <span className="text-xl">📎</span>
          </label>
          
          {/* 提交/停止按钮 */}
          {isLoading ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && files.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
            >
              发送
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// 消息气泡组件
function MessageBubble({ 
  message, 
  isLast, 
  onRegenerate 
}: { 
  message: Message; 
  isLast: boolean; 
  onRegenerate?: () => void;
}) {
  const isHuman = message.type === 'human';
  
  return (
    <div className={`flex ${isHuman ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        isHuman 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="whitespace-pre-wrap break-words">
          {renderMessageContent(message.content)}
        </div>
        
        {/* 重新生成按钮 */}
        {!isHuman && isLast && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
          >
            重新生成
          </button>
        )}
      </div>
    </div>
  );
}

// 渲染消息内容
function renderMessageContent(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (item.type === 'text') {
          return item.text;
        } else if (item.type === 'image') {
          return '[图片]';
        } else {
          return '[附件]';
        }
      })
      .join(' ');
  }
  
  return JSON.stringify(content);
}

// 工具函数：文件转Base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}