# n8n-nodes-anonamoose

n8n community node for [Anonamoose](https://github.com/Bridge-Point/anonamoose) — the LLM anonymization proxy with guaranteed PII redaction and rehydration.

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

You need a running Anonamoose instance. See the [Anonamoose repo](https://github.com/Bridge-Point/anonamoose) for setup instructions.

## Credentials

| Field | Description |
|-------|-------------|
| **Base URL** | URL of your Anonamoose management API (default: `http://localhost:3001`) |
| **API Token** | Bearer token matching the `API_TOKEN` env var on your Anonamoose server |

## Operations

### Redact Text
Sends text through Anonamoose's three-layer redaction pipeline (Dictionary, Regex, NER). Returns the redacted text, a session ID for rehydration, and detection details.

### Hydrate Text
Restores redacted text back to the original using a session ID. Use this after receiving an LLM response to put the real values back.

### Add Dictionary Entry
Adds terms to the guaranteed redaction dictionary. Dictionary entries have 100% recall — if you add a term, it will always be found and redacted.

### List Dictionary
Returns all current dictionary entries.

### Proxy Request
Forwards an OpenAI-compatible chat completion request through the Anonamoose proxy with automatic redaction and rehydration. The request is redacted before reaching the LLM, and the response is rehydrated before being returned.

### Get Stats
Returns redaction statistics from the Anonamoose instance.

## Example Workflow

1. **Trigger** (e.g., Webhook, Schedule)
2. **Anonamoose: Redact** — redact PII from incoming text
3. **OpenAI** — send redacted text to LLM
4. **Anonamoose: Hydrate** — restore original values in the response

## License

[Business Source License 1.1](./LICENSE) — (c) 2024 Bridge Point Ltd.

Non-commercial use is permitted. Commercial use requires a commercial license. Contact [ben@bridgepoint.co.nz](mailto:ben@bridgepoint.co.nz).
