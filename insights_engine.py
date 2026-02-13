"""Core engine that processes audit data and transcripts to generate structured insights."""

import csv
import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime


class InsightsEngine:
    """Analyzes audit data and transcripts to produce dashboard-ready insights."""

    # Keywords that signal risk/compliance issues
    RISK_KEYWORDS = [
        "non-compliance", "violation", "breach", "failure", "deficiency",
        "risk", "gap", "missing", "incomplete", "overdue", "expired",
        "unauthorized", "unapproved", "deviation", "exception", "warning",
        "critical", "high", "severe", "escalat", "incident",
    ]

    POSITIVE_KEYWORDS = [
        "compliant", "pass", "complete", "approved", "resolved",
        "improved", "satisfactory", "adequate", "effective", "strong",
    ]

    CATEGORY_PATTERNS = {
        "Compliance": ["compliance", "regulatory", "regulation", "policy", "procedure", "standard", "requirement"],
        "Financial": ["financial", "revenue", "cost", "budget", "expense", "payment", "invoice", "audit finding"],
        "Operational": ["operational", "process", "workflow", "efficiency", "performance", "throughput"],
        "Security": ["security", "access", "authentication", "authorization", "data protection", "privacy", "breach"],
        "Quality": ["quality", "defect", "error", "accuracy", "testing", "validation", "review"],
        "HR / People": ["training", "employee", "staff", "personnel", "hr", "human resource", "onboarding"],
    }

    def generate(self, audit_files, transcript_files):
        """Main entry point: process files and return structured insights."""
        audit_records = self._load_audit_data(audit_files)
        transcript_texts = self._load_transcripts(transcript_files)

        all_text = " ".join(transcript_texts)
        combined_text = all_text + " " + " ".join(
            " ".join(str(v) for v in r.values()) for r in audit_records
        )

        return {
            "generated_at": datetime.now().isoformat(),
            "summary": self._build_summary(audit_records, transcript_texts),
            "risk_score": self._calculate_risk_score(combined_text),
            "categories": self._categorize_findings(combined_text),
            "key_findings": self._extract_key_findings(audit_records, transcript_texts),
            "themes": self._extract_themes(combined_text),
            "compliance_gaps": self._find_compliance_gaps(audit_records, combined_text),
            "trend_data": self._build_trend_data(audit_records),
            "action_items": self._extract_action_items(transcript_texts),
            "severity_distribution": self._severity_distribution(audit_records, combined_text),
        }

    # ── Data Loading ──────────────────────────────────────────────

    def _load_audit_data(self, file_paths):
        records = []
        for path in file_paths:
            ext = os.path.splitext(path)[1].lower()
            if ext == ".csv":
                records.extend(self._read_csv(path))
            elif ext == ".json":
                records.extend(self._read_json(path))
        return records

    def _load_transcripts(self, file_paths):
        texts = []
        for path in file_paths:
            ext = os.path.splitext(path)[1].lower()
            if ext in (".txt", ".md"):
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    texts.append(f.read())
            elif ext == ".json":
                data = self._read_json(path)
                for item in data:
                    if isinstance(item, dict):
                        for v in item.values():
                            texts.append(str(v))
                    else:
                        texts.append(str(item))
            elif ext == ".csv":
                rows = self._read_csv(path)
                for row in rows:
                    texts.append(" ".join(str(v) for v in row.values()))
        return texts

    def _read_csv(self, path):
        rows = []
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(dict(row))
        return rows

    def _read_json(self, path):
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        return [data]

    # ── Analysis Methods ──────────────────────────────────────────

    def _build_summary(self, audit_records, transcript_texts):
        return {
            "total_audit_records": len(audit_records),
            "total_transcripts": len(transcript_texts),
            "total_text_length": sum(len(t) for t in transcript_texts),
            "audit_fields": list(set(
                k for r in audit_records[:50] for k in r.keys()
            )) if audit_records else [],
        }

    def _calculate_risk_score(self, text):
        text_lower = text.lower()
        words = text_lower.split()
        total = max(len(words), 1)

        risk_hits = sum(1 for w in words if any(kw in w for kw in self.RISK_KEYWORDS))
        positive_hits = sum(1 for w in words if any(kw in w for kw in self.POSITIVE_KEYWORDS))

        raw = (risk_hits - positive_hits * 0.5) / total * 100
        score = max(0, min(100, raw * 10 + 30))  # normalize to 0-100 with baseline

        if score < 30:
            level = "Low"
        elif score < 60:
            level = "Medium"
        elif score < 80:
            level = "High"
        else:
            level = "Critical"

        return {
            "score": round(score, 1),
            "level": level,
            "risk_indicators": risk_hits,
            "positive_indicators": positive_hits,
        }

    def _categorize_findings(self, text):
        text_lower = text.lower()
        results = {}
        for category, keywords in self.CATEGORY_PATTERNS.items():
            count = sum(text_lower.count(kw) for kw in keywords)
            results[category] = count
        return results

    def _extract_key_findings(self, audit_records, transcript_texts):
        findings = []

        # Extract from audit records - look for status/finding/result fields
        status_fields = ["status", "finding", "result", "outcome", "severity", "issue", "description"]
        for record in audit_records[:100]:
            for field in status_fields:
                for key in record:
                    if field in key.lower() and record[key]:
                        val = str(record[key]).strip()
                        if len(val) > 5 and val.lower() not in ("n/a", "none", "null"):
                            findings.append({
                                "source": "audit",
                                "field": key,
                                "value": val[:200],
                            })
                            break

        # Extract from transcripts - sentences with risk keywords
        for i, text in enumerate(transcript_texts):
            sentences = re.split(r'[.!?\n]+', text)
            for sentence in sentences:
                s = sentence.strip()
                if len(s) > 20 and any(kw in s.lower() for kw in self.RISK_KEYWORDS):
                    findings.append({
                        "source": f"transcript_{i+1}",
                        "field": "excerpt",
                        "value": s[:200],
                    })

        # Deduplicate and limit
        seen = set()
        unique = []
        for f in findings:
            key = f["value"][:50]
            if key not in seen:
                seen.add(key)
                unique.append(f)
        return unique[:25]

    def _extract_themes(self, text):
        text_lower = text.lower()
        # Extract bigrams and trigrams as potential themes
        words = re.findall(r'\b[a-z]{3,}\b', text_lower)
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]

        # Count and filter for meaningful phrases
        counter = Counter(bigrams)
        stop_phrases = {"the the", "and the", "of the", "in the", "to the", "for the", "is the", "on the", "at the", "it the"}
        themes = [
            {"theme": phrase, "frequency": count}
            for phrase, count in counter.most_common(50)
            if phrase not in stop_phrases and count >= 2
        ]
        return themes[:15]

    def _find_compliance_gaps(self, audit_records, text):
        gaps = []
        text_lower = text.lower()

        gap_patterns = [
            (r"(?:non[- ]?complian\w+|not compliant)\s+(?:with\s+)?(.{10,80})", "Non-compliance"),
            (r"(?:missing|lack(?:ing)?|absent)\s+(.{10,80})", "Missing Control"),
            (r"(?:overdue|expired|lapsed)\s+(.{10,80})", "Overdue Item"),
            (r"(?:gap|deficiency|weakness)\s+(?:in\s+)?(.{10,80})", "Gap Identified"),
            (r"(?:fail(?:ed|ure)?|did not)\s+(.{10,80})", "Failure"),
        ]

        for pattern, gap_type in gap_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches[:5]:
                clean = re.sub(r'[.!?,;:\n]+$', '', match).strip()
                if len(clean) > 10:
                    gaps.append({"type": gap_type, "detail": clean[:150]})

        # Check audit records for non-pass statuses
        for record in audit_records[:100]:
            for key, value in record.items():
                val = str(value).lower().strip()
                if val in ("fail", "failed", "non-compliant", "incomplete", "overdue", "critical", "high"):
                    desc_fields = ["description", "finding", "detail", "issue", "name", "item", "control"]
                    detail = next(
                        (str(record.get(d, ""))[:150] for d in desc_fields if record.get(d)),
                        key
                    )
                    gaps.append({
                        "type": "Audit Finding",
                        "detail": f"{detail} (Status: {val})",
                    })

        return gaps[:20]

    def _build_trend_data(self, audit_records):
        """Try to build time-series data from audit records."""
        date_fields = []
        for record in audit_records[:10]:
            for key in record:
                if any(d in key.lower() for d in ["date", "time", "period", "month", "year"]):
                    date_fields.append(key)
                    break

        if not date_fields or not audit_records:
            return {"available": False, "message": "No date fields found in audit data"}

        date_field = date_fields[0]
        counts_by_period = Counter()
        for record in audit_records:
            val = str(record.get(date_field, "")).strip()
            if val:
                # Try to extract year-month
                match = re.search(r'(\d{4})[/-](\d{1,2})', val)
                if match:
                    period = f"{match.group(1)}-{match.group(2).zfill(2)}"
                    counts_by_period[period] += 1
                else:
                    counts_by_period[val[:10]] += 1

        sorted_periods = sorted(counts_by_period.items())
        return {
            "available": True,
            "date_field": date_field,
            "periods": [{"period": p, "count": c} for p, c in sorted_periods],
        }

    def _extract_action_items(self, transcript_texts):
        """Pull action items from transcript text."""
        actions = []
        action_patterns = [
            r"(?:action[: ]+|todo[: ]+|follow[- ]?up[: ]+|next step[s]?[: ]+)(.{10,150})",
            r"(?:need(?:s)? to|should|must|required to)\s+(.{10,120})",
            r"(?:recommend(?:ation)?[: ]+|suggest(?:ion)?[: ]+)(.{10,150})",
        ]

        for text in transcript_texts:
            for pattern in action_patterns:
                matches = re.findall(pattern, text.lower())
                for match in matches[:10]:
                    clean = re.sub(r'[.!?,;:\n]+$', '', match).strip()
                    if len(clean) > 10:
                        actions.append(clean[:150])

        # Deduplicate
        seen = set()
        unique = []
        for a in actions:
            key = a[:30]
            if key not in seen:
                seen.add(key)
                unique.append(a)
        return unique[:15]

    def _severity_distribution(self, audit_records, text):
        """Categorize findings by severity."""
        severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Info": 0}

        # From audit records
        for record in audit_records:
            for key, value in record.items():
                if "sever" in key.lower() or "risk" in key.lower() or "priority" in key.lower():
                    val = str(value).lower().strip()
                    if val in ("critical", "1"):
                        severity_counts["Critical"] += 1
                    elif val in ("high", "2"):
                        severity_counts["High"] += 1
                    elif val in ("medium", "moderate", "3"):
                        severity_counts["Medium"] += 1
                    elif val in ("low", "4"):
                        severity_counts["Low"] += 1
                    else:
                        severity_counts["Info"] += 1

        # If no severity field found, estimate from text
        if sum(severity_counts.values()) == 0:
            text_lower = text.lower()
            severity_counts["Critical"] = text_lower.count("critical")
            severity_counts["High"] = text_lower.count("high risk") + text_lower.count("high severity")
            severity_counts["Medium"] = text_lower.count("medium risk") + text_lower.count("moderate")
            severity_counts["Low"] = text_lower.count("low risk") + text_lower.count("low severity")

        return severity_counts
