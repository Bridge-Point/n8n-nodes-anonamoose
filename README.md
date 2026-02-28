# n8n-nodes-anonamoose

n8n community node for [Anonamoose](https://github.com/Bridge-Point/anonamoose) — detect and redact PII from text using a four-layer redaction pipeline (Dictionary, NER, Regex, Names).

## Compatibility

Requires n8n version 1.0 or later.

## Installation

In your n8n instance:

1. Go to **Settings > Community Nodes**
2. Click **Install a community node**
3. Enter `@bridgepoint/n8n-nodes-anonamoose`
4. Click **Install**

Or via CLI:

```bash
cd ~/.n8n
npm install @bridgepoint/n8n-nodes-anonamoose
```

## Prerequisites

A running Anonamoose instance with `API_TOKEN` configured.

## Credentials

| Field | Description |
|-------|-------------|
| **Base URL** | URL of your Anonamoose instance (default: `http://localhost:3000`) |
| **API Token** | Bearer token matching the `API_TOKEN` env var on your server |

## Operations

### Redact

Detect and replace PII with tokens.

**Parameters:**

| Field | Required | Description |
|-------|----------|-------------|
| **Text** | Yes | The text to scan and redact |
| **Locale** | No | Restrict regex patterns to AU, NZ, UK, or US (default: server default) |

**Output:**

```json
{
  "redactedText": "Call \uE000<token>\uE001 at \uE000<token>\uE001",
  "sessionId": "uuid",
  "detections": [
    { "type": "names", "category": "PERSON", "startIndex": 5, "endIndex": 15, "confidence": 0.85 }
  ]
}
```

### Rehydrate

Restore original values using a session ID from a previous redact operation.

**Parameters:**

| Field | Required | Description |
|-------|----------|-------------|
| **Text** | Yes | The redacted text to rehydrate |
| **Session ID** | Yes | The session ID returned by a previous redact operation |

**Output:**

```json
{
  "text": "Call John Smith at john@example.com"
}
```

### Dictionary Add

Add terms for guaranteed redaction. Any term added to the dictionary will always be redacted, regardless of whether the NER or regex layers would have caught it.

**Parameters:**

| Field | Required | Description |
|-------|----------|-------------|
| **Terms** | Yes | Terms to add, one per line |
| **Case Sensitive** | No | Whether matching should be case-sensitive (default: false) |
| **Whole Word** | No | Whether to match whole words only (default: false) |

### Dictionary Delete

Remove terms from the dictionary by name. Matching is case-insensitive.

**Parameters:**

| Field | Required | Description |
|-------|----------|-------------|
| **Terms** | Yes | Terms to delete, one per line |

## AI Tool Usage

This node is usable as an AI tool in n8n agent workflows. All four operations are available when the node is used as a tool.

## License

MIT
