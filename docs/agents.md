# Agents in AIStylia
- Conflicting times: auto-resolve by priority rules; flag edits if required.


---


## Agent: CampaignRunner / AdAgent


**Purpose:** Interface with ad platforms (Meta Ads, Google Ads) to create campaigns and monitor basic metrics.


**Primary responsibilities:**
- Translate ContentVariant into a campaign spec (creative assets, copy, targeting rules).
- Call the ad API (or mock adapter in dev) to create ads.
- Poll metrics periodically and write aggregated metrics to memory.


**Interface:**
- `runCampaign(campaignSpec) -> CampaignResult` (with mock adapter for development)


**Memory usage:**
- Campaign status, cost, impressions, clicks, leads.


**Failure modes / remediation:**
- Ad API rejects creative: fallback to next-best variant, or pause and notify.


---


## Agent: LeadQualifier


**Purpose:** Accept inbound lead data and apply qualification logic using heuristics or AI.


**Primary responsibilities:**
- Score leads using a rule engine: `score = f(fields)` or `LLM-based scoring`.
- Route leads with high scores to CRM/Webhook or notify via dashboard.


**Interface:**
- `qualifyLead(leadData) -> {score, reason, route}`


**Memory usage:**
- Lead history, dispositions.


**Failure modes / remediation:**
- Missing fields: request clarifying message via InboxAgent; otherwise set default low-confidence and notify human.


---


## Agent: Analytics Agent


**Purpose:** Process raw metrics and create human-friendly insights.


**Primary responsibilities:**
- Take campaign metrics and compute KPIs: CPL, CTR, conversion rate, ROAS.
- Using LLM, produce one-line insights and one suggested improvement (e.g. "Pause audience X, increase budget for creative Y").


**Interface:**
- `generateInsights(metrics) -> [Insight]`
- `Insight`: `{text, confidence, suggestedAction}`


**Memory usage:**
- KPI history, insights history.


**Failure modes / remediation:**
- Insufficient signal: return "insufficient data" insight and recommend observational period.


---


## Orchestrator / Controller


**Purpose:** Central router that accepts tasks, calls agents in the right order, and handles retries and logging.


**Responsibilities:**
- Accept tasks in a FIFO queue.
- Execute agent pipelines (e.g., brief → Content Agent → Planner → CampaignRunner).
- Handle errors (exponential backoff, escalation).
- Write structured logs for evaluation.


**Example Task JSON:**

{ "taskId": "task-123", "type": "create_campaign", "payload": { ... } }


---


## Example: End-to-end flow (message)


1. User submits brief via Dashboard.
2. Orchestrator enqueues `create_campaign`.
3. ContentAgent generates 5 variants.
4. Planner schedules top variant and asks CampaignRunner to create campaign (mock adapter in dev).
5. CampaignRunner simulates campaign creation, AnalyticsAgent writes KPIs.
6. LeadQualifier monitors inbound lead stream and scores leads.
7. InboxAgent handles messages in real-time and escalates low-confidence replies.


---


## Suggested thresholds and config (config/defaults.json)

{ "inbox": { "confidence_threshold": 0.7 }, "retry": {"max_retries": 3, "backoff_seconds": 2}, "content": {"variants": 5} }


---


## Notes on testing & evaluation
- Unit tests for each agent must mock external AI and ad APIs.
- Integration tests should use the mock adapters and a sample brief dataset.
- Use the evaluation notebook to replay a case study and compute KPIs.
