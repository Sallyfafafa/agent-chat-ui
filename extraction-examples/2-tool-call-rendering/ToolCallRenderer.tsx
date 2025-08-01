// ToolCallRenderer.tsx - 提取的工具调用渲染组件
import React, { useState } from 'react';
import type { AIMessage, ToolMessage } from '@langchain/langgraph-sdk';

// 工具调用类型定义
interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  type: 'tool_call';
}

// 判断是否为复杂值（需要JSON格式化显示）
function isComplexValue(value: any): boolean {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

// 工具调用显示组件
export function ToolCallRenderer({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-600 border-b pb-1">
        🔧 工具调用 ({toolCalls.length})
      </div>
      
      {toolCalls.map((tc, idx) => {
        const args = tc.args as Record<string, any>;
        const hasArgs = Object.keys(args).length > 0;
        
        return (
          <div
            key={idx}
            className="border border-gray-200 rounded-lg overflow-hidden bg-blue-50"
          >
            {/* 工具名称和ID */}
            <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-blue-900">
                  {tc.name}
                </h3>
                {tc.id && (
                  <code className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                    {tc.id}
                  </code>
                )}
              </div>
            </div>
            
            {/* 工具参数 */}
            <div className="bg-white">
              {hasArgs ? (
                <div className="divide-y divide-gray-100">
                  {Object.entries(args).map(([key, value], argIdx) => (
                    <div key={argIdx} className="px-4 py-2">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                        <div className="text-sm font-medium text-gray-700 min-w-0 sm:w-1/4">
                          {key}:
                        </div>
                        <div className="flex-1 min-w-0">
                          {isComplexValue(value) ? (
                            <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto border">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-sm text-gray-600 break-words">
                              {String(value)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 italic">
                  无参数
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 工具结果显示组件
export function ToolResultRenderer({ toolResults }: { toolResults: ToolMessage[] }) {
  if (!toolResults || toolResults.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-600 border-b pb-1">
        📋 工具执行结果 ({toolResults.length})
      </div>
      
      {toolResults.map((result, idx) => (
        <ToolResultItem key={idx} message={result} />
      ))}
    </div>
  );
}

// 单个工具结果组件
function ToolResultItem({ message }: { message: ToolMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 解析内容
  let parsedContent: any;
  let isJsonContent = false;
  
  try {
    if (typeof message.content === "string") {
      parsedContent = JSON.parse(message.content);
      isJsonContent = isComplexValue(parsedContent);
    }
  } catch {
    // 内容不是JSON，直接使用
    parsedContent = message.content;
  }

  // 格式化显示内容
  const contentStr = isJsonContent
    ? JSON.stringify(parsedContent, null, 2)
    : String(message.content);
  
  const contentLines = contentStr.split("\n");
  const shouldTruncate = contentLines.length > 6 || contentStr.length > 800;
  
  const displayedContent = shouldTruncate && !isExpanded
    ? contentStr.length > 800
      ? contentStr.slice(0, 800) + "..."
      : contentLines.slice(0, 6).join("\n") + "\n..."
    : contentStr;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-green-50">
      {/* 结果头部 */}
      <div className="bg-green-100 px-4 py-2 border-b border-green-200">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-green-900">
            工具执行结果
          </h4>
          {message.tool_call_id && (
            <code className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
              {message.tool_call_id}
            </code>
          )}
        </div>
      </div>
      
      {/* 结果内容 */}
      <div className="bg-white p-4">
        <pre className="whitespace-pre-wrap break-words text-sm font-mono overflow-x-auto">
          {displayedContent}
        </pre>
        
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium"
          >
            {isExpanded ? '▲ 收起' : '▼ 展开完整内容'}
          </button>
        )}
      </div>
    </div>
  );
}

// 完整的工具调用和结果显示组件
export function ToolInteractionDisplay({ 
  toolCalls, 
  toolResults 
}: { 
  toolCalls?: ToolCall[]; 
  toolResults?: ToolMessage[] 
}) {
  const hasToolCalls = toolCalls && toolCalls.length > 0;
  const hasToolResults = toolResults && toolResults.length > 0;
  
  if (!hasToolCalls && !hasToolResults) return null;

  return (
    <div className="space-y-4 my-4 p-4 bg-gray-50 rounded-lg border">
      {hasToolCalls && <ToolCallRenderer toolCalls={toolCalls} />}
      {hasToolResults && <ToolResultRenderer toolResults={toolResults} />}
    </div>
  );
}

// Hook: 从消息中提取工具调用信息
export function useToolCallExtraction(messages: any[]) {
  const extractToolInfo = (message: any) => {
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolMessage[] = [];
    
    if (message.type === 'ai' && message.tool_calls) {
      toolCalls.push(...message.tool_calls);
    }
    
    if (message.type === 'tool') {
      toolResults.push(message);
    }
    
    return { toolCalls, toolResults };
  };

  // 从所有消息中提取工具信息
  const allToolCalls: ToolCall[] = [];
  const allToolResults: ToolMessage[] = [];
  
  messages.forEach(message => {
    const { toolCalls, toolResults } = extractToolInfo(message);
    allToolCalls.push(...toolCalls);
    allToolResults.push(...toolResults);
  });

  return {
    toolCalls: allToolCalls,
    toolResults: allToolResults,
    hasToolInteractions: allToolCalls.length > 0 || allToolResults.length > 0,
  };
}