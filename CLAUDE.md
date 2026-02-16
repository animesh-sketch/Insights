# CLAUDE.md

## Project Overview

**Insights Generator** is a Flask web application that accepts audit data files (CSV/JSON) and meeting transcripts (TXT/MD), analyzes them with a rule-based Python engine, and renders an interactive insights dashboard in the browser. All analysis is keyword/regex-based — no external AI or ML services are used.

## Repository Structure

```
Insights/
├── app.py                 # Flask HTTP layer (routes, file upload handling)
├── insights_engine.py     # Core analysis engine (pure Python, no Flask imports)
├── requirements.txt       # Python dependencies
├── sample_data/           # Example audit data for manual testing
│   ├── audit_findings.csv
│   └── audit_transcript.txt
└── static/                # Frontend SPA (vanilla JS, no framework)
    ├── index.html         # Single-page app shell
    ├── app.js             # Client-side logic, Canvas chart rendering
    └── style.css          # Dark-theme CSS with custom properties
```

## Architecture

Three-layer monolith with clean separation of concerns:

- **`app.py`** — Thin Flask controller. Handles HTTP routing, file uploads (multipart), and serves static files. No business logic here.
- **`insights_engine.py`** — Domain logic. `InsightsEngine` class performs all analysis: risk scoring, category classification, finding extraction, theme detection, compliance gap identification, trend building, and action item extraction. Pure Python with no framework dependencies.
- **`static/`** — Client-side SPA. Vanilla HTML/JS/CSS with no build step. Charts rendered directly on `<canvas>` using the 2D API. No external JS dependencies.

**Data flow:**
```
Browser → POST /api/upload → files saved to uploads/
        → POST /api/generate → InsightsEngine.generate() → JSON
        → renderDashboard() → Canvas charts + HTML tables
```

**State:** Files persist on disk in `uploads/` between upload and generate calls. No database, no session isolation. Single-user / demo-grade design.

## Tech Stack

- **Backend:** Python 3, Flask 3.0.0, Werkzeug 3.0.1
- **Frontend:** Vanilla HTML/CSS/JS, Canvas 2D API (no framework, no bundler)
- **Dependencies:** `pandas==2.1.4` is listed but not currently imported anywhere

## Development Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the development server
python app.py
# Server starts on http://localhost:5000 in debug mode
```

No environment variables or `.env` file is required. All configuration is hardcoded:
- Port: `5000`
- Max upload size: `50 MB`
- Upload directory: `uploads/` (created automatically at startup)

## API Endpoints

| Method | Route           | Description                                              |
|--------|-----------------|----------------------------------------------------------|
| GET    | `/`             | Serves `static/index.html`                               |
| POST   | `/api/upload`   | Accepts multipart `audit_files` and/or `transcript_files` |
| POST   | `/api/generate` | Reads uploaded files, runs analysis, returns JSON         |
| POST   | `/api/reset`    | Deletes all files in `uploads/`                           |

**Allowed file types:**
- Audit data: `.csv`, `.json`, `.xlsx`
- Transcripts: `.txt`, `.md`, `.json`, `.csv`

## Key Code Conventions

### Python

- Single `InsightsEngine` class instance created at module load in `app.py`
- Analysis methods are private (`_calculate_risk_score`, `_extract_key_findings`, etc.) with one public method: `generate()`
- Class-level constants for keyword dictionaries (`RISK_KEYWORDS`, `POSITIVE_KEYWORDS`, `CATEGORY_PATTERNS`)
- File I/O uses stdlib only (`csv.DictReader`, `json.load`); pandas is not used despite being a dependency
- `secure_filename()` from Werkzeug for upload safety
- Error handling via try/except with JSON error responses

### JavaScript

- No framework — all DOM manipulation is vanilla JS
- `esc()` helper function for HTML escaping (XSS prevention)
- Charts drawn directly on `<canvas>` elements (no Chart.js)
- Dashboard rendering split into individual functions: `renderSummary()`, `renderRiskScore()`, `renderSeverityChart()`, etc.
- Two-step upload flow: files are sent first, then generation is triggered separately

### CSS

- Dark theme using CSS custom properties (e.g., `--bg-primary: #0f1117`, `--accent: #6366f1`)
- Semantic color classes for severity levels: `.risk-low`, `.risk-medium`, `.risk-high`, `.risk-critical`
- Responsive grid layout that collapses to single column at 768px

## InsightsEngine Output Schema

`InsightsEngine.generate()` returns a dict with these top-level keys:

| Key                      | Type   | Description                                      |
|--------------------------|--------|--------------------------------------------------|
| `generated_at`           | string | ISO 8601 timestamp                               |
| `summary`                | dict   | Record/transcript counts, field names             |
| `risk_score`             | dict   | Score (0-100), level string, indicator counts     |
| `categories`             | dict   | Category name → keyword hit count                 |
| `key_findings`           | list   | Up to 25 finding objects                          |
| `themes`                 | list   | Up to 15 bigram frequency objects                 |
| `compliance_gaps`        | list   | Up to 20 gap objects                              |
| `trend_data`             | dict   | Time-series data if date field found              |
| `action_items`           | list   | Up to 15 action strings                           |
| `severity_distribution`  | dict   | Critical/High/Medium/Low/Info counts              |

## Testing

There is no automated test suite. The `sample_data/` directory contains example files (`audit_findings.csv`, `audit_transcript.txt`) for manual testing via the web UI.

## Known Limitations

- **No session isolation:** All uploads go to a shared `uploads/` folder — concurrent users would interfere with each other
- **No authentication:** No user auth or access control
- **No database:** All state is ephemeral file-based
- **No XLSX support:** `.xlsx` is listed as allowed but `_load_audit_data()` only handles `.csv` and `.json`
- **Unused dependency:** `pandas` is in `requirements.txt` but never imported
- **Debug mode:** `app.py` runs with `debug=True` by default (not production-safe)
