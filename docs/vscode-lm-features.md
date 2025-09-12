# VS Code LM Provider: Image and Thinking Support

This document describes the enhanced image and thinking capabilities added to the VS Code Language Model provider.

## Overview

The VS Code LM provider has been enhanced with two key features:
- **Enhanced Image Support** (`enableImages` flag)
- **Thinking/Reasoning Support** (`enableThinking` flag)

These features provide better integration with image-capable models and support for step-by-step reasoning patterns.

## Image Support

### Feature Flag: `enableImages`

When `enableImages` is set to `true` in the request metadata, the provider offers enhanced image handling:

```typescript
const stream = handler.createMessage(systemPrompt, messages, {
  taskId: "example",
  enableImages: true
});
```

### Capabilities

- **Enhanced Placeholders**: More descriptive text placeholders for images
- **Better Token Counting**: Accurate token estimation for image content
- **Multiple Formats**: Support for both base64 and URL image sources
- **Graceful Fallbacks**: Proper handling when image support is disabled

### Image Placeholder Format

- Base64 images: `[Image (base64): image/png not supported by VSCode LM API]`
- URL images: `[Image (URL): not supported by VSCode LM API]`
- Unknown sources: `[Image (Unknown source-type): unknown media-type not supported by VSCode LM API]`

## Thinking Support

### Feature Flags: `enableThinking` and `thinking`

Thinking support can be enabled in two ways:

1. **Simple flag**:
```typescript
const stream = handler.createMessage(systemPrompt, messages, {
  taskId: "example",
  enableThinking: true
});
```

2. **Detailed configuration**:
```typescript
const stream = handler.createMessage(systemPrompt, messages, {
  taskId: "example",
  thinking: {
    enabled: true,
    maxTokens: 1000,
    maxThinkingTokens: 500
  }
});
```

### Capabilities

- **Enhanced Prompting**: System prompts are enhanced to encourage step-by-step reasoning
- **Thinking Markers**: Support for `<thinking>...</thinking>` tags in responses
- **Reasoning Streams**: Yields `reasoning` type chunks for thinking content
- **Fallback Support**: Graceful handling when thinking is disabled

### Streaming Output

When thinking is enabled, the provider yields two types of chunks:

```typescript
// Reasoning/thinking content
{
  type: "reasoning",
  text: "I need to solve this step by step..."
}

// Regular response content
{
  type: "text", 
  text: "The answer is 42."
}
```

## Implementation Details

### VS Code LM Limitations

Since the VS Code Language Model API doesn't natively support:
- Image inputs (only text)
- Reasoning/thinking modes

The implementation provides:
- **Image Placeholders**: Descriptive text replacements for images
- **Simulated Thinking**: Enhanced prompts + response parsing for thinking patterns

### Backward Compatibility

All features are:
- **Opt-in**: Disabled by default
- **Non-breaking**: Existing code continues to work unchanged
- **Graceful**: Proper fallbacks when features are disabled

## Usage Examples

### Basic Image Handling
```typescript
const messages = [{
  role: "user",
  content: [
    { type: "text", text: "What's in this image?" },
    { 
      type: "image", 
      source: { 
        type: "base64", 
        media_type: "image/png",
        data: "..." 
      } 
    }
  ]
}];

const stream = handler.createMessage("You are a helpful assistant", messages, {
  taskId: "image-analysis",
  enableImages: true
});
```

### Thinking-Enabled Reasoning
```typescript
const messages = [{
  role: "user", 
  content: "Solve this complex math problem step by step"
}];

const stream = handler.createMessage("You are a helpful assistant", messages, {
  taskId: "math-problem",
  enableThinking: true
});

for await (const chunk of stream) {
  if (chunk.type === "reasoning") {
    console.log("Thinking:", chunk.text);
  } else if (chunk.type === "text") {
    console.log("Response:", chunk.text);
  }
}
```

## Testing

Comprehensive tests cover:
- Image handling with and without `enableImages`
- Thinking support with various configurations
- Token counting for image content
- Fallback scenarios when features are disabled
- Mixed content handling

## Future Enhancements

Potential improvements include:
- Native VS Code LM image support (when available)
- More sophisticated thinking pattern detection
- Configurable image placeholder formats
- Integration with VS Code's native reasoning capabilities (when available)