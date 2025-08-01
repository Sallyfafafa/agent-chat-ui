# 基础消息提交逻辑提取

从 agent-chat-ui 中提取的核心消息提交功能，可以独立使用在其他项目中。

## 核心功能

- ✅ 消息提交和响应处理
- ✅ 支持文本和结构化内容
- ✅ 错误处理和加载状态
- ✅ 乐观更新UI
- ✅ 简化的API接口

## 文件说明

### `useMessageSubmission.tsx`
包含两个主要组件：
1. **`useMessageSubmission`** - 核心Hook，处理消息提交逻辑
2. **`MessageSubmissionForm`** - 示例表单组件，展示如何使用Hook

## 使用方法

### 1. 安装依赖

```bash
npm install @langchain/langgraph-sdk uuid
npm install --save-dev @types/uuid
```

### 2. 基础使用

```tsx
import { MessageSubmissionForm } from './useMessageSubmission';

function App() {
  const config = {
    apiUrl: 'http://localhost:2024',
    assistantId: 'your-assistant-id',
    apiKey: 'your-api-key', // 可选
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1>聊天界面</h1>
      <MessageSubmissionForm 
        config={config}
        onMessageSubmitted={(message) => console.log('发送了:', message)}
      />
    </div>
  );
}
```

### 3. 高级使用

```tsx
import { useMessageSubmission } from './useMessageSubmission';

function CustomChatComponent() {
  const { submitMessage, messages, isSubmitting, error } = useMessageSubmission({
    apiUrl: process.env.REACT_APP_API_URL,
    assistantId: 'my-agent',
  });

  const handleCustomSubmit = async () => {
    // 支持结构化内容
    await submitMessage('你好', [
      { type: 'image', url: 'https://example.com/image.jpg' },
      { type: 'file', name: 'document.pdf' }
    ]);
  };

  return (
    <div>
      {/* 自定义UI */}
    </div>
  );
}
```

## 配置选项

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `apiUrl` | string | ✅ | LangGraph服务器地址 |
| `assistantId` | string | ✅ | 助手/图表ID |
| `apiKey` | string | ❌ | API密钥（生产环境需要） |
| `threadId` | string | ❌ | 特定线程ID |

## 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| `submitMessage` | function | 提交消息函数 |
| `isSubmitting` | boolean | 是否正在提交 |
| `messages` | Message[] | 消息历史 |
| `isLoading` | boolean | 是否正在加载响应 |
| `error` | Error \| null | 错误信息 |

## 自定义和扩展

### 添加工具调用支持

如果需要完整的工具调用支持，请查看 `../2-tool-call-rendering/` 示例。

### 添加文件上传

```tsx
const submitWithFiles = async (text: string, files: File[]) => {
  const contentBlocks = files.map(file => ({
    type: 'file',
    file: file,
    name: file.name,
    size: file.size,
  }));
  
  await submitMessage(text, contentBlocks);
};
```

### 添加上下文传递

```tsx
const submitWithContext = async (text: string, context: any) => {
  await submitMessage(text, [], context);
};
```

## 注意事项

1. **依赖管理**: 确保安装了正确版本的 `@langchain/langgraph-sdk`
2. **错误处理**: 生产环境中应该添加更完善的错误处理
3. **类型安全**: 建议使用 TypeScript 以获得更好的类型支持
4. **性能优化**: 大量消息时考虑虚拟滚动等优化方案

## 与原始代码的差异

- 移除了复杂的UI组件依赖
- 简化了文件上传逻辑
- 移除了 artifact 相关功能
- 简化了工具调用处理（可在其他示例中找到完整版本）