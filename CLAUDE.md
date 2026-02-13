# CLAUDE.md - Insights Generator

## Project Overview

Audit data analysis web application. Users upload audit data files (CSV, JSON, XLSX) and transcripts (TXT, MD, JSON, CSV), then generate a structured dashboard with risk scoring, compliance gap analysis, category breakdowns, and actionable recommendations.

**Stack:** Python/Flask backend, vanilla JavaScript frontend (no frameworks), HTML5 Canvas charting, CSS dark theme.

## Repository Structure

```
.
├── app.py                  # Flask application - routes and file upload handling
├── insights_engine.py      # Core analysis engine (InsightsEngine class)
├── requirements.txt        # Python dependencies (flask, pandas, werkzeug)
├── static/
│   ├── index.html          # SPA entry point - upload form and dashboard layout
│   ├── app.js              # Frontend logic - file handling, API calls, Canvas charts
│   └── style.css           # Dark theme styles with CSS variables
├── sample_data/
│   ├── audit_findings.csv  # Sample audit records (15 findings, various severities)
│   └── audit_transcript.txt # Sample meeting transcript
└── uploads/                # Runtime directory for uploaded files (gitignored)
```

## Getting Started

```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server
python app.py
# Serves on http://localhost:5000
```

No build step required. The frontend is plain HTML/JS/CSS served directly by Flask.

## API Endpoints

| Method | Path             | Description                              |
|--------|------------------|------------------------------------------|
| GET    | `/`              | Serve `static/index.html`                |
| POST   | `/api/upload`    | Upload audit data and/or transcript files |
| POST   | `/api/generate`  | Run analysis on uploaded files            |
| POST   | `/api/reset`     | Clear all uploaded files                  |

### File type restrictions
- **Audit data:** `.csv`, `.json`, `.xlsx`
- **Transcripts:** `.txt`, `.md`, `.json`, `.csv`
- **Max upload size:** 50 MB

## Architecture

### Backend (`app.py`)
- Flask app with static file serving and three API routes
- Files are saved to `uploads/` directory via `werkzeug.secure_filename`
- Single `InsightsEngine` instance is reused across requests

### Analysis Engine (`insights_engine.py`)
- `InsightsEngine` class with one public method: `generate(audit_files, transcript_files)`
- Keyword-based analysis (not ML/AI) using predefined word lists:
  - `RISK_KEYWORDS` (20 terms) - signals for risk/compliance issues
  - `POSITIVE_KEYWORDS` (10 terms) - signals for good standing
  - `CATEGORY_PATTERNS` (6 categories) - Compliance, Financial, Operational, Security, Quality, HR/People
- Risk score: 0-100 scale normalized with a baseline of 30, categorized as Low/Medium/High/Critical
- Compliance gaps found via regex pattern matching
- Action items extracted from transcripts via regex for "action:", "todo:", "follow-up:", "need to", "should", "recommend" patterns
- Trend data built from date-like fields in audit records

### Frontend (`static/`)
- Single-page app with no build tooling or framework dependencies
- Charts rendered with HTML5 Canvas (no charting library): severity bars, category bars, trend lines
- `esc()` function used for HTML escaping user-provided content
- Two-column upload grid, responsive to single-column at 768px breakpoint

## Key Conventions

- **Python style:** Double-quoted strings, module docstrings, method docstrings for public/route functions
- **Private methods:** Prefixed with underscore (`_load_audit_data`, `_calculate_risk_score`, etc.)
- **Section comments:** Use `# ── Section Name ──────` style dividers in insights_engine.py
- **Frontend:** Vanilla JS with `const`/`let`, template literals for HTML generation, no modules/bundler
- **CSS:** Custom properties (variables) defined on `:root`, BEM-like class naming (e.g., `.upload-section`, `.risk-circle`)
- **File handling:** All file I/O uses `encoding="utf-8", errors="replace"` for resilience
- **Data limits:** Results are capped (25 findings, 20 compliance gaps, 15 themes, 15 action items) to keep responses manageable

## Important Notes

- **No tests exist.** There is no test suite, test framework, or test configuration.
- **No CI/CD.** No GitHub Actions, Docker, or deployment configuration.
- **No linting/formatting config.** No pylintrc, .eslintrc, prettier, or similar.
- **Debug mode is on.** `app.run(debug=True)` in app.py - not production-ready.
- **No database.** All analysis is in-memory; uploaded files are the only persistence.
- **`pandas` is listed in requirements.txt but not imported or used** in the current code.
- **The `uploads/` directory** is created at startup and gitignored. Files persist there until `/api/reset` is called.
