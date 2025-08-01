# 流式聊天集成示例

完整的流式聊天集成方案，包含实时响应、文件上传、错误处理等核心功能。

## 核心功能

- ✅ 实时流式响应
- ✅ 消息历史管理
- ✅ 文件上传支持（图片）
- ✅ 错误处理和重试
- ✅ 乐观更新UI
- ✅ 自动滚动
- ✅ 停止生成
- ✅ 重新生成响应

## 组件架构

### `useStreamingChat` Hook
核心Hook，提供完整的流式聊天功能：

```typescript
interface StreamingConfig {
  apiUrl: string;      // LangGraph服务器地址
  assistantId: string; // 助手ID
  apiKey?: string;     // API密钥
  threadId?: string;   // 线程ID
}
```

### `StreamingChatComponent`
完整的聊天界面组件，包含：
- 消息列表显示
- 输入框和文件上传
- 加载状态指示
- 错误消息显示

## 使用方法

### 1. 基础集成

```tsx
import { StreamingChatComponent } from './StreamingChatIntegration';

function App() {
  const config = {
    apiUrl: 'http://localhost:2024',
    assistantId: 'my-assistant',
    apiKey: process.env.REACT_APP_API_KEY, // 可选
  };

  return (
    <div className="h-screen">
      <StreamingChatComponent 
        config={config}
        className="h-full"
      />
    </div>
  );
}
```

### 2. 自定义Hook使用

```tsx
import { useStreamingChat } from './StreamingChatIntegration';

function CustomChatInterface() {
  const {
    messages,
    isLoading,
    submitMessage,
    regenerateResponse,
    stopGeneration,
    error,
  } = useStreamingChat({
    apiUrl: 'https://my-langgraph-server.com',
    assistantId: 'my-agent',
  });

  const handleSend = async (text: string, files: File[]) => {
    try {
      await submitMessage(text, files);
    } catch (error) {
      console.error('发送失败:', error);
    }
  };

  return (
    <div>
      {/* 自定义UI实现 */}
      <MessageList messages={messages} />
      <InputArea onSend={handleSend} disabled={isLoading} />
      {error && <ErrorDisplay error={error} />}
    </div>
  );
}
```

### 3. 多线程管理

```tsx
function MultiThreadChat() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  const chat = useStreamingChat({
    apiUrl: 'http://localhost:2024',
    assistantId: 'assistant',
    threadId: activeThreadId,
  });

  const createNewThread = () => {
    setActiveThreadId(null); // 新线程
  };

  const switchThread = (threadId: string) => {
    setActiveThreadId(threadId);
  };

  return (
    <div className="flex">
      <ThreadSidebar 
        onNewThread={createNewThread}
        onSwitchThread={switchThread}
        activeThread={activeThreadId}
      />
      <StreamingChatComponent config={{ ...config, threadId: activeThreadId }} />
    </div>
  );
}
```

## API 参考

### useStreamingChat返回值

```typescript
{
  // 消息和状态
  messages: Message[];           // 消息历史
  isLoading: boolean;           // 是否正在加载
  error: Error | null;          // 错误信息
  threadId: string | null;      // 当前线程ID
  firstTokenReceived: boolean;  // 是否收到首个token
  
  // UI消息（高级功能）
  uiMessages: UIMessage[];      // UI组件消息
  
  // 操作方法
  submitMessage: (text: string, files?: File[], context?: any) => Promise<void>;
  regenerateResponse: () => Promise<void>;
  stopGeneration: () => void;
  setThreadId: (id: string | null) => void;
  
  // 原始流对象
  stream: StreamObject;
}
```

### 消息格式

```typescript
interface Message {
  id: string;
  type: 'human' | 'ai' | 'tool';
  content: string | MessageContent[];
}

interface MessageContent {
  type: 'text' | 'image' | 'file';
  text?: string;          // 文本内容
  source?: ImageSource;   // 图片数据
  // ... 其他类型特定字段
}
```

## 高级功能

### 1. 上下文传递

```tsx
const submitWithContext = async (text: string, context: any) => {
  await submitMessage(text, [], context);
};

// 例如：传递用户偏好
await submitWithContext('帮我写一首诗', {
  style: 'classical',
  language: 'chinese',
  mood: 'cheerful'
});
```

### 2. 自定义错误处理

```tsx
function ChatWithErrorHandling() {
  const chat = useStreamingChat(config);
  
  const handleSubmitWithRetry = async (text: string, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await chat.submitMessage(text);
        break;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  };

  return (
    <div>
      {/* UI */}
    </div>
  );
}
```

### 3. 流式事件监听

```tsx
function ChatWithEventHandling() {
  const chat = useStreamingChat(config);
  
  useEffect(() => {
    // 监听流式事件
    const handleStreamEvent = (event: any) => {
      if (event.type === 'token') {
        console.log('收到token:', event.data);
      } else if (event.type === 'tool_call') {
        console.log('工具调用:', event.data);
      }
    };

    // 这里需要根据实际SDK API调整
    chat.stream.addEventListener?.('message', handleStreamEvent);
    
    return () => {
      chat.stream.removeEventListener?.('message', handleStreamEvent);
    };
  }, [chat.stream]);

  return <StreamingChatComponent config={config} />;
}
```

### 4. 消息过滤和转换

```tsx
function ChatWithMessageFilter() {
  const chat = useStreamingChat(config);
  
  // 过滤系统消息
  const visibleMessages = chat.messages.filter(msg => 
    !msg.id?.startsWith('system-')
  );
  
  // 转换消息格式
  const formattedMessages = visibleMessages.map(msg => ({
    ...msg,
    content: formatMessageContent(msg.content),
    timestamp: new Date().toISOString(),
  }));

  return (
    <div>
      {formattedMessages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

## 性能优化

### 1. 消息虚拟化

```tsx
import { FixedSizeList as List } from 'react-window';

function VirtualizedMessageList({ messages }: { messages: Message[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={messages.length}
      itemSize={80}
    >
      {Row}
    </List>
  );
}
```

### 2. 防抖输入

```tsx
import { useDebounce } from 'use-debounce';

function DebouncedChatInput() {
  const [input, setInput] = useState('');
  const [debouncedInput] = useDebounce(input, 300);
  
  // 使用debouncedInput进行提交
  const handleSubmit = () => {
    if (debouncedInput.trim()) {
      submitMessage(debouncedInput);
    }
  };

  return (
    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="输入消息..."
    />
  );
}
```

## 样式定制

### 默认样式类

```css
/* 容器 */
.streaming-chat-container {
  @apply flex flex-col h-full;
}

/* 消息列表 */
.message-list {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

/* 消息气泡 */
.message-bubble-human {
  @apply bg-blue-500 text-white rounded-lg p-3 max-w-[80%] ml-auto;
}

.message-bubble-ai {
  @apply bg-gray-100 text-gray-900 rounded-lg p-3 max-w-[80%];
}

/* 输入区域 */
.input-area {
  @apply border-t p-4 bg-white;
}

/* 加载指示器 */
.loading-indicator {
  @apply flex items-center space-x-2 text-gray-500;
}
```

## 集成测试

### 单元测试示例

```tsx
import { renderHook, act } from '@testing-library/react';
import { useStreamingChat } from './StreamingChatIntegration';

test('should submit message successfully', async () => {
  const { result } = renderHook(() => useStreamingChat({
    apiUrl: 'http://localhost:2024',
    assistantId: 'test-assistant',
  }));

  await act(async () => {
    await result.current.submitMessage('Hello, world!');
  });

  expect(result.current.messages).toHaveLength(1);
  expect(result.current.messages[0].content).toContain('Hello, world!');
});
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 apiUrl 是否正确
   - 确认 LangGraph 服务器运行正常
   - 验证网络连接

2. **认证错误**
   - 检查 apiKey 是否有效
   - 确认权限设置正确

3. **消息不显示**
   - 检查消息格式是否正确
   - 确认过滤逻辑没有问题

4. **性能问题**
   - 考虑使用消息虚拟化
   - 限制消息历史长度
   - 优化重渲染逻辑