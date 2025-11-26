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
