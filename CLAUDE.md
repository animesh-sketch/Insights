# CLAUDE.md — Insights Generator

## Project Overview

Insights Generator is a Python/Flask web application that accepts uploaded audit data and meeting transcripts, analyzes them using keyword and regex heuristics, and renders an interactive dashboard with risk scores, category breakdowns, compliance gaps, key findings, themes, and action items.

There is no ML/LLM component — all analysis is rule-based (keyword frequency, regex pattern matching, bigram extraction).

## Architecture

```
Insights/
├── app.py                  # Flask server — 3 REST API endpoints + static file serving
├── insights_engine.py      # Core analysis engine (InsightsEngine class)
├── requirements.txt        # Python dependencies (flask, pandas, werkzeug)
├── static/
│   ├── index.html          # Single-page frontend shell
│   ├── app.js              # Frontend logic — file upload, API calls, Canvas chart rendering
│   └── style.css           # Dark theme styles (CSS variables, responsive grid)
└── sample_data/
    ├── audit_findings.csv  # 15-row sample audit dataset
    └── audit_transcript.txt # Sample meeting transcript
```

### Backend (Python/Flask)

**`app.py`** — Flask server with these endpoints:
- `GET /` — Serves `static/index.html`
- `POST /api/upload` — Accepts multipart file uploads (`audit_files` and `transcript_files`), saves to `uploads/` directory
- `POST /api/generate` — Reads all files from `uploads/`, runs `InsightsEngine.generate()`, returns JSON
- `POST /api/reset` — Deletes all files in `uploads/`

File size limit: 50 MB (`MAX_CONTENT_LENGTH`). Allowed extensions: `.csv`, `.json`, `.xlsx` for audit data; `.txt`, `.md`, `.json`, `.csv` for transcripts.

**`insights_engine.py`** — `InsightsEngine` class with these analysis methods:
| Method | Purpose |
|---|---|
| `generate()` | Main entry point — orchestrates all analysis and returns a JSON-serializable dict |
| `_load_audit_data()` / `_load_transcripts()` | File parsers (CSV via `csv.DictReader`, JSON via `json.load`, plain text) |
| `_build_summary()` | Record/text statistics (counts, fields detected) |
| `_calculate_risk_score()` | Keyword-frequency-based 0–100 risk score with Low/Medium/High/Critical levels |
| `_categorize_findings()` | Classifies text into 6 categories: Compliance, Financial, Operational, Security, Quality, HR/People |
| `_extract_key_findings()` | Up to 25 notable items from audit records and transcript sentences |
| `_extract_themes()` | Top bigrams by frequency (min 2 occurrences, up to 15) |
| `_find_compliance_gaps()` | Regex pattern matching for gaps/failures/overdue items (up to 20) |
| `_build_trend_data()` | Time-series aggregation by year-month if date fields exist |
| `_extract_action_items()` | Regex extraction of action items, recommendations, todos (up to 15) |
| `_severity_distribution()` | Counts Critical/High/Medium/Low/Info severities from record fields or text |

### Frontend (Vanilla HTML/CSS/JS)

No build tools, no framework, no npm. The frontend is a single-page app served directly by Flask:
- **`index.html`** — Upload cards, action buttons, dashboard skeleton with `<canvas>` elements
- **`app.js`** — File selection handling, upload/generate/reset API calls, full dashboard rendering with Canvas API charts (risk gauge, bar charts, line chart, tables, lists)
- **`style.css`** — Dark theme using CSS variables (`--bg: #0f1117`), responsive grid layout

Charts are drawn directly on `<canvas>` elements using the Canvas 2D API — no charting library is used.

## Development Setup

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the development server
python app.py
# → Flask dev server at http://localhost:5000 (debug=True)
```

The `uploads/` directory is created automatically at startup.

## Dependencies

From `requirements.txt`:
- `flask==3.0.0` — Web framework
- `pandas==2.1.4` — Listed but **not imported** anywhere in the codebase
- `werkzeug==3.0.1` — WSGI utilities (used for `secure_filename`)

Standard library modules used: `csv`, `json`, `os`, `re`, `collections` (Counter, defaultdict), `datetime`.

## Key Conventions

### Code Style
- Python files use double-quoted strings consistently
- Section separators: `# ── Section Name ──────────` (box-drawing characters)
- Frontend JS uses `const $ = (sel) => document.querySelector(sel)` as a DOM query shorthand
- HTML escaping via `esc()` helper (creates a temporary `<div>`, sets `textContent`, reads `innerHTML`)

### Data Flow
1. User selects files in the browser → files sent to `/api/upload` as multipart form data
2. Flask saves files to `uploads/` directory with `secure_filename`
3. User clicks "Generate" → `/api/generate` reads all files from `uploads/`, passes to `InsightsEngine.generate()`
4. Engine returns a JSON dict → frontend renders dashboard sections from the response

### API Response Shape
The `/api/generate` endpoint returns:
```json
{
  "generated_at": "ISO timestamp",
  "summary": { "total_audit_records", "total_transcripts", "total_text_length", "audit_fields" },
  "risk_score": { "score", "level", "risk_indicators", "positive_indicators" },
  "categories": { "Compliance": N, "Financial": N, ... },
  "key_findings": [{ "source", "field", "value" }],
  "themes": [{ "theme", "frequency" }],
  "compliance_gaps": [{ "type", "detail" }],
  "trend_data": { "available", "date_field", "periods": [{ "period", "count" }] },
  "action_items": ["string"],
  "severity_distribution": { "Critical": N, "High": N, "Medium": N, "Low": N, "Info": N }
}
```

## Testing

There are no tests. No test framework is configured.

When adding tests, use `pytest` and place test files in a `tests/` directory. The `InsightsEngine` class is stateless and straightforward to unit test — pass file paths to `generate()` and assert on the returned dict. The sample data in `sample_data/` can serve as test fixtures.

## Important Notes

- **No XLSX support in engine**: `app.py` allows `.xlsx` uploads but `insights_engine.py` only handles `.csv` and `.json`. XLSX files are silently ignored during processing.
- **Uploads directory**: Files persist in `uploads/` between requests and across server restarts. The `/api/reset` endpoint clears them.
- **No authentication**: The app has no auth or session management. All uploaded files are shared across all users.
- **Debug mode**: The Flask server runs with `debug=True` — do not deploy to production without changing this.
- **Canvas charts**: All charts are custom Canvas 2D API implementations in `app.js`. There is a `roundRect()` helper for drawing rounded rectangles.
