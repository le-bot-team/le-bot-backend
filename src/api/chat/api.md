# AI宠物助手 API 文档

## 目录

- [概述](#概述)
- [聊天接口 (WebSocket)](#聊天接口-websocket)
- [唤醒接口 (HTTP POST)](#唤醒接口-http-post)
- [接口对比](#接口对比)
- [错误码说明](#错误码说明)

---

## 概述

AI宠物助手提供两种主要的对话接口：

1. **WebSocket聊天接口** - 用于实时流式对话，支持意图识别、记忆管理、情感陪伴等
2. **HTTP唤醒接口** - 用于处理语音唤醒场景，支持用户识别、事件提醒、问答等

---

## 聊天接口 (WebSocket)

### 基本信息

- **接口路径**: `/api/chat/chat/{person_id}`
- **协议**: WebSocket
- **编码**: UTF-8
- **数据格式**: JSON

### 连接URL

```
ws://your-host/api/chat/chat/{person_id}
```

### 请求参数

#### Path参数

| 参数名    | 类型   | 必填 | 说明                           |
| --------- | ------ | ---- | ------------------------------ |
| person_id | string | 是   | 角色ID，用于标识对话的宠物角色 |

#### 消息格式 (客户端发送)

客户端连接后，需要发送JSON格式的消息：

```json
{
  "user_id": "string", // 用户ID（必填）
  "message": "string", // 用户消息（必填，1-1000字符）
  "person_id": "string", // 角色ID（可选，未识别时为null）
  "session_id": "string", // 会话ID（可选）
  "context": {
    // 额外上下文信息（可选）
    "key": "value"
  },
  "owner_name": "string", // 主人姓名（可选，用于Person信息提取）
  "audio_data": "string", // 音频数据（可选，base64编码）
  "audio_format": "string" // 音频格式（可选，如wav、mp3等）
}
```

**字段说明**：

| 字段         | 类型   | 必填 | 说明                             |
| ------------ | ------ | ---- | -------------------------------- |
| user_id      | string | 是   | 用户唯一标识                     |
| message      | string | 是   | 用户输入的消息内容               |
| person_id    | string | 否   | 角色ID，如果未识别可传null       |
| session_id   | string | 否   | 会话ID，用于维持同一会话上下文   |
| context      | object | 否   | 额外上下文信息                   |
| owner_name   | string | 否   | 主人姓名，用于音频Person信息提取 |
| audio_data   | string | 否   | 音频数据的base64编码             |
| audio_format | string | 否   | 音频格式，如"wav"、"mp3"         |

### 响应格式 (服务端推送)

服务端以流式方式推送JSON消息，每行一个JSON对象：

#### 1. 开始消息 (type: "start")

```json
{
  "type": "start",
  "data": {
    "content": "开始处理您的请求...",
    "request_id": "string",
    "has_audio": false,
    "metadata": {
      "intent": "string", // 意图类型（1=日常对话, 2=讲故事, 3=情感陪伴, 4=天气查询, 5=记忆相关, 0=音频处理）
      "source": "string"
    }
  }
}
```

#### 2. 内容块 (type: "chunk")

```json
{
  "type": "chunk",
  "data": {
    "content": "string", // AI回复内容片段
    "metadata": {
      "finished": false
    }
  }
}
```

#### 3. 结束消息 (type: "end")

```json
{
  "type": "end",
  "data": {
    "content": "",
    "metadata": {
      "response_length": 150,
      "engine": "parallel",
      "source": "chat_response"
    }
  }
}
```

#### 4. 错误消息 (type: "error")

```json
{
  "type": "error",
  "data": {
    "error": "错误信息描述"
  }
}
```

### 功能特性

1. **意图自动识别** - 自动识别用户意图（日常对话、讲故事、情感陪伴、天气查询、记忆相关）
2. **流式响应** - 实时流式返回AI回复，提升用户体验
3. **记忆管理** - 自动保存和检索对话记忆
4. **情感陪伴** - 理解和回应用户的情感表达
5. **天气查询** - 支持天气相关查询
6. **故事生成** - 讲故事功能
7. **音频Person提取** - 从音频内容中提取用户信息（姓名、关系）

### 使用示例

#### JavaScript/WebSocket 客户端示例

```javascript
// 建立WebSocket连接
const personId = 'user_123'
const ws = new WebSocket(`ws://localhost:8000/api/chat/chat/${personId}`)

// 连接打开
ws.onopen = () => {
  console.log('WebSocket连接已建立')

  // 发送消息
  const message = {
    user_id: 'user_123',
    message: '你好，今天天气怎么样？',
    person_id: personId,
    owner_name: '张三',
  }

  ws.send(JSON.stringify(message))
}

// 接收消息
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case 'start':
      console.log('开始处理:', data.data)
      break
    case 'chunk':
      // 实时显示AI回复
      console.log(data.data.content)
      break
    case 'end':
      const responseLength = data.data.metadata?.response_length || 0
      console.log('接收完成，响应长度:', responseLength, '字符')
      break
    case 'error':
      console.error('错误:', data.data.error)
      break
  }
}

// 连接关闭
ws.onclose = () => {
  console.log('WebSocket连接已关闭')
}

// 连接错误
ws.onerror = (error) => {
  console.error('WebSocket错误:', error)
}
```

#### Python/WebSocket 客户端示例

```python
import asyncio
import websockets
import json

async def chat_client():
    uri = "ws://localhost:8000/api/chat/chat/user_123"

    async with websockets.connect(uri) as websocket:
        # 发送消息
        message = {
            "user_id": "user_123",
            "message": "你好，给我讲个故事",
            "person_id": "user_123"
        }

        await websocket.send(json.dumps(message, ensure_ascii=False))

        # 接收响应
        full_response = ""
        async for message in websocket:
            data = json.loads(message)

            if data["type"] == "chunk":
                content = data["data"]["content"]
                full_response += content
                print(content, end="", flush=True)
            elif data["type"] == "end":
                response_length = data['data'].get('metadata', {}).get('response_length', 0)
                print(f"\n\n完成！响应长度: {response_length} 字符")
                break
            elif data["type"] == "error":
                print(f"\n错误: {data['data']['error']}")
                break

# 运行客户端
asyncio.run(chat_client())
```

---

## 唤醒接口 (HTTP POST)

### 基本信息

- **接口路径**: `/api/wake/response`
- **协议**: HTTP/HTTPS
- **方法**: POST
- **Content-Type**: application/json
- **响应类型**: Server-Sent Events (SSE) 流式响应

### 请求参数

#### 请求体 (JSON)

```json
{
  "user_id": "string", // 用户ID（必填）
  "person_id": "string", // 角色ID（可选，识别成功时有值）
  "message": "string", // 用户消息或问题（可选）
  "owner_name": "string", // 主人姓名（可选，用于询问时使用）
  "context": {
    // 额外上下文信息（可选）
    "key": "value"
  }
}
```

**字段说明**：

| 字段       | 类型   | 必填 | 说明                           |
| ---------- | ------ | ---- | ------------------------------ |
| user_id    | string | 是   | 用户唯一标识                   |
| person_id  | string | 否   | 角色ID，如果声纹识别成功则有值 |
| message    | string | 否   | 用户的消息或问题               |
| owner_name | string | 否   | 主人姓名，用于生成个性化询问   |
| context    | object | 否   | 额外上下文信息                 |

### 响应格式

采用Server-Sent Events (SSE)流式响应，每行一个JSON对象：

#### 响应类型

**1. 开始消息 (type: "start")**

```json
{
  "type": "start",
  "data": {
    "content": "",
    "request_id": "string",
    "source": "wake_response",
    "metadata": {
      "person_id": "string",
      "timestamp": "string",
      "time_of_day": "string"
    }
  }
}
```

**2. 内容块 (type: "chunk")**

```json
{
  "type": "chunk",
  "data": {
    "content": "回复内容片段",
    "metadata": {
      "is_appended_question": false
    }
  }
}
```

**3. 完成消息 (type: "complete")**

```json
{
  "type": "complete",
  "data": {
    "content": "完整回复内容",
    "metadata": {
      "status": "awaiting_info",
      "requires_input": true,
      "user_id": "string"
    }
  }
}
```

**4. 错误消息 (type: "error")**

```json
{
  "type": "error",
  "data": {
    "error": "错误信息"
  }
}
```

### 处理场景

唤醒接口根据用户识别状态和消息内容，有4种处理场景：

#### 场景1：识别成功 + 消息包含实际内容

**条件**：`person_id` 存在 && message不只是唤醒词（如"乐宝"）

**处理**：

1. 调用chat工作流处理用户消息
2. 生成个性化事件提醒
3. 不追加询问

**示例请求**：

```json
{
  "user_id": "user_123",
  "person_id": "father",
  "message": "今天天气怎么样？",
  "owner_name": "小明"
}
```

#### 场景2：识别成功 + 消息只是唤醒词

**条件**：`person_id` 存在 && message只是唤醒词（如"乐宝"、"乐宝乐宝"）

**处理**：

1. 只生成个性化唤醒响应
2. 包含事件播报
3. 不调用chat工作流

**示例请求**：

```json
{
  "user_id": "user_123",
  "person_id": "father",
  "message": "乐宝"
}
```

#### 场景3：未识别 + 消息包含实际内容

**条件**：`person_id` 不存在 && message包含实际内容

**处理**：

1. 调用chat工作流处理消息
2. 在响应后追加询问姓名和关系

**示例请求**：

```json
{
  "user_id": "user_456",
  "message": "现在几点了？",
  "owner_name": "小明"
}
```

#### 场景4：未识别 + 消息只是唤醒词

**条件**：`person_id` 不存在 && message只是唤醒词

**处理**：

1. 直接询问姓名和关系
2. 使用随机询问模板

**示例请求**：

```json
{
  "user_id": "user_456",
  "message": "乐宝",
  "owner_name": "小明"
}
```

### 功能特性

1. **声纹识别集成** - 通过person_id判断是否识别成功
2. **智能场景判断** - 自动判断4种处理场景
3. **事件提醒** - 包含个性化事件播报
4. **流式响应** - SSE流式输出
5. **上下文感知** - 支持时间分段（早上/中午/晚上）
6. **问答能力** - 可通过chat工作流处理用户问题

### 使用示例

#### cURL 示例

```bash
curl -X POST "http://localhost:8000/api/wake/response" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "person_id": "father",
    "message": "今天天气怎么样？",
    "owner_name": "小明"
  }'
```

#### Python 示例

```python
import requests
import json

url = "http://localhost:8000/api/wake/response"

payload = {
    "user_id": "user_123",
    "person_id": "father",
    "message": "今天天气怎么样？",
    "owner_name": "小明"
}

headers = {"Content-Type": "application/json"}

response = requests.post(url, json=payload, headers=headers, stream=True)

# 处理流式响应
for line in response.iter_lines():
    if line:
        data = json.loads(line)
        print(data)
```

#### JavaScript 示例

```javascript
async function wakeResponse() {
  const url = 'http://localhost:8000/api/wake/response'

  const payload = {
    user_id: 'user_123',
    person_id: 'father',
    message: '今天天气怎么样？',
    owner_name: '小明',
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const line = decoder.decode(value)
    const data = JSON.parse(line)
    console.log(data)
  }
}

wakeResponse()
```

---

## 接口对比

| 特性         | WebSocket聊天接口  | HTTP唤醒接口         |
| ------------ | ------------------ | -------------------- |
| **协议**     | WebSocket          | HTTP POST (SSE)      |
| **连接方式** | 长连接             | 短连接               |
| **适用场景** | 实时对话、多轮交互 | 语音唤醒、一次性响应 |
| **用户识别** | 需要传递person_id  | 通过person_id判断    |
| **意图识别** | 自动识别           | 通过chat工作流识别   |
| **事件提醒** | 不支持             | 支持                 |
| **响应方式** | 实时流式           | SSE流式              |
| **音频处理** | 支持Person信息提取 | 不支持               |
| **保存记录** | 自动保存聊天记录   | 通过chat工作流保存   |

### 何时使用哪个接口？

**使用WebSocket聊天接口**：

- 需要多轮对话
- 需要实时交互
- 需要意图自动识别
- 需要记忆管理功能
- 需要处理音频内容

**使用HTTP唤醒接口**：

- 语音唤醒场景
- 需要事件提醒
- 用户识别后的个性化问候
- 一次性问答
- 需要询问未识别用户信息

---

## 错误码说明

### WebSocket聊天接口错误

| 错误类型            | 说明                  | 处理建议                     |
| ------------------- | --------------------- | ---------------------------- |
| `connection_closed` | WebSocket连接异常关闭 | 重新建立连接                 |
| `invalid_json`      | 消息格式错误          | 检查JSON格式是否正确         |
| `missing_fields`    | 缺少必填字段          | 检查是否包含user_id和message |
| `person_not_found`  | 角色不存在            | 先初始化角色信息             |
| `llm_error`         | 大模型调用失败        | 稍后重试或联系管理员         |

### HTTP唤醒接口错误

| 错误类型              | 说明         | 处理建议            |
| --------------------- | ------------ | ------------------- |
| `invalid_request`     | 请求参数错误 | 检查请求参数        |
| `user_not_found`      | 用户不存在   | 检查user_id是否正确 |
| `service_unavailable` | 服务不可用   | 稍后重试            |
| `stream_error`        | 流式响应错误 | 重新发起请求        |

---

## 附录

### 意图类型说明

| 意图码 | 名称     | 说明                   | 示例                     |
| ------ | -------- | ---------------------- | ------------------------ |
| 0      | 音频处理 | 音频Person信息提取路径 | "我是小明"               |
| 1      | 日常对话 | 日常聊天、问候         | "你好"、"在吗"           |
| 2      | 讲故事   | 要求讲故事的请求       | "给我讲个故事"           |
| 3      | 情感陪伴 | 表达情感、寻求安慰     | "我今天不开心"           |
| 4      | 天气查询 | 询问天气相关信息       | "今天天气怎么样"         |
| 5      | 记忆相关 | 涉及过去经历的询问     | "我上次生日是什么时候？" |

### 测试工具

推荐使用以下工具测试接口：

1. **WebSocket测试**：
   - [WebSocket King](https://websocketking.com/)
   - [Postman](https://www.postman.com/) (支持WebSocket)

2. **HTTP测试**：
   - [Postman](https://www.postman.com/)
   - [cURL](https://curl.se/)
   - [HTTPie](https://httpie.io/)
