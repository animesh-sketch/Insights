# CLAUDE.md — Insights Generator

## Project Overview

Insights Generator is a Flask web application for uploading audit data files and meeting transcripts, then producing a structured visual dashboard of audit insights. It targets internal audit and compliance workflows.

There is no database — uploaded files are stored in a local `uploads/` directory and re-read on each analysis run. The frontend is vanilla HTML/CSS/JS served by Flask as static files.

## Tech Stack

- **Backend:** Python 3, Flask 3.0.0, Werkzeug 3.0.1
- **Data handling:** stdlib `csv`/`json` modules (pandas 2.1.4 is declared in requirements but not actively used)
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES2017+) — no framework, no bundler
- **Charts:** Hand-drawn on HTML `<canvas>` using Canvas 2D API — no chart library

## Repository Structure

```
.
├── app.py                    # Flask app: routes, file upload handling
├── insights_engine.py        # InsightsEngine class with all analysis logic
├── requirements.txt          # Python dependencies (pinned versions)
├── .gitignore
├── sample_data/
│   ├── audit_findings.csv    # Demo CSV (columns: id, date, category, finding, severity, status, control, description)
│   └── audit_transcript.txt  # Demo meeting transcript
└── static/
    ├── index.html            # Single-page UI
    ├── app.js                # All frontend logic: uploads, API calls, dashboard rendering
    └── style.css             # Dark-theme CSS with CSS custom properties
```

No `src/` directory, no packages — the project is flat with two Python files and three static frontend files.

## Running the Project

```bash
pip install -r requirements.txt
python app.py
# Server starts at http://localhost:5000 (debug=True)
```

The `uploads/` directory is auto-created on startup.

## API Endpoints

| Method | Endpoint         | Description                                                       |
|--------|------------------|-------------------------------------------------------------------|
| GET    | `/`              | Serves `static/index.html`                                       |
| POST   | `/api/upload`    | Accepts multipart form (`audit_files`, `transcript_files` fields) |
| POST   | `/api/generate`  | Runs analysis on uploaded files, returns JSON                     |
| POST   | `/api/reset`     | Deletes all files in `uploads/`                                   |

**File size limit:** 50 MB (`MAX_CONTENT_LENGTH`).

**Accepted file types:**
- Audit data: `.csv`, `.json`, `.xlsx` (note: `.xlsx` parsing is not implemented — files upload but produce no records)
- Transcripts: `.txt`, `.md`, `.json`, `.csv`

## Architecture

### Backend (`app.py` + `insights_engine.py`)

`app.py` defines Flask routes and delegates analysis to `InsightsEngine`.

`InsightsEngine` is a single class with:
- **One public method:** `generate()` — returns a structured dict with all analysis results
- **Private helpers** prefixed with `_`: `_load_audit_data()`, `_load_transcripts()`, `_read_csv()`, `_read_json()`, `_build_summary()`, `_calculate_risk_score()`, `_categorize_findings()`, `_extract_key_findings()`, `_extract_themes()`, `_find_compliance_gaps()`, `_build_trend_data()`, `_extract_action_items()`, `_severity_distribution()`
- **Class-level constants:** `RISK_KEYWORDS`, `POSITIVE_KEYWORDS`, `CATEGORY_PATTERNS` for keyword/regex-based analysis

All file reading uses `encoding="utf-8", errors="replace"`. Results are capped with slicing (e.g., `[:25]`, `[:15]`) to bound output size. Deduplication uses `seen = set()` patterns.

### Frontend (`static/`)

- `index.html`: Single-page layout with upload cards and dashboard section
- `app.js`: Uses `async/await` with `fetch` for API calls. Defines `const $ = (sel) => document.querySelector(sel)` as a DOM query helper. Render functions follow `render<Section>` naming (e.g., `renderRiskScore`, `renderFindings`). XSS protection via `esc()` helper.
- `style.css`: Dark theme with CSS custom properties in `:root`. CSS Grid layout. Responsive breakpoint at 768px. Color palette: deep navy background (`#0f1117`), indigo accent (`#6366f1`).

## Code Conventions

### Python
- `snake_case` for functions/variables, `PascalCase` for classes
- Single underscore prefix for private methods (`_method_name`)
- All analysis logic lives in `InsightsEngine` — do not scatter analysis across routes
- Keep keyword/pattern lists as class-level constants

### JavaScript
- `camelCase` throughout
- No framework — use vanilla DOM manipulation
- Render functions: `render<Section>(data)`
- Use `$()` helper for `querySelector`
- Use `esc()` for any user-supplied text inserted into the DOM

### CSS
- Use CSS custom properties defined in `:root` for theming
- Use `hidden` utility class (`display: none !important`) for visibility toggling

## Testing

There are no tests, test frameworks, or CI/CD pipelines in this project. No linter or formatter configuration exists.

## Known Gaps

- `.xlsx` files are accepted on upload but silently ignored during analysis (no parsing logic)
- No authentication or authorization on any endpoint
- `debug=True` is hardcoded — not suitable for production without changes
- No persistent storage — restarting the server loses upload state
- pandas is declared as a dependency but unused in application code
