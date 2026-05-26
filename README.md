# StudyHelper

A **premium, modern web‑app** for civil‑service exam preparation.  The app combines a React/Vite frontend with a FastAPI backend to provide AI‑generated, high‑density study insights.  Recent updates introduce a **Multi‑Dimensional Analytical Matrix** that lets users drill into content across several analytical dimensions (Legal/Polity, Socio‑Economic, Art & Culture, Historiography, Eco/Environment, PYQ & Mains Focus).

---

## Table of Contents
- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **Dynamic SidePanel** with a two‑tier dimensional selector grid (core actions + analytical dimensions).
- **Glassmorphic load animations** that overlay the target text card during AI rewriting.
- **Follow‑up insights**: a sticky input at the bottom of the SidePanel, allowing custom user queries that are streamed back into a new "💬 Follow‑Up Insights" card.
- **Backend API extensions**:
  - `dimension` and `custom_query` optional fields in `HighlightRequest`.
  - Prompt builder now injects dimension‑specific instructions (Legal/Polity, Socio‑Economic, Historiography).
- **Secure handling of secrets** – `.env` is ignored via `.gitignore`.
- **FastAPI** streaming endpoints (`/highlight/fast`, `/highlight/deep`, `/highlight/analogy`).
- **React + Vite** UI with Tailwind‑styled, dark‑mode, glassmorphic components.

---

## Architecture Overview
```
studyhelper/
├─ backend/               # FastAPI service
│   ├─ app/
│   │   ├─ routers/       # API routes (highlight, notes, etc.)
│   │   ├─ services/      # AI orchestration & prompt building
│   │   └─ models/        # Pydantic request/response schemas
│   └─ .env               # secrets (excluded from Git)
└─ frontend/              # React/Vite UI
    ├─ src/components/    # SidePanel, PDFViewer, Checkpoint, etc.
    ├─ src/hooks/         # custom hooks for streaming & highlighting
    └─ src/store/         # Zustand store for session state
```
The frontend talks to the backend via HTTP SSE streams.  The UI dispatches the selected **core action** and **analytical dimension** to the `/highlight/fast` endpoint, which returns a JSON‑encoded stream of AI‑generated insights.

---

## Getting Started
### Prerequisites
- **Node.js** (>= 18) and **npm**
- **Python** (>= 3.11)
- **Poetry** or **pip** for dependency management
- An OpenAI/Anthropic API key (or any LLM provider you configure) – store it in `backend/.env` as `OPENAI_API_KEY`.

### Backend Setup
```bash
# Clone the repo (if not already)
git clone https://github.com/Devashishsingh98/studyhelper.git
cd studyhelper

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Copy example env and add your secret keys
cp backend/.env.example backend/.env
# edit backend/.env → set OPENAI_API_KEY, etc.

# Run the FastAPI server
uvicorn backend.app.main:app --reload --port 8000
```
The API will be reachable at `http://localhost:8000`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev   # Vite dev server, usually http://localhost:5173
```
The React app automatically proxies API calls to the backend (see `vite.config.js`).

---

## Environment Variables
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your LLM provider key (required for AI orchestration). |
| `USE_MOCK` | Set to `true` to use mock responses during development. |
| `PORT` (optional) | Port for the FastAPI server (default 8000). |

All variables live in `backend/.env` which is listed in `.gitignore`.

---

## Usage
1. Open the web app (frontend) in a browser.
2. In the **SidePanel**, choose a core action (e.g., *🗺️ Map/Geo*) and then pick an analytical dimension (e.g., *⚖️ Legal/Polity*).
3. The app sends a request to `/highlight/fast` with the selected `dimension`.
4. AI‑generated content streams back, rendered in a glassmorphic card.
5. To ask a follow‑up, type in the sticky input at the bottom of the SidePanel and hit the send icon. Your custom query is sent as `custom_query` and appears in a new “💬 Follow‑Up Insights” card.

---

## Project Structure (selected files)
- `frontend/src/components/SidePanel/SidePanel.jsx` – UI for the action dock, dimensional selector grid, and follow‑up input.
- `backend/app/models/highlight.py` – `HighlightRequest` now includes `dimension` and `custom_query`.
- `backend/app/routers/highlight.py` – Updated endpoints to forward the new fields.
- `backend/app/services/prompt_builder.py` – Prompt logic that injects dimension‑specific instructions.
- `.gitignore` – protects `.env` and other secrets.

---

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑feature`).
3. Make your changes and ensure the test suite (if any) passes.
4. Submit a pull request – the CI will verify that no secret files are included.

---

## License
MIT © 2026 Devashish Singh (Devashishsingh98)
