"""Insights Generator - Upload audit data & transcripts, generate structured dashboard insights.
Also includes a PDF Merger tool."""

import os
import json
import uuid
from flask import Flask, request, jsonify, send_from_directory, send_file
from werkzeug.utils import secure_filename
from PyPDF2 import PdfMerger
from insights_engine import InsightsEngine

app = Flask(__name__, static_folder="static")
app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "uploads")
app.config["PDF_UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "pdf_uploads")
app.config["PDF_OUTPUT_FOLDER"] = os.path.join(os.path.dirname(__file__), "pdf_output")
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB

ALLOWED_AUDIT_EXT = {".csv", ".json", ".xlsx"}
ALLOWED_TRANSCRIPT_EXT = {".txt", ".md", ".json", ".csv"}

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["PDF_UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["PDF_OUTPUT_FOLDER"], exist_ok=True)

engine = InsightsEngine()


def allowed_file(filename, allowed_extensions):
    return os.path.splitext(filename)[1].lower() in allowed_extensions


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/api/upload", methods=["POST"])
def upload_files():
    """Upload audit data and/or transcript files."""
    uploaded = {"audit_files": [], "transcript_files": []}

    for key, allowed_ext, label in [
        ("audit_files", ALLOWED_AUDIT_EXT, "audit_files"),
        ("transcript_files", ALLOWED_TRANSCRIPT_EXT, "transcript_files"),
    ]:
        if key in request.files:
            files = request.files.getlist(key)
            for f in files:
                if f.filename and allowed_file(f.filename, allowed_ext):
                    filename = secure_filename(f.filename)
                    save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                    f.save(save_path)
                    uploaded[label].append(filename)

    if not uploaded["audit_files"] and not uploaded["transcript_files"]:
        return jsonify({"error": "No valid files uploaded. Accepted: CSV/JSON/XLSX for audits, TXT/MD/JSON/CSV for transcripts."}), 400

    return jsonify({"status": "ok", "uploaded": uploaded})


@app.route("/api/generate", methods=["POST"])
def generate_insights():
    """Process uploaded files and return structured insights."""
    upload_dir = app.config["UPLOAD_FOLDER"]
    files = os.listdir(upload_dir)

    if not files:
        return jsonify({"error": "No files uploaded yet. Please upload audit data or transcripts first."}), 400

    audit_files = [
        os.path.join(upload_dir, f) for f in files
        if os.path.splitext(f)[1].lower() in ALLOWED_AUDIT_EXT
    ]
    transcript_files = [
        os.path.join(upload_dir, f) for f in files
        if os.path.splitext(f)[1].lower() in ALLOWED_TRANSCRIPT_EXT
    ]

    results = engine.generate(audit_files, transcript_files)
    return jsonify(results)


@app.route("/api/reset", methods=["POST"])
def reset():
    """Clear all uploaded files."""
    upload_dir = app.config["UPLOAD_FOLDER"]
    for f in os.listdir(upload_dir):
        os.remove(os.path.join(upload_dir, f))
    return jsonify({"status": "ok"})


# ── PDF Merger Routes ──

@app.route("/pdf-merger")
def pdf_merger():
    return send_from_directory("static", "pdf_merger.html")


@app.route("/api/pdf/upload", methods=["POST"])
def pdf_upload():
    """Upload one or more PDF files for merging."""
    if "files" not in request.files:
        return jsonify({"error": "No files provided."}), 400

    files = request.files.getlist("files")
    session_id = request.form.get("session_id", str(uuid.uuid4()))
    session_dir = os.path.join(app.config["PDF_UPLOAD_FOLDER"], session_id)
    os.makedirs(session_dir, exist_ok=True)

    uploaded = []
    for f in files:
        if f.filename and f.filename.lower().endswith(".pdf"):
            filename = secure_filename(f.filename)
            # Prefix with index to preserve upload order
            index = len(os.listdir(session_dir))
            save_name = f"{index:04d}_{filename}"
            f.save(os.path.join(session_dir, save_name))
            uploaded.append({"name": filename, "stored": save_name})

    if not uploaded:
        return jsonify({"error": "No valid PDF files uploaded."}), 400

    return jsonify({"status": "ok", "session_id": session_id, "files": uploaded})


@app.route("/api/pdf/list", methods=["GET"])
def pdf_list():
    """List uploaded PDFs in a session."""
    session_id = request.args.get("session_id", "")
    if not session_id:
        return jsonify({"files": []})

    session_dir = os.path.join(app.config["PDF_UPLOAD_FOLDER"], session_id)
    if not os.path.isdir(session_dir):
        return jsonify({"files": []})

    files = sorted(os.listdir(session_dir))
    result = []
    for f in files:
        # Strip the prefix index to get original name
        original = f.split("_", 1)[1] if "_" in f else f
        size = os.path.getsize(os.path.join(session_dir, f))
        result.append({"name": original, "stored": f, "size": size})
    return jsonify({"files": result})


@app.route("/api/pdf/remove", methods=["POST"])
def pdf_remove():
    """Remove a single PDF from the session."""
    data = request.get_json()
    session_id = data.get("session_id", "")
    stored_name = data.get("stored", "")

    if not session_id or not stored_name:
        return jsonify({"error": "Missing session_id or stored name."}), 400

    session_dir = os.path.join(app.config["PDF_UPLOAD_FOLDER"], session_id)
    file_path = os.path.join(session_dir, secure_filename(stored_name))

    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify({"status": "ok"})


@app.route("/api/pdf/merge", methods=["POST"])
def pdf_merge():
    """Merge uploaded PDFs in the specified order."""
    data = request.get_json()
    session_id = data.get("session_id", "")
    order = data.get("order", [])  # list of stored filenames in desired order
    output_name = data.get("output_name", "merged.pdf")

    if not session_id:
        return jsonify({"error": "Missing session_id."}), 400

    session_dir = os.path.join(app.config["PDF_UPLOAD_FOLDER"], session_id)
    if not os.path.isdir(session_dir):
        return jsonify({"error": "Session not found."}), 404

    # If no explicit order, use alphabetical (upload order)
    if not order:
        order = sorted(os.listdir(session_dir))

    if len(order) < 2:
        return jsonify({"error": "Need at least 2 PDF files to merge."}), 400

    merger = PdfMerger()
    try:
        for filename in order:
            filepath = os.path.join(session_dir, secure_filename(filename))
            if not os.path.exists(filepath):
                return jsonify({"error": f"File not found: {filename}"}), 404
            merger.append(filepath)

        # Sanitize output name
        if not output_name.lower().endswith(".pdf"):
            output_name += ".pdf"
        output_name = secure_filename(output_name)

        output_path = os.path.join(app.config["PDF_OUTPUT_FOLDER"], f"{session_id}_{output_name}")
        merger.write(output_path)
        merger.close()
    except Exception as e:
        return jsonify({"error": f"Merge failed: {str(e)}"}), 500

    return jsonify({
        "status": "ok",
        "download_url": f"/api/pdf/download?session_id={session_id}&filename={output_name}"
    })


@app.route("/api/pdf/download", methods=["GET"])
def pdf_download():
    """Download the merged PDF."""
    session_id = request.args.get("session_id", "")
    filename = request.args.get("filename", "merged.pdf")

    if not session_id:
        return jsonify({"error": "Missing session_id."}), 400

    output_name = secure_filename(filename)
    output_path = os.path.join(app.config["PDF_OUTPUT_FOLDER"], f"{session_id}_{output_name}")

    if not os.path.exists(output_path):
        return jsonify({"error": "File not found."}), 404

    return send_file(output_path, as_attachment=True, download_name=output_name)


@app.route("/api/pdf/reset", methods=["POST"])
def pdf_reset():
    """Clear a PDF merge session."""
    data = request.get_json()
    session_id = data.get("session_id", "")

    if not session_id:
        return jsonify({"error": "Missing session_id."}), 400

    # Clean uploaded files
    session_dir = os.path.join(app.config["PDF_UPLOAD_FOLDER"], session_id)
    if os.path.isdir(session_dir):
        for f in os.listdir(session_dir):
            os.remove(os.path.join(session_dir, f))
        os.rmdir(session_dir)

    # Clean output files
    output_dir = app.config["PDF_OUTPUT_FOLDER"]
    for f in os.listdir(output_dir):
        if f.startswith(session_id):
            os.remove(os.path.join(output_dir, f))

    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
