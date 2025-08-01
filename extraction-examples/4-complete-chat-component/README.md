# 完整聊天组件

这是一个完整的聊天组件实现，整合了前面所有提取的功能，提供开箱即用的聊天体验。

## 核心特性

- ✅ 完整的消息提交和响应流程
- ✅ 实时流式响应显示
- ✅ 工具调用可视化
- ✅ 文件上传支持（图片）
- ✅ 错误处理和重试机制
- ✅ 响应式设计
- ✅ 可配置功能开关
- ✅ 多种预设配置
- ✅ 类型安全的API

## 快速开始

### 1. 基础使用

```tsx
import { CompleteChatComponent } from './CompleteChatComponent';

function App() {
  const config = {
    apiUrl: 'http://localhost:2024',
    assistantId: 'my-assistant',
    apiKey: process.env.REACT_APP_API_KEY,
  };

  return (
    <div className="h-screen">
      <CompleteChatComponent 
        config={config}
        className="h-full"
        onMessageSent={(message) => console.log('发送:', message)}
        onError={(error) => console.error('错误:', error)}
      />
    </div>
  );
}
```

### 2. 使用预设配置

```tsx
import { CompleteChatComponent, presetConfigs } from './CompleteChatComponent';

function BasicChatApp() {
  const config = {
    apiUrl: 'http://localhost:2024',
    assistantId: 'basic-assistant',
    ...presetConfigs.basic, // 禁用工具和文件上传
  };

  return <CompleteChatComponent config={config} />;
}

function AdvancedChatApp() {
  const config = {
    apiUrl: 'https://my-production-server.com',
    assistantId: 'advanced-assistant',
    apiKey: 'your-api-key',
    ...presetConfigs.advanced, // 启用所有功能
  };

  return <CompleteChatComponent config={config} />;
}
```

### 3. 自定义Hook使用

```tsx
import { useCompleteChat } from './CompleteChatComponent';

function CustomChatInterface() {
  const chat = useCompleteChat({
    apiUrl: 'http://localhost:2024',
    assistantId: 'custom-assistant',
    enableTools: true,
    enableFileUpload: true,
  });

  return (
    <div className="custom-chat">
      <header>
        <h1>自定义聊天界面</h1>
        <button onClick={chat.clearChat}>清除对话</button>
      </header>
      
      <main>
        {chat.messages.map((message, index) => (
          <div key={index} className="message">
            {/* 自定义消息渲染 */}
          </div>
        ))}
      </main>
      
      <footer>
        {/* 自定义输入区域 */}
      </footer>
    </div>
  );
}
```

## 配置选项

### CompleteChatConfig

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `apiUrl` | string | ✅ | - | LangGraph服务器地址 |
| `assistantId` | string | ✅ | - | 助手/图表ID |
| `apiKey` | string | ❌ | - | API密钥 |
| `threadId` | string | ❌ | - | 初始线程ID |
| `enableTools` | boolean | ❌ | true | 启用工具调用显示 |
| `enableFileUpload` | boolean | ❌ | true | 启用文件上传 |
| `maxMessages` | number | ❌ | 100 | 最大消息数 |

### 预设配置

```typescript
// 基础配置 - 仅文本对话
presetConfigs.basic = {
  enableTools: false,
  enableFileUpload: false,
}

// 标准配置 - 启用工具和文件上传
presetConfigs.standard = {
  enableTools: true,
  enableFileUpload: true,
}

// 高级配置 - 所有功能 + 更多消息历史
presetConfigs.advanced = {
  enableTools: true,
  enableFileUpload: true,
  maxMessages: 500,
}
```

## 组件API

### CompleteChatComponent Props

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `config` | CompleteChatConfig | ✅ | 聊天配置 |
| `className` | string | ❌ | 附加CSS类名 |
| `onMessageSent` | (message: string) => void | ❌ | 消息发送回调 |
| `onError` | (error: Error) => void | ❌ | 错误处理回调 |

### useCompleteChat Hook返回值

```typescript
{
  // 状态
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  threadId: string | null;
  
  // 方法
  submitMessage: (input: string, files?: File[], options?) => Promise<void>;
  clearChat: () => void;
  stopGeneration: () => void;
  
  // 工具相关（如果启用）
  toolCalls: ToolCall[];
  toolResults: ToolMessage[];
  hasToolInteractions: boolean;
}
```

## 高级用法

### 1. 自定义消息渲染

```tsx
import { useCompleteChat } from './CompleteChatComponent';

function ChatWithCustomMessages() {
  const chat = useCompleteChat(config);
  
  const renderCustomMessage = (message: Message) => {
    if (message.type === 'ai' && message.content.includes('```')) {
      // 自定义代码块渲染
      return <CodeBlockMessage message={message} />;
    }
    return <DefaultMessage message={message} />;
  };

  return (
    <div>
      {chat.messages.map(renderCustomMessage)}
    </div>
  );
}
```

### 2. 集成外部状态管理

```tsx
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

function ReduxIntegratedChat() {
  const dispatch = useDispatch();
  const chatHistory = useSelector(state => state.chat.history);
  
  const chat = useCompleteChat(config);

  // 同步到Redux
  useEffect(() => {
    dispatch(updateChatHistory(chat.messages));
  }, [chat.messages, dispatch]);

  // 从Redux恢复状态
  useEffect(() => {
    if (chatHistory.length > 0) {
      // 恢复聊天历史的逻辑
    }
  }, []);

  return <CompleteChatComponent config={config} />;
}
```

### 3. 添加插件系统

```tsx
interface ChatPlugin {
  name: string;
  onMessageSent?: (message: string) => void;
  onMessageReceived?: (message: Message) => void;
  onError?: (error: Error) => void;
}

function ChatWithPlugins({ plugins }: { plugins: ChatPlugin[] }) {
  const handleMessageSent = (message: string) => {
    plugins.forEach(plugin => plugin.onMessageSent?.(message));
  };

  return (
    <CompleteChatComponent 
      config={config}
      onMessageSent={handleMessageSent}
    />
  );
}

// 使用示例
const analyticsPlugin: ChatPlugin = {
  name: 'analytics',
  onMessageSent: (message) => {
    analytics.track('message_sent', { content: message });
  },
};

const loggingPlugin: ChatPlugin = {
  name: 'logging',
  onError: (error) => {
    console.error('Chat error:', error);
  },
};

<ChatWithPlugins plugins={[analyticsPlugin, loggingPlugin]} />
```

### 4. 主题定制

```tsx
const customTheme = {
  primary: 'bg-purple-500',
  primaryHover: 'hover:bg-purple-600',
  userMessage: 'bg-purple-500 text-white',
  aiMessage: 'bg-gray-100 text-gray-900',
  toolCall: 'bg-purple-50 border-purple-200',
  toolResult: 'bg-green-50 border-green-200',
};

function ThemedChat() {
  return (
    <div className="themed-chat" data-theme="purple">
      <CompleteChatComponent config={config} />
    </div>
  );
}
```

### 5. 实时协作

```tsx
import { useWebSocket } from './useWebSocket';

function CollaborativeChat() {
  const ws = useWebSocket('ws://localhost:8080');
  const chat = useCompleteChat(config);

  // 广播消息到其他用户
  const handleMessageSent = (message: string) => {
    ws.send({
      type: 'message',
      content: message,
      userId: getCurrentUserId(),
    });
  };

  // 接收其他用户的消息
  useEffect(() => {
    ws.onMessage((data) => {
      if (data.type === 'message' && data.userId !== getCurrentUserId()) {
        // 显示其他用户的消息
        showNotification(`${data.username} 发送了消息`);
      }
    });
  }, [ws]);

  return (
    <CompleteChatComponent 
      config={config}
      onMessageSent={handleMessageSent}
    />
  );
}
```

## 样式定制

### CSS变量

```css
:root {
  --chat-primary: #3b82f6;
  --chat-primary-hover: #2563eb;
  --chat-bg: #ffffff;
  --chat-border: #e5e7eb;
  --chat-text: #1f2937;
  --chat-text-secondary: #6b7280;
}

.themed-chat[data-theme="purple"] {
  --chat-primary: #8b5cf6;
  --chat-primary-hover: #7c3aed;
}
```

### 自定义组件样式

```css
.complete-chat-container {
  background: var(--chat-bg);
  border: 1px solid var(--chat-border);
  border-radius: 12px;
  overflow: hidden;
}

.message-user {
  background: var(--chat-primary);
  color: white;
}

.message-ai {
  background: #f3f4f6;
  color: var(--chat-text);
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-dots {
  display: flex;
  gap: 4px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: var(--chat-text-secondary);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}
```

## 性能优化

### 1. 消息虚拟化

```tsx
import { FixedSizeList as List } from 'react-window';

function VirtualizedChat() {
  const chat = useCompleteChat(config);
  
  const Row = ({ index, style }) => (
    <div style={style}>
      <MessageDisplay message={chat.messages[index]} />
    </div>
  );

  return (
    <div className="h-full">
      <List
        height={600}
        itemCount={chat.messages.length}
        itemSize={120}
      >
        {Row}
      </List>
    </div>
  );
}
```

### 2. 防抖输入

```tsx
import { useDebouncedCallback } from 'use-debounce';

function DebouncedChat() {
  const [input, setInput] = useState('');
  
  const debouncedSubmit = useDebouncedCallback(
    (value) => {
      if (value.trim()) {
        chat.submitMessage(value);
      }
    },
    500
  );

  return (
    <textarea
      value={input}
      onChange={(e) => {
        setInput(e.target.value);
        debouncedSubmit(e.target.value);
      }}
    />
  );
}
```

## 测试

### 单元测试

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompleteChatComponent } from './CompleteChatComponent';

describe('CompleteChatComponent', () => {
  const mockConfig = {
    apiUrl: 'http://localhost:2024',
    assistantId: 'test-assistant',
  };

  test('renders chat interface', () => {
    render(<CompleteChatComponent config={mockConfig} />);
    expect(screen.getByPlaceholderText(/输入消息/)).toBeInTheDocument();
  });

  test('sends message when form is submitted', async () => {
    const onMessageSent = jest.fn();
    render(
      <CompleteChatComponent 
        config={mockConfig}
        onMessageSent={onMessageSent}
      />
    );

    const input = screen.getByPlaceholderText(/输入消息/);
    const sendButton = screen.getByText('发送');

    fireEvent.change(input, { target: { value: 'Hello, world!' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onMessageSent).toHaveBeenCalledWith('Hello, world!');
    });
  });

  test('handles errors gracefully', async () => {
    const onError = jest.fn();
    // Mock API error
    
    render(
      <CompleteChatComponent 
        config={{ ...mockConfig, apiUrl: 'invalid-url' }}
        onError={onError}
      />
    );

    // Trigger error scenario
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});
```

### 集成测试

```tsx
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('http://localhost:2024/submit', (req, res, ctx) => {
    return res(ctx.json({ message: 'Success' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('full chat flow', async () => {
  // 完整的聊天流程测试
});
```

## 部署注意事项

1. **环境变量**: 确保生产环境中正确设置API密钥
2. **CORS配置**: 配置LangGraph服务器允许前端域名
3. **错误监控**: 集成Sentry等错误监控服务
4. **性能监控**: 监控API响应时间和错误率
5. **缓存策略**: 实现适当的消息缓存机制

## 故障排除

### 常见问题

1. **连接失败**
   ```bash
   # 检查服务器状态
   curl http://localhost:2024/health
   ```

2. **消息不显示**
   - 检查消息格式
   - 验证工具调用逻辑
   - 确认过滤器设置

3. **样式问题**
   - 确保Tailwind CSS正确加载
   - 检查CSS变量定义
   - 验证主题配置

4. **性能问题**
   - 启用消息虚拟化
   - 限制消息历史长度
   - 优化重渲染逻辑