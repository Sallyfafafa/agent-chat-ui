# 工具调用渲染组件提取

从 agent-chat-ui 中提取的工具调用可视化组件，可以清晰地显示 AI 的工具使用过程。

## 核心功能

- ✅ 工具调用参数显示
- ✅ 工具执行结果展示
- ✅ JSON内容格式化
- ✅ 长内容截断和展开
- ✅ 响应式设计
- ✅ 类型安全

## 组件说明

### `ToolCallRenderer`
显示工具调用信息，包括：
- 工具名称和ID
- 调用参数（支持复杂对象）
- 清晰的视觉分层

### `ToolResultRenderer`
显示工具执行结果，包括：
- 结果内容（自动检测JSON格式）
- 长内容智能截断
- 展开/收起功能

### `ToolInteractionDisplay`
组合组件，同时显示工具调用和结果

### `useToolCallExtraction`
从消息数组中提取工具相关信息的Hook

## 使用方法

### 1. 安装依赖

```bash
npm install @langchain/langgraph-sdk
```

### 2. 基础使用

```tsx
import { ToolInteractionDisplay, useToolCallExtraction } from './ToolCallRenderer';

function ChatMessage({ message, messages }) {
  const { toolCalls, toolResults, hasToolInteractions } = useToolCallExtraction([message]);
  
  return (
    <div className="message">
      {/* 常规消息内容 */}
      <div>{message.content}</div>
      
      {/* 工具交互显示 */}
      {hasToolInteractions && (
        <ToolInteractionDisplay 
          toolCalls={toolCalls}
          toolResults={toolResults}
        />
      )}
    </div>
  );
}
```

### 3. 高级使用 - 分离显示

```tsx
import { ToolCallRenderer, ToolResultRenderer } from './ToolCallRenderer';

function DetailedChatView({ messages }) {
  return (
    <div className="chat-container">
      {messages.map((message, index) => (
        <div key={index} className="message-group">
          {/* AI消息 */}
          {message.type === 'ai' && (
            <div className="ai-message">
              <div className="content">{message.content}</div>
              
              {/* 工具调用 */}
              {message.tool_calls && (
                <ToolCallRenderer toolCalls={message.tool_calls} />
              )}
            </div>
          )}
          
          {/* 工具结果 */}
          {message.type === 'tool' && (
            <ToolResultRenderer toolResults={[message]} />
          )}
        </div>
      ))}
    </div>
  );
}
```

### 4. 自定义样式

```tsx
// 自定义主题样式
const customTheme = {
  toolCall: 'bg-purple-50 border-purple-200',
  toolCallHeader: 'bg-purple-100 text-purple-900',
  toolResult: 'bg-indigo-50 border-indigo-200',
  toolResultHeader: 'bg-indigo-100 text-indigo-900',
};

function ThemedToolDisplay({ toolCalls, toolResults }) {
  return (
    <div className="space-y-4">
      {toolCalls.map((tc, idx) => (
        <div key={idx} className={`${customTheme.toolCall} rounded-lg overflow-hidden`}>
          <div className={`${customTheme.toolCallHeader} px-4 py-2`}>
            {tc.name}
          </div>
          {/* 其他内容... */}
        </div>
      ))}
    </div>
  );
}
```

## 组件API

### ToolCallRenderer

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `toolCalls` | ToolCall[] | ✅ | 工具调用数组 |

### ToolResultRenderer

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `toolResults` | ToolMessage[] | ✅ | 工具结果数组 |

### ToolInteractionDisplay

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `toolCalls` | ToolCall[] | ❌ | 工具调用数组 |
| `toolResults` | ToolMessage[] | ❌ | 工具结果数组 |

### useToolCallExtraction

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `messages` | any[] | ✅ | 消息数组 |

**返回值:**
```typescript
{
  toolCalls: ToolCall[];
  toolResults: ToolMessage[];
  hasToolInteractions: boolean;
}
```

## 样式定制

### CSS类名结构

```css
/* 工具调用容器 */
.tool-call-container {
  @apply border border-gray-200 rounded-lg bg-blue-50;
}

/* 工具调用头部 */
.tool-call-header {
  @apply bg-blue-100 px-4 py-2 border-b border-blue-200;
}

/* 工具结果容器 */
.tool-result-container {
  @apply border border-gray-200 rounded-lg bg-green-50;
}

/* 工具结果头部 */
.tool-result-header {
  @apply bg-green-100 px-4 py-2 border-b border-green-200;
}

/* JSON代码块 */
.json-content {
  @apply bg-gray-50 p-2 rounded text-xs overflow-x-auto border font-mono;
}
```

### 深色主题支持

```css
@media (prefers-color-scheme: dark) {
  .tool-call-container {
    @apply bg-blue-900 border-blue-700;
  }
  
  .tool-call-header {
    @apply bg-blue-800 border-blue-700 text-blue-100;
  }
  
  .tool-result-container {
    @apply bg-green-900 border-green-700;
  }
  
  .tool-result-header {
    @apply bg-green-800 border-green-700 text-green-100;
  }
}
```

## 扩展功能

### 添加工具调用状态

```tsx
interface ToolCallWithStatus extends ToolCall {
  status: 'pending' | 'success' | 'error';
  startTime?: number;
  endTime?: number;
}

function ToolCallWithStatusRenderer({ toolCall }: { toolCall: ToolCallWithStatus }) {
  const duration = toolCall.endTime && toolCall.startTime 
    ? toolCall.endTime - toolCall.startTime 
    : null;
    
  return (
    <div className="tool-call-container">
      <div className="tool-call-header">
        <div className="flex justify-between items-center">
          <span>{toolCall.name}</span>
          <div className="flex items-center gap-2">
            <StatusBadge status={toolCall.status} />
            {duration && <span className="text-xs">{duration}ms</span>}
          </div>
        </div>
      </div>
      {/* 其他内容... */}
    </div>
  );
}
```

### 添加工具调用图标

```tsx
const TOOL_ICONS = {
  'web_search': '🔍',
  'calculator': '🧮',
  'file_reader': '📄',
  'image_analyzer': '🖼️',
  'default': '🔧'
};

function ToolCallWithIcon({ toolCall }) {
  const icon = TOOL_ICONS[toolCall.name] || TOOL_ICONS.default;
  
  return (
    <div className="tool-call-header">
      <span className="mr-2">{icon}</span>
      {toolCall.name}
    </div>
  );
}
```

## 注意事项

1. **性能优化**: 大量工具调用时考虑虚拟化
2. **内容安全**: 显示工具结果时注意XSS防护
3. **移动端适配**: 确保在小屏幕上的可读性
4. **无障碍性**: 添加适当的ARIA标签

## 与原始代码的差异

- 移除了对特定UI库的依赖
- 简化了动画效果（可根据需要添加）
- 增强了类型安全性
- 添加了更多自定义选项
- 优化了移动端显示