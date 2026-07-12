# Customer Chat Portal

A polished chat UI for your booking system that can send customer messages to an n8n workflow and display the reply.

## How to use

1. Open the page in your browser.
2. Send a message and the reply will appear in the bot bubble.

## n8n response format

Your workflow should return JSON like this:

```json
{
  "reply": "Hello! I can help with your booking."
}
```

## Run locally

From this folder, start a simple server:

```bash
python -m http.server 3000
```

Then open http://localhost:3000.
