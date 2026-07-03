# ADR 0001: Interview Agent MVP Architecture Review

Date: 2026-07-03

Status: Proposed

## Context

The `interview-agent` repository is the functional core of the AI Audit workflow. It is separate from the static AI Audit landing page and the older LaunchPad AI tools marketplace. The current audit flow is:

```text
AI Audit landing page
-> Calendly / intake
-> interview-agent
-> manual synthesis
-> client delivery
```

The current app is a small Vercel project:

```text
interview-agent/
├── index.html
├── api/
│   └── claude.js
├── package.json
└── README.md
```

`index.html` contains the entire browser app: onboarding form, chat UI, prompt construction, interview state, entity extraction, summary rendering, and JSON export. `api/claude.js` is a thin serverless proxy to Anthropic.

## Current Architecture

The frontend collects respondent profile fields, then calls `/api/claude` to generate a role-specific interview brief. During the interview, each respondent answer is sent to Claude to produce the next question. A separate Claude call extracts entities from each exchange, including processes, tools, pain points, and handoffs. At the end, the app shows a summary and lets the user download JSON or copy a transcript.

The backend currently accepts a client-supplied model, system prompt, max token value, and messages array. It validates the model against a small allowlist and forwards the request to Anthropic using `ANTHROPIC_API_KEY`.

## Assessment

The product concept is coherent and the current implementation is a useful prototype. It is not production-solid yet. The main issue is that the browser controls too much of the AI call path while the backend exposes a paid model proxy with minimal controls.

## Key Findings

1. The Anthropic proxy is too open.
   - CORS allows any origin.
   - There is no authentication or invite/session token.
   - There is no rate limiting.
   - There is no server-side request size limit.
   - The server forwards client-provided prompts and token limits.

2. The UI has an XSS risk.
   - User and model text are inserted with `innerHTML`.
   - Text should be rendered with `textContent` or escaped/sanitized before display.

3. There is no durable storage.
   - Interview state only lives in browser memory.
   - If the user refreshes or closes the tab before downloading, the transcript and extracted data are lost.

4. There is no client/interview isolation.
   - The app collects sensitive operational data but has no per-client access control, interview IDs, consent handling, or retention model.

5. Form validation is ineffective.
   - Required fields are replaced with fallback strings before validation, so missing role/department values can pass.

6. Entity extraction can race the final summary.
   - Extraction runs in the background and is not awaited.
   - The final summary can miss the last exchange if extraction is still running.

7. LLM JSON parsing is brittle.
   - Brief and extraction flows rely on prompt instructions and `JSON.parse`.
   - Extraction failures are silently dropped.

8. Prompt injection is possible.
   - Respondent-provided fields are interpolated directly into prompts.
   - A respondent can intentionally or accidentally influence system behavior.

## Decision

For MVP, keep the product focused on the AI Audit interview workflow, but move control of the AI interaction from the browser to the backend.

The browser should submit structured actions:

```text
start interview
send answer
complete interview
download/export result
```

The backend should own:

```text
prompt templates
model selection
token limits
request validation
rate limits
session or invite validation
transcript persistence
entity extraction persistence
export generation
```

## MVP Requirements

The following are required before using this with real clients:

1. Lock down `/api/claude`.
   - Add an invite/session token or equivalent access mechanism.
   - Restrict CORS to known origins.
   - Add basic rate limits.
   - Enforce server-side max tokens and request size limits.

2. Make rendering safe.
   - Remove unsafe `innerHTML` insertion for user/model content.
   - Use text nodes or an escaping/sanitization layer.

3. Fix core flow correctness.
   - Validate required onboarding fields before assigning fallback values.
   - Await final entity extraction or run a final extraction/synthesis pass before showing summary.

4. Add minimal persistence.
   - Store interview ID, respondent profile, transcript, extracted entities, cost metadata, and completion status.
   - Provide a controlled admin/download path for completed interview data.

5. Keep prompts server-controlled.
   - The client should not send arbitrary `system` prompts to the backend.
   - The client should send respondent profile and answer events.

## Can Wait Until After MVP

These are useful, but not required for the first real MVP:

1. Full user accounts and team permissions.
2. Admin dashboards and analytics.
3. Multi-tenant billing.
4. Sophisticated prompt version management UI.
5. Automated synthesis report generation.
6. Complex retention/compliance workflows.
7. Shared component libraries or a frontend framework migration.

## Proposed MVP Architecture

```text
Browser
  -> POST /api/interviews/start
  -> POST /api/interviews/:id/messages
  -> POST /api/interviews/:id/complete
  -> GET  /api/interviews/:id/export

Backend
  -> validates invite/session
  -> loads server-side prompt templates
  -> calls Anthropic
  -> persists transcript and entities
  -> returns next interviewer message
```

Minimal storage can be a hosted database or a Vercel-compatible managed store. The first schema can be simple:

```text
interviews
- id
- invite_token_hash
- respondent_profile_json
- status
- total_cost
- created_at
- completed_at

messages
- id
- interview_id
- role
- content
- created_at

extracted_entities
- id
- interview_id
- type
- payload_json
- source_message_id
- created_at
```

## Implementation Sequence

1. Patch immediate frontend risks.
   - Replace unsafe rendering.
   - Fix validation.
   - Await final extraction.

2. Replace `/api/claude` with purpose-built endpoints.
   - Start interview.
   - Send message.
   - Complete interview.
   - Export interview.

3. Add persistence.
   - Store transcript and extracted entities automatically.
   - Keep JSON export, but generate it from stored data.

4. Add access controls.
   - Use signed invite links or per-interview tokens.
   - Add rate limits and origin restrictions.

5. Improve model reliability.
   - Use structured outputs or schema validation where available.
   - Add retries/fallbacks for extraction failures.

## Consequences

This keeps the MVP small while closing the biggest risk: an open browser-controlled model proxy. It also protects interview data from accidental loss and gives the audit workflow a durable source of truth.

The tradeoff is that the backend becomes more than a simple proxy. That is appropriate because the AI Audit workflow depends on controlled prompts, data retention, and reliable exports.

## Open Questions

1. What storage provider should be used for MVP?
2. Should respondents access interviews through signed invite links, one-time codes, or authenticated accounts?
3. Who needs admin/export access to completed interviews?
4. How long should interview transcripts and extracted entities be retained?
5. Should synthesis remain manual for MVP, or should the app generate a first-pass audit report?
