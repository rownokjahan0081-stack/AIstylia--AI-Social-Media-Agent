# Autonomy Demonstration (Required by Kaggle)

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
