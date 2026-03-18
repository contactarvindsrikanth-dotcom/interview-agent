# Interview Agent — LaunchPad AI

AI-powered process discovery interview agent for the AI Audit service.

## Overview

This is a standalone interview agent that conducts AI-guided conversations with employees to understand how work flows through their organization. Part of the LaunchPad AI AI Audit service.

## Architecture

```
interview-agent/
├── index.html          # Frontend - Chat interface
├── api/
│   └── claude.js       # Serverless function - Anthropic API proxy
├── package.json        # Project config
└── README.md           # This file
```

## How It Works

1. Employee fills out a brief onboarding form (name, role, department, etc.)
2. AI generates a customized interview brief based on their role
3. AI conducts a ~10 turn conversational interview
4. Entities (processes, tools, pain points, handoffs) are extracted in real-time
5. Summary is displayed at the end with download option

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   cd interview-agent
   vercel
   ```

4. Set environment variable:
   ```bash
   vercel env add ANTHROPIC_API_KEY
   ```
   Enter your Anthropic API key when prompted.

5. Redeploy to apply env var:
   ```bash
   vercel --prod
   ```

### Environment Variables Required

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (starts with `sk-ant-`) |

## Cost Estimate

- Model: Claude Sonnet 4 ($3 input / $15 output per 1M tokens)
- Estimated cost per interview: ~$0.05-0.09
- 100 interviews/month ≈ $5-9/month

## Usage Flow

```
ai-audit.vercel.app (landing) 
    → Calendly (discovery call)
    → Intake Form (company info)
    → interview-agent.vercel.app (THIS)
    → Synthesis Engine (manual)
    → Delivery
```

## Local Development

```bash
# Set env var
export ANTHROPIC_API_KEY=sk-ant-...

# Run locally
vercel dev
```

Then open http://localhost:3000

## Files

### index.html
Single-page frontend with:
- Onboarding form
- Chat interface
- Real-time entity extraction
- Summary view with download

### api/claude.js
Vercel serverless function that:
- Proxies requests to Anthropic API
- Validates model selection
- Handles CORS
- Returns usage stats for cost tracking

## Notes

- Form has sample data pre-filled for testing — clear before production
- Dev panel (bottom right) shows API cost and debug info
- Interview data can be downloaded as JSON at the end
