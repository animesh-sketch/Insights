# CLAUDE.md - AI Assistant Guide for Insights Generator

## Project Overview

**Insights Generator** is a Python/Flask web application with two main features:

1. **Audit Insights Dashboard** - Upload audit files (CSV/JSON/XLSX) and transcript files (TXT/MD/JSON/CSV), and the backend processes them using rule-based NLP (regex + keyword counting) to produce a visual dashboard with risk scores, compliance gaps, key findings, themes, action items, severity distributions, and trend data.

2. **PDF Merger** - An interactive drag-and-drop tool for combining multiple PDF files into a single document. Supports drag-to-reorder, file removal, and animated progress feedback.

## Tech Stack

- **Backend**: Python 3 + Flask 3.0.0
- **Frontend**: Vanilla JavaScript (ES2017+), HTML5, CSS3 (no framework)
- **Charts**: HTML5 Canvas API (no chart library)
- **PDF Processing**: PyPDF2 3.0.1
- **Data processing**: Python stdlib (`csv`, `json`, `re`, `collections`, `datetime`)
- **Dependencies**: Flask 3.0.0, pandas 2.1.4, Werkzeug 3.0.1, PyPDF2 3.0.1

## Repository Structure

```
Insights/
├── app.py                    # Flask server - routes, file upload, PDF merge endpoint
├── insights_engine.py        # Core analysis engine - InsightsEngine class
├── requirements.txt          # Python dependencies
├── CLAUDE.md                 # This file - AI assistant guide
├── .gitignore
├── sample_data/
│   ├── audit_findings.csv    # Sample audit data (15 rows)
│   └── audit_transcript.txt  # Sample meeting transcript
└── static/
    ├── index.html            # Insights dashboard HTML page
    ├── app.js                # Insights dashboard frontend logic and chart rendering
    ├── style.css             # Shared dark theme styles with CSS variables
    ├── pdf_merger.html       # PDF merger HTML page
    ├── pdf_merger.js         # PDF merger frontend logic (drag-drop, reorder, merge)
    └── pdf_merger.css        # PDF merger + navigation styles
```

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Start the Flask dev server (port 5000, debug mode)
python app.py
```

## Pages

| URL           | Description                          |
|---------------|--------------------------------------|
| `/`           | Audit Insights Dashboard             |
| `/pdf-merger` | Interactive PDF Merger tool          |

## API Endpoints

| Method | Route             | Description                                      |
|--------|-------------------|--------------------------------------------------|
| GET    | `/`               | Serves `static/index.html`                       |
| GET    | `/pdf-merger`     | Serves `static/pdf_merger.html`                  |
| POST   | `/api/upload`     | Accepts `audit_files` and `transcript_files` via multipart form |
| POST   | `/api/generate`   | Processes all uploaded files, returns JSON insights |
| POST   | `/api/reset`      | Deletes all files in `uploads/`                   |
| POST   | `/api/merge-pdfs` | Accepts `pdf_files`, returns merged PDF binary    |

## Architecture

- **app.py** is a thin routing layer; audit analysis logic lives in `InsightsEngine` in `insights_engine.py`; PDF merge uses PyPDF2 directly in the route handler
- **Stateful upload folder**: Insights files persist in `uploads/` between upload and generate steps; `/api/reset` clears them
- **Stateless PDF merge**: PDF merger processes files in-memory and streams the result back; no files saved to disk
- **No database** - purely file-based, stateless between sessions
- **No AI/LLM** - all analysis is rule-based keyword and regex matching
- **No frontend framework** - vanilla JS with direct DOM manipulation and `fetch()` API calls
- **Navigation**: Top nav bar links between Insights and PDF Merger pages (styles in `pdf_merger.css`)

## Key Analysis Methods in InsightsEngine

- `generate()` - main entry, returns dict with 9 analysis sections
- `_calculate_risk_score()` - keyword density scoring normalized to 0-100
- `_categorize_findings()` - maps findings to 6 categories (Compliance, Financial, Operational, Security, Quality, HR/People)
- `_extract_key_findings()` - top 25 findings from data fields + risk-keyword sentences
- `_extract_themes()` - top 15 bigrams (2-word phrase frequency)
- `_find_compliance_gaps()` - regex patterns for non-compliance indicators
- `_build_trend_data()` - time-series from date fields
- `_extract_action_items()` - regex for actionable language (up to 15 items)
- `_severity_distribution()` - counts Critical/High/Medium/Low/Info levels

## PDF Merger Frontend Features

- Drag-and-drop file upload zone with visual feedback
- File list with drag-to-reorder capability (files merge top-to-bottom)
- Individual file removal
- Animated progress bar during merge
- Auto-download of merged PDF
- Success confirmation message

## Frontend Conventions

- Dark theme using CSS custom properties (`--bg: #0f1117`, `--surface: #1a1d27`, `--accent: #6366f1`)
- Responsive grid with `@media (max-width: 768px)` breakpoint
- Canvas-based charts drawn manually (no Chart.js/D3)
- HTML escaping via `esc()` function using `div.textContent` trick
- Dashboard section hidden until generation completes
- SVG icons used inline (no icon library)

## File Upload Constraints

- **Max upload size**: 50 MB (Flask config)
- **Allowed audit extensions**: `.csv`, `.json`, `.xlsx`
- **Allowed transcript extensions**: `.txt`, `.md`, `.json`, `.csv`
- **PDF merger**: `.pdf` files only, minimum 2 required

## Development Notes

- No test suite exists - no pytest, unittest, or any testing framework
- No CI/CD pipeline configured
- No linter or formatter configuration (no flake8, mypy, eslint, prettier)
- No Docker or containerization setup
- `pandas` is listed in requirements.txt but not currently imported in source code
- The `uploads/` directory is created at runtime and gitignored

## Coding Conventions

- Python: snake_case for functions/variables, PascalCase for classes, prefix private methods with `_`
- JavaScript: camelCase for functions/variables, vanilla DOM APIs only
- CSS: BEM-like class naming, CSS custom properties for theming
- Keep Flask routes thin; business logic belongs in dedicated modules
- All frontend files are plain static assets served by Flask (no build step)
- Each feature page has its own HTML/JS/CSS files (`index.html`+`app.js` for insights, `pdf_merger.html`+`pdf_merger.js`+`pdf_merger.css` for merger)
- Shared base styles in `style.css`, feature-specific styles in dedicated CSS files
