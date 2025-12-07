# VPR (Voice Print Recognition) API Integration

This directory contains the VPR API integration for voice print recognition and speaker identification.

## 📁 File Structure

```
vpr/
├── index.ts       # VprApi class - main interface for VPR operations
├── utils.ts       # Network API functions - HTTP calls to VPR service
├── types.ts       # TypeScript type definitions
└── README.md      # This file
```

## 🚀 Quick Start

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Enable/disable VPR service
VPR_ENABLED=true

# VPR service base URL
VPR_BASE_URL=http://cafuuchino.studio26f.org:22481/api/v4/vpr
```

### 2. Basic Usage

```typescript
import { VprApi } from './vpr'

// Initialize VPR API for a user
const vprApi = new VprApi(userId, 0.6) // userId: bigint, threshold: 0.6 (default)

// Register a voice
const audioBlob = new Blob([audioData], { type: 'audio/wav' })
const registerResult = await vprApi.register(audioBlob, '张三', '本人')

// Recognize a voice
const recognizeResult = await vprApi.recognize(audioBlob)

if (recognizeResult.success && 'person_name' in recognizeResult) {
  console.log(`Recognized: ${recognizeResult.person_name}`)
  console.log(`Confidence: ${recognizeResult.confidence}`)
}
```

## 📚 API Reference

### VprApi Class

#### Constructor
```typescript
constructor(userId: bigint, threshold = 0.6)
```

**Parameters:**
- `userId`: User ID (bigint)
- `threshold`: Recognition threshold (0.0-1.0, default: 0.6)

#### Methods

##### `register(audioFile, personName, relationship)`
Register a voice print for a person.

```typescript
async register(
  audioFile: File | Blob,
  personName: string,
  relationship = '朋友'
): Promise<VprRegisterResponse | VprErrorResponse>
```

**Parameters:**
- `audioFile`: Audio file (File or Blob)
- `personName`: Name of the person
- `relationship`: Relationship to user (default: "朋友")

**Returns:**
```typescript
{
  success: boolean
  message: string
  user_id: string
  person_name: string
  voice_id: string | null
  registration_time: string
}
```

##### `recognize(audioFile, threshold?)`
Recognize a person from their voice.

```typescript
async recognize(
  audioFile: File | Blob,
  threshold?: number
): Promise<VprRecognizeResponse | VprErrorResponse>
```

**Parameters:**
- `audioFile`: Audio file to recognize
- `threshold`: Optional custom threshold (uses default if not provided)

**Returns:**
```typescript
{
  success: boolean
  message: string
  user_id?: string
  voice_id?: string
  person_id?: string
  person_name?: string
  is_user?: boolean
  confidence?: number
  similarity?: number
  processing_time_ms?: number
}
```

##### `getPersons()`
Get all persons registered for this user.

```typescript
async getPersons(): Promise<VprPersonsResponse | VprErrorResponse>
```

##### `getStats()`
Get statistics for this user.

```typescript
async getStats(): Promise<VprUserStatsResponse | VprErrorResponse>
```

##### `deletePerson(personId)`
Delete a person and their voice prints.

```typescript
async deletePerson(personId: string): Promise<VprDeletePersonResponse | VprErrorResponse>
```

#### Properties

- `threshold`: Get/set recognition threshold
- `userId`: Get user ID
- `isEnabled`: Check if VPR is enabled

## 🔌 Integration with Chat API

To integrate VPR into the main chat API workflow:

### Step 1: Add VprApi to ApiWrapper

```typescript
// In src/chat/api/index.ts
import { VprApi } from './vpr'

export class ApiWrapper {
  private readonly _asrApi: AsrApi
  private readonly _difyApi: DifyApi
  private readonly _ttsApi: TtsApi
  private readonly _vprApi: VprApi // Add this

  constructor(
    private readonly _wsClient: ElysiaWS,
    private readonly _userId: bigint,
    private readonly _nickname: string,
    private readonly _deviceId: string,
  ) {
    this._asrApi = new AsrApi(this._wsClient.id, this._userId, this._deviceId)
    this._difyApi = new DifyApi(this._userId, this._nickname)
    this._ttsApi = new TtsApi(this._wsClient.id, this._userId)
    this._vprApi = new VprApi(this._userId, 0.6) // Add this
  }
}
```

### Step 2: Add Voice Recognition Logic

```typescript
// Add a method to process audio for voice recognition
async recognizeSpeaker(audioData: ArrayBuffer): Promise<void> {
  if (!this._vprApi.isEnabled) {
    log.warn('VPR', 'VPR is disabled, skipping speaker recognition')
    return
  }

  try {
    // Convert audio data to Blob
    const audioBlob = new Blob([audioData], { type: 'audio/wav' })
    
    // Recognize the speaker
    const result = await this._vprApi.recognize(audioBlob)
    
    if (result.success && 'person_name' in result) {
      log.info('VPR', `Speaker recognized: ${result.person_name}`)
      // You can use this information to personalize the response
      // or add context to the conversation
    }
  } catch (error) {
    log.error('VPR', `Error recognizing speaker: ${error}`)
  }
}
```

### Step 3: Integrate with ASR Workflow

```typescript
// In the ASR onFinish callback
this._asrApi.onFinish = async (recognized) => {
  // Optionally perform speaker recognition
  await this.recognizeSpeaker(audioData)
  
  // Continue with existing logic
  if (this._outputText) {
    this._wsClient.send(
      new WsOutputTextCompleteResponseSuccess(
        this._wsClient.id,
        this._wsClient.id,
        this._conversationId,
        'user',
        recognized,
      ),
    )
  }
  
  // Rest of the logic...
}
```

## 🎯 Supported Audio Formats

The VPR service supports the following audio formats:
- `.wav`
- `.mp3`
- `.flac`
- `.m4a`
- `.ogg`
- `.aac`

## 🔧 Utility Functions

You can also use the utility functions directly for advanced usage:

```typescript
import {
  registerVoice,
  recognizeVoice,
  getUsers,
  getUserPersons,
  getUserStats,
  getGlobalStats,
  clearCache,
  deleteUser,
  deletePerson
} from './vpr'

// Direct API calls
const result = await registerVoice(audioBlob, 'user123', '张三', '本人')
```

## 📊 Response Types

All responses follow a consistent pattern:

**Success Response:**
```typescript
{
  success: true,
  message: string,
  // ... additional data
}
```

**Error Response:**
```typescript
{
  success: false,
  message: string,
  error?: string
}
```

## 🛡️ Error Handling

Always check the `success` field before accessing response data:

```typescript
const result = await vprApi.recognize(audioBlob)

if (result.success) {
  if ('person_name' in result) {
    // Success with recognition
    console.log(`Recognized: ${result.person_name}`)
  }
} else {
  // Handle error
  console.error(`Recognition failed: ${result.message}`)
}
```

## 🔍 Debugging

Enable debug logging by checking the log output:

```typescript
// VPR logs use the 'VPR' tag
log.info('VPR', 'Your message here')
```

## 📝 Notes

- The VPR service must be running and accessible at the configured URL
- Set `VPR_ENABLED=false` to disable VPR without removing the code
- Recognition threshold (0.0-1.0) controls the strictness of matching:
  - Lower values: More permissive, may have false positives
  - Higher values: More strict, may miss valid matches
  - Recommended: 0.5-0.7

## 🤝 Contributing

When adding new VPR features:
1. Add type definitions to `types.ts`
2. Add network functions to `utils.ts`
3. Add class methods to `index.ts` if needed
4. Update this README

## 📄 License

Same as the main project license.

