"""Streamlit dashboard for audit data analysis and transcript review."""

import pandas as pd
import plotly.express as px
import streamlit as st

# ── Page Config ──────────────────────────────────────────────────

st.set_page_config(page_title="Audit Insights Dashboard", layout="wide")

# ── Severity-to-Score Mapping ────────────────────────────────────

SEVERITY_SCORE = {
    "critical": 40,
    "high": 60,
    "medium": 75,
    "low": 90,
    "info": 95,
}


def severity_to_score(val):
    """Convert a severity label to a numeric audit score (0-100, higher = better)."""
    return SEVERITY_SCORE.get(str(val).strip().lower(), 70)


# ── Column Auto-Detection ────────────────────────────────────────

def detect_column(columns, candidates):
    """Return the first column whose name contains one of the candidate substrings."""
    for col in columns:
        for candidate in candidates:
            if candidate in col.lower():
                return col
    return None


# ── Header ───────────────────────────────────────────────────────

st.title("Audit Insights Dashboard")
st.markdown("Upload audit data and transcripts to explore metrics, scores, and agent performance.")

# ── File Upload ──────────────────────────────────────────────────

col_upload1, col_upload2 = st.columns(2)

with col_upload1:
    st.subheader("Audit Data")
    audit_file = st.file_uploader("Upload audit CSV", type=["csv"], key="audit")

with col_upload2:
    st.subheader("Transcripts")
    transcript_file = st.file_uploader("Upload transcript CSV", type=["csv"], key="transcript")

# ── Load DataFrames ──────────────────────────────────────────────

audit_df = None
transcript_df = None

if audit_file:
    audit_df = pd.read_csv(audit_file)
if transcript_file:
    transcript_df = pd.read_csv(transcript_file)

# ── File Previews ────────────────────────────────────────────────

if audit_df is not None or transcript_df is not None:
    st.divider()
    st.subheader("Data Preview")
    prev1, prev2 = st.columns(2)

    with prev1:
        if audit_df is not None:
            st.markdown("**Audit Data**")
            st.dataframe(audit_df.head(10), use_container_width=True)
        else:
            st.info("No audit file uploaded yet.")

    with prev2:
        if transcript_df is not None:
            st.markdown("**Transcripts**")
            st.dataframe(transcript_df.head(10), use_container_width=True)
        else:
            st.info("No transcript file uploaded yet.")

# ── Dashboard (requires audit data) ─────────────────────────────

if audit_df is not None:
    st.divider()

    # -- Column mapping via sidebar ------------------------------------
    columns = list(audit_df.columns)

    with st.sidebar:
        st.header("Column Mapping")
        st.caption("Map your CSV columns to the dashboard fields.")

        agent_default = detect_column(columns, ["agent", "category", "group", "team", "assigned"])
        score_default = detect_column(columns, ["score", "rating", "grade", "severity"])

        agent_col = st.selectbox(
            "Agent / Group column",
            columns,
            index=columns.index(agent_default) if agent_default else 0,
        )
        score_col = st.selectbox(
            "Score / Severity column",
            columns,
            index=columns.index(score_default) if score_default else 0,
        )

    # -- Derive numeric score column -----------------------------------
    # If the column is already numeric, use it directly.
    # Otherwise, treat as severity labels and map to scores.
    if pd.api.types.is_numeric_dtype(audit_df[score_col]):
        audit_df["_score"] = audit_df[score_col]
    else:
        audit_df["_score"] = audit_df[score_col].apply(severity_to_score)

    # ── Key Metrics ──────────────────────────────────────────────

    st.subheader("Key Metrics")
    m1, m2, m3 = st.columns(3)

    total_calls = len(audit_df)
    avg_score = round(audit_df["_score"].mean(), 1)
    total_agents = audit_df[agent_col].nunique()

    m1.metric("Total Calls", f"{total_calls:,}")
    m2.metric("Average Audit Score", f"{avg_score}")
    m3.metric("Total Agents", f"{total_agents}")

    # ── Agent-wise Average Score Bar Chart ───────────────────────

    st.divider()
    st.subheader("Agent-wise Average Audit Score")

    agent_avg = (
        audit_df.groupby(agent_col, as_index=False)["_score"]
        .mean()
        .rename(columns={"_score": "Avg Score"})
        .sort_values("Avg Score", ascending=True)
    )
    agent_avg["Avg Score"] = agent_avg["Avg Score"].round(1)

    fig = px.bar(
        agent_avg,
        x="Avg Score",
        y=agent_col,
        orientation="h",
        text="Avg Score",
        color="Avg Score",
        color_continuous_scale="RdYlGn",
        range_color=[0, 100],
    )
    fig.update_layout(
        yaxis_title="",
        xaxis_title="Average Score",
        coloraxis_showscale=False,
        height=max(350, len(agent_avg) * 45),
        margin=dict(l=0, r=20, t=10, b=40),
    )
    fig.update_traces(textposition="outside")
    st.plotly_chart(fig, use_container_width=True)

    # ── Severity Distribution ────────────────────────────────────

    st.divider()
    st.subheader("Score Distribution")

    fig_hist = px.histogram(
        audit_df,
        x="_score",
        nbins=10,
        color_discrete_sequence=["#6366f1"],
        labels={"_score": "Audit Score"},
    )
    fig_hist.update_layout(
        yaxis_title="Count",
        xaxis_title="Audit Score",
        bargap=0.1,
        height=350,
        margin=dict(l=0, r=20, t=10, b=40),
    )
    st.plotly_chart(fig_hist, use_container_width=True)

else:
    st.divider()
    st.info("Upload an **Audit Data** CSV to see the dashboard.")
