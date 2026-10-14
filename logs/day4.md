# Day 4 Log: Adversarial Stress & Hallucination Breakdown

## Focus
Pushing the load further: multi-stakeholder deadlocks, edge cases across stages, network unreliability, and API guardrails.

## What Was Attempted
- Created `data/adversarial_board.csv` with 15 complex candidate situations:
  - Competing offers with 24-hour exploding deadlines.
  - Split debrief decisions (2 Yes / 2 No) waiting on hiring managers.
  - Ghosted candidates unresponsive to 3 sequential emails.
  - Relocation and visa sponsorship dependencies.
  - Passive-aggressive or absent recruiter notes.
- Simulated external network latency, token limits, and absent API keys.

## What Broke & What Failed
1. **JSON Markdown Escaping:** When calling the Gemini API, the response occasionally wrapped the JSON payload in markdown fences (` ```json\n{...}\n``` `), causing `JSON.parse` to throw syntax errors.
2. **Offline Vulnerability:** When running tests in CI without a funded `GEMINI_API_KEY`, the entire suite failed, rendering the tool unusable offline.
3. **Tone Inversion:** For ghosted candidates who had stopped replying for 12 days, an unconstrained prompt drafted overly aggressive messages accusing the candidate of being late.

## AI Usage & Iteration
- **Robust JSON Extraction:** Built regex strip routines to safely parse JSON even when wrapped in markdown code blocks.
- **Defensive Deterministic Fallback Engine:** Implemented `generateDeterministicActionPlan()`. When `GEMINI_API_KEY` is not present, or if an API call fails or encounters a 429 rate limit, the system gracefully falls back to intelligent, context-aware rule templates. Zero crashes, zero hangs, 100% offline capability.
- **Empathetic Guardrails:** Updated `directive.md` with explicit instructions for unresponsive candidates: draft gentle, low-friction check-ins that offer graceful closure rather than demanding immediate answers.

## Unlearning Reflection
- **Habit Dropped:** *Treating external APIs as infallible dependencies.*
- **New Approach:** **Defensive AI Engineering.** Always design an immediate, zero-latency deterministic fallback. The user must never face a blank screen because an external LLM server timed out.
