"""Insights Generator - Upload audit data & transcripts, generate structured dashboard insights."""

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from insights_engine import InsightsEngine

app = Flask(__name__, static_folder="static")
app.config["UPLOAD_FOLDER"] = os.path.join("/tmp", "uploads")
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB

ALLOWED_AUDIT_EXT = {".csv", ".json", ".xlsx"}
ALLOWED_TRANSCRIPT_EXT = {".txt", ".md", ".json", ".csv"}

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
