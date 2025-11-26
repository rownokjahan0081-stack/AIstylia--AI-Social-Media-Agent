# AIStylia — Autonomous Social Media Agent


**Project:** Kaggle Agents Intensive Capstone — Social Media Management & Customer Response Automation AI Agent 


**Author:** Ekram 


**Live demo:** https://www.aistylia.com/
**Repo:** https://github.com/rownokjahan0081-stack/AIstylia--AI-Social-Media-Agent


---


## Summary
It is a multi-agent system that automates social media operations: inbox replies, content generation, campaign scheduling, ad creation (mock adapter in dev), lead qualification, and insight generation. This project demonstrates a tool-calling, memory-enabled, agentic system suitable for real-world SMB use cases and satisfies the Kaggle capstone guidelines.


---


## Features
- Modular agents (Inbox, Content, Planner, CampaignRunner, LeadQualifier, Analytics)
- AI integrations (Gemini, local Python normalizer)
- Dashboard UI (React + TypeScript)
- Webhook handler (Facebook webhook sample)
- Mock adapters for ad platforms (safe for dev without real ad account keys)
- Logging and memory store (SQLite by default)


---


## Quickstart (Development)


### Prerequisites
- Node >= 18, npm or yarn
- Python 3.11+
- (Optional) Docker


### 1) Clone the repo
```bash
git clone https://github.com/rownokjahan0081-stack/AIstylia--AI-Social-Media-Agent.git
cd AIstylia--AI-Social-Media-Agent

# Autonomy Demonstration

This section demonstrates how this system runs **fully autonomously** (no manual intervention) to take a business brief, generate content, schedule it, create a mock campaign, handle incoming messages, qualify leads, and produce evaluation metrics.

## What this demo does (end-to-end, automated)
1. Orchestrator accepts a brief (from file `demo_case/brief.json`).
2. ContentAgent generates 5 post/ad variants and stores them in memory.
3. Planner chooses the top variant and creates a schedule.
4. CampaignRunner (mock adapter) creates a simulated campaign and emits sample metrics over a short run.
5. InboxAgent processes simulated inbound messages (`demo_case/simulated_inbox.json`) and replies using the Gemini mock adapter.
6. LeadQualifier scores simulated leads and writes qualified leads to `evaluation/leads.json`.
7. AnalyticsAgent computes KPIs and writes `evaluation/metrics.json`.
8. Notebook `notebooks/kaggle_capstone.ipynb` reads evaluation files and presents results (graphs + insight text).

All pipeline steps are automated by `scripts/demo_run.sh`.

## Files added for the autonomy demo
- `scripts/demo_run.sh` — single entrypoint: runs orchestrator steps in sequence (uses mock adapters)
- `demo_case/brief.json` — example brief used for generation
- `demo_case/simulated_inbox.json` — simulated incoming messages/leads
- `mock_ad_adapter/` — mock ad API that simulates campaign creation and metrics
- `evaluation/metrics.json` — output created by the demo (sample format)
- `evaluation/leads.json` — lead qualification output

## How reviewers can run the demo
(Unix / macOS / WSL — adjust for Windows.)

1. Install dependencies (frontend + Python)
   ```bash
   # from repo root
   npm install
   cd ai-normalizer
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cd ..

2. Start the mock backend (local mock server):

npm run start:dev
# or if your project uses a specific server file:
# node api/mock_server.js


3. Run the full autonomous demo:

bash scripts/demo_run.sh


4. Open the notebook for results:

Open notebooks/kaggle_capstone.ipynb in Jupyter or convert to Kaggle Notebook and run all cells.

Or inspect evaluation/metrics.json and evaluation/leads.json.

What reviewers should expect to see

evaluation/metrics.json containing KPIs: CPL, CTR, conversions, spend, impressions, leads.

evaluation/leads.json containing lead records and qualification scores.

Console logs showing automated steps: content generation, scheduling, campaign creation, inbox replies.

Notebook graphs showing baseline vs agent metrics (CPL bar chart, time saved, leads qualified).


---

# B. DEMO FILES — Exact contents (create these files in your repo)

Create directories and files exactly as named.

## 1) `scripts/demo_run.sh` (make executable: `chmod +x scripts/demo_run.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "ROOT_DIR=${ROOT_DIR}"

# 1. Ensure backend mock server is running (assumes npm start was launched separately)
echo "== DEMO RUN: Starting autonomous demo =="

echo "1) Step: Generate content variants from brief"
node ./scripts/run_content_agent_mock.js demo_case/brief.json demo_case/content_variants.json

echo "2) Step: Create schedule from top variant"
node ./scripts/run_planner_mock.js demo_case/content_variants.json demo_case/schedule.json

echo "3) Step: Create a mock campaign (simulates ad platform)"
node ./mock_ad_adapter/create_campaign_mock.js demo_case/schedule.json evaluation/campaign_run.json

echo "4) Step: Simulate inbound messages processing and auto replies"
node ./scripts/run_inbox_agent_mock.js demo_case/simulated_inbox.json evaluation/inbox_replies.json

echo "5) Step: Run lead qualifier on simulated leads"
node ./scripts/run_lead_qualifier_mock.js demo_case/simulated_leads.json evaluation/leads.json

echo "6) Step: Generate analytics & KPIs"
node ./scripts/generate_metrics_mock.js evaluation/campaign_run.json evaluation/leads.json evaluation/metrics.json

echo "== DEMO RUN: Completed =="
echo "Evaluation outputs saved to evaluation/metrics.json and evaluation/leads.json"
