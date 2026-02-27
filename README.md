# n8n-nodes-anonamoose

n8n community node for [Anonamoose](https://github.com/nickkemp/anonamoose) — detect and redact PII from text using a four-layer redaction pipeline (Dictionary, NER, Regex, Names).

## Installation

In your n8n instance:

1. Go to **Settings > Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-anonamoose`
4. Click **Install**

Or via CLI:

```bash
cd ~/.n8n
npm install n8n-nodes-anonamoose
```

## Prerequisites

A running Anonamoose instance with `API_TOKEN` configured.

## Credentials

| Field | Description |
|-------|-------------|
| **Base URL** | URL of your Anonamoose instance (default: `http://localhost:3000`) |
| **API Token** | Bearer token matching the `API_TOKEN` env var on your server |

## Node: Anonamoose

Sends text to the `/api/v1/redact` endpoint and returns the redacted text, a session ID, and detection details.

**Parameters:**

| Field | Required | Description |
|-------|----------|-------------|
| **Text** | Yes | The text to scan and redact |
| **Locale** | No | Restrict regex patterns to AU, NZ, UK, or US |

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

This node is also usable as an AI tool in n8n agent workflows.

## License

MIT
