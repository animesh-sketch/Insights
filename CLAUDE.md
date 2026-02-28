# CLAUDE.md - Insights Generator

## Project Overview

Insights Generator is a self-contained web application for internal audit and compliance teams. Users upload audit data files (CSV/JSON/XLSX) and meeting transcripts (TXT/MD/JSON/CSV), then the app generates a structured visual dashboard with risk scores, category breakdowns, compliance gaps, key findings, action items, and trend charts.

All analysis is rule-based (keyword matching, regex patterns, bigram frequency counting). There is no AI/LLM backend.

## Architecture

```
Insights/
├── app.py                  # Flask REST API server (routes + file handling)
├── insights_engine.py      # Core analysis engine (InsightsEngine class)
├── requirements.txt        # Python dependencies (flask, pandas, werkzeug)
├── sample_data/
│   ├── audit_findings.csv  # Sample 15-row audit CSV
│   └── audit_transcript.txt # Sample meeting transcript
└── static/
    ├── index.html          # Single-page frontend (HTML5)
    ├── app.js              # Frontend logic (vanilla JS, no framework)
    └── style.css           # Dark-themed stylesheet
```

**Backend:** Python 3 + Flask 3.0.0. The `app.py` handles HTTP routing and file I/O only. All analysis logic lives in the `InsightsEngine` class in `insights_engine.py`.

**Frontend:** Vanilla HTML5/CSS3/JavaScript with no build step, no bundler, and no JS framework. Charts are drawn using the native HTML5 Canvas API (no charting library). Static files are served directly by Flask.

**State:** Uploaded files are stored in an `uploads/` directory (auto-created, gitignored). There is no database. The `/api/reset` endpoint clears all uploads.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serves the single-page frontend |
| `POST` | `/api/upload` | Accepts multipart form uploads (fields: `audit_files`, `transcript_files`) |
| `POST` | `/api/generate` | Reads from uploads dir, runs analysis engine, returns JSON |
| `POST` | `/api/reset` | Deletes all files in uploads dir |

## Running the Application

```bash
pip install -r requirements.txt
python app.py
# Starts Flask dev server on http://localhost:5000
```

The server runs with `debug=True` on port 5000. Max upload size is 50 MB.

## Dependencies

Python only (no Node.js dependencies):
- `flask==3.0.0` - Web framework
- `pandas==2.1.4` - Listed but not directly imported in current code (stdlib `csv` and `json` are used instead)
- `werkzeug==3.0.1` - File upload security (`secure_filename`)

## Testing

There are currently no tests, test framework, or test configuration in this project.

## Linting and Formatting

There is no linting or formatting configuration. No `.eslintrc`, `.prettierrc`, `pyproject.toml`, or similar config files exist.

## Key Code Patterns

### Backend (Python)

- **Separation of concerns:** `app.py` handles only HTTP routing and file I/O. `InsightsEngine` in `insights_engine.py` contains all analysis logic.
- **Class constants for configuration:** Risk keywords, positive keywords, and category patterns are defined as class-level constants (`RISK_KEYWORDS`, `POSITIVE_KEYWORDS`, `CATEGORY_PATTERNS`) on `InsightsEngine`.
- **Single entry point:** `InsightsEngine.generate()` takes lists of file paths and returns a single dict with all dashboard data.
- **Private methods:** All analysis methods are prefixed with `_` (e.g., `_calculate_risk_score`, `_extract_key_findings`).
- **File reading:** Uses stdlib `csv.DictReader` and `json.load` with `encoding="utf-8"` and `errors="replace"`.
- **Allowed extensions:** Defined as sets at module level (`ALLOWED_AUDIT_EXT`, `ALLOWED_TRANSCRIPT_EXT`).

### Frontend (JavaScript)

- **No framework:** Pure vanilla JS with `document.querySelector` aliased as `$`.
- **Async/await fetch:** All API calls use `async/await` with the Fetch API.
- **Canvas rendering:** All charts (bar, horizontal bar, line) are drawn imperatively on `<canvas>` elements. The `roundRect()` helper draws rounded rectangles.
- **XSS protection:** The `esc()` function uses DOM-based escaping (`textContent` -> `innerHTML`) for user-facing content.
- **Section-based rendering:** Each dashboard section has its own `render*()` function (e.g., `renderRiskScore`, `renderSeverityChart`, `renderFindings`).

## File Upload Constraints

- Audit files: `.csv`, `.json`, `.xlsx`
- Transcript files: `.txt`, `.md`, `.json`, `.csv`
- Max file size: 50 MB
- Files are saved with `werkzeug.secure_filename()` to prevent path traversal

## Analysis Engine Details

The `InsightsEngine` produces the following in its JSON output:
- `risk_score` - 0-100 score with Low/Medium/High/Critical levels, based on keyword frequency
- `categories` - Count of mentions across 6 categories: Compliance, Financial, Operational, Security, Quality, HR/People
- `key_findings` - Extracted from audit record fields and risk-keyword sentences in transcripts (max 25)
- `themes` - Top recurring bigrams from combined text (min frequency 2, max 15)
- `compliance_gaps` - Detected via regex patterns and non-pass audit statuses (max 20)
- `trend_data` - Time-series counts if date fields exist in audit records
- `action_items` - Extracted from transcripts via action/todo/recommendation patterns (max 15)
- `severity_distribution` - Counts by Critical/High/Medium/Low/Info from audit severity fields or text estimation

## Common Modifications

**Adding a new analysis type:** Add a new private method to `InsightsEngine`, call it from `generate()`, add the result key to the return dict, then add a corresponding `render*()` function in `static/app.js` and a DOM container in `static/index.html`.

**Adding new risk keywords:** Append to the `RISK_KEYWORDS` or `POSITIVE_KEYWORDS` lists in `InsightsEngine`.

**Adding a new file format:** Add the extension to `ALLOWED_AUDIT_EXT` or `ALLOWED_TRANSCRIPT_EXT` in `app.py`, then add a reader method in `InsightsEngine._load_audit_data()` or `_load_transcripts()`.

**Styling changes:** Edit `static/style.css`. The UI uses a dark theme with CSS custom properties would be a natural addition for theming.
