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


def detect_column(columns, candidates):
    """Return the first column whose name contains one of the candidate substrings."""
    for col in columns:
        for candidate in candidates:
            if candidate in col.lower():
                return col
    return None


# ── Header ───────────────────────────────────────────────────────

st.title("Audit Insights Dashboard")

# ── Step 1: Upload Files ─────────────────────────────────────────

st.header("Step 1 — Upload Files")

col_upload1, col_upload2 = st.columns(2)

with col_upload1:
    audit_file = st.file_uploader("Audit Data (CSV)", type=["csv"], key="audit")

with col_upload2:
    transcript_file = st.file_uploader("Transcripts (CSV)", type=["csv"], key="transcript")

# ── Load DataFrames ──────────────────────────────────────────────

audit_df = None
transcript_df = None

if audit_file:
    audit_df = pd.read_csv(audit_file)
if transcript_file:
    transcript_df = pd.read_csv(transcript_file)

if audit_df is None and transcript_df is None:
    st.info("Upload at least the **Audit Data** CSV to get started.")
    st.stop()

# ── Step 2: Preview Data ─────────────────────────────────────────

st.header("Step 2 — Preview Data")

prev1, prev2 = st.columns(2)

with prev1:
    if audit_df is not None:
        st.markdown(f"**Audit Data** — {len(audit_df):,} rows, {len(audit_df.columns)} columns")
        st.dataframe(audit_df.head(10), use_container_width=True)
    else:
        st.info("No audit file uploaded.")

with prev2:
    if transcript_df is not None:
        st.markdown(f"**Transcripts** — {len(transcript_df):,} rows, {len(transcript_df.columns)} columns")
        st.dataframe(transcript_df.head(10), use_container_width=True)
    else:
        st.info("No transcript file uploaded.")

if audit_df is None:
    st.warning("Upload an **Audit Data** CSV to continue to the dashboard.")
    st.stop()

# ── Step 3: Map Columns ──────────────────────────────────────────

st.header("Step 3 — Map Columns")
st.caption("Select which columns represent the agent/group and the score/severity.")

columns = list(audit_df.columns)
agent_default = detect_column(columns, ["agent", "category", "group", "team", "assigned"])
score_default = detect_column(columns, ["score", "rating", "grade", "severity"])

map1, map2 = st.columns(2)

with map1:
    agent_col = st.selectbox(
        "Agent / Group column",
        columns,
        index=columns.index(agent_default) if agent_default else 0,
    )

with map2:
    score_col = st.selectbox(
        "Score / Severity column",
        columns,
        index=columns.index(score_default) if score_default else 0,
    )

# Show a sample of the selected columns so the user can verify
sample = audit_df[[agent_col, score_col]].head(5)
st.markdown("**Selected columns preview:**")
st.dataframe(sample, use_container_width=False, hide_index=True)

# ── Derive numeric score column ──────────────────────────────────

if pd.api.types.is_numeric_dtype(audit_df[score_col]):
    audit_df["_score"] = audit_df[score_col]
else:
    audit_df["_score"] = audit_df[score_col].apply(severity_to_score)
    st.caption(
        f"Non-numeric column detected — mapped severity labels to scores: "
        f"Critical→40, High→60, Medium→75, Low→90, Info→95."
    )

# ── Step 4: Dashboard ────────────────────────────────────────────

st.divider()
st.header("Step 4 — Dashboard")

# ── Key Metrics ──────────────────────────────────────────────────

m1, m2, m3 = st.columns(3)

total_calls = len(audit_df)
avg_score = round(audit_df["_score"].mean(), 1)
total_agents = audit_df[agent_col].nunique()

m1.metric("Total Calls", f"{total_calls:,}")
m2.metric("Average Audit Score", f"{avg_score}")
m3.metric("Total Agents", f"{total_agents}")

# ── Agent-wise Average Score Bar Chart ───────────────────────────

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

# ── Score Distribution ───────────────────────────────────────────

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
