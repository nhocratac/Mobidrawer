"""Unit tests for harness-report.py. Run: python3 -m pytest test_harness_report.py -v"""
from __future__ import annotations

import datetime as dt
import importlib.util
import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).parent
SCRIPT = HERE / "harness-report.py"

# Dynamic import because filename has a hyphen
spec = importlib.util.spec_from_file_location("harness_report", SCRIPT)
assert spec and spec.loader
hr = importlib.util.module_from_spec(spec)
sys.modules["harness_report"] = hr
spec.loader.exec_module(hr)


# ---------- parse_args ----------

def test_parse_args_default_period_all_when_no_sprint():
    a = hr.parse_args(["--root", "/tmp"])
    assert a.period == "all"
    assert a.sprint is None


def test_parse_args_period_all_values_accepted():
    for p in ("weekly", "monthly", "sprint", "all"):
        a = hr.parse_args(["--period", p])
        assert a.period == p


def test_parse_args_invalid_period_rejected(capsys):
    with pytest.raises(SystemExit) as exc:
        hr.parse_args(["--period", "BOGUS"])
    assert exc.value.code != 0
    err = capsys.readouterr().err
    assert "invalid choice" in err


def test_parse_args_sprint_alone_works():
    a = hr.parse_args(["--sprint", "S1"])
    assert a.sprint == "S1"
    assert a.period is None


def test_parse_args_sprint_plus_period_rejected(capsys):
    with pytest.raises(SystemExit) as exc:
        hr.parse_args(["--sprint", "S1", "--period", "all"])
    assert exc.value.code != 0
    err = capsys.readouterr().err
    assert "cannot combine" in err


def test_parse_args_format_choices():
    for f in ("markdown", "json"):
        a = hr.parse_args(["--format", f])
        assert a.format == f
    with pytest.raises(SystemExit):
        hr.parse_args(["--format", "xml"])


# ---------- read_jsonl ----------

def test_read_jsonl_missing_file_returns_empty(tmp_path):
    rows, malformed = hr.read_jsonl(tmp_path / "nonexistent.jsonl")
    assert rows == []
    assert malformed == 0


def test_read_jsonl_skips_malformed_lines(tmp_path, capsys):
    p = tmp_path / "runs.jsonl"
    p.write_text('{"a":1}\nnot json\n\n{"b":2}\n')
    rows, malformed = hr.read_jsonl(p)
    assert rows == [{"a": 1}, {"b": 2}]
    assert malformed == 1
    assert "skipped 1 malformed" in capsys.readouterr().err


def test_read_jsonl_all_malformed_returns_empty(tmp_path, capsys):
    p = tmp_path / "runs.jsonl"
    p.write_text("garbage\nmore garbage\n")
    rows, malformed = hr.read_jsonl(p)
    assert rows == []
    assert malformed == 2


# ---------- filter_period ----------

def _row(ts: str, sprint: str = "S1", **extra) -> dict:
    return {"ts": ts, "sprint": sprint, **extra}


def test_filter_period_all_returns_everything():
    rows = [_row("2026-04-01T10:00:00Z"), _row("2026-04-20T10:00:00Z")]
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    assert hr.filter_period(rows, "all", now) == rows


def test_filter_period_weekly_drops_old():
    rows = [_row("2026-04-01T10:00:00Z"), _row("2026-04-20T10:00:00Z")]
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    out = hr.filter_period(rows, "weekly", now)
    assert len(out) == 1
    assert out[0]["ts"] == "2026-04-20T10:00:00Z"


def test_filter_period_sprint_keeps_only_latest():
    rows = [
        _row("2026-04-10T10:00:00Z", sprint="OLD"),
        _row("2026-04-20T10:00:00Z", sprint="NEW"),
        _row("2026-04-20T12:00:00Z", sprint="NEW"),
    ]
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    out = hr.filter_period(rows, "sprint", now)
    assert all(r["sprint"] == "NEW" for r in out)
    assert len(out) == 2


def test_filter_sprint_exact_match():
    rows = [_row("2026-04-10T10:00:00Z", sprint="A"), _row("2026-04-11T10:00:00Z", sprint="B")]
    out = hr.filter_sprint(rows, "A")
    assert len(out) == 1 and out[0]["sprint"] == "A"


# ---------- aggregate / per-agent ----------

def test_aggregate_summary_counts():
    rows = [
        {"sprint": "S1", "cost_usd": 1.5},
        {"sprint": "S1", "cost_usd": 2.5},
        {"sprint": "S2", "cost_usd": 3.0},
    ]
    s = hr.aggregate_summary(rows)
    assert s["total_runs"] == 3
    assert s["total_cost_usd"] == 7.0
    assert s["sprint_count"] == 2
    assert set(s["sprint_ids"]) == {"S1", "S2"}


def test_planner_metrics_returns_five_rows_empty_and_populated():
    assert len(hr.planner_metrics([], 0)) == 5
    rows = [
        {"agent": "planner", "phase": "final", "ac_count": 3, "gate_count": 2, "nfr_count": 2, "cost_usd": 1.0},
        {"agent": "planner", "phase": "final", "ac_count": 5, "gate_count": 3, "nfr_count": 4, "cost_usd": 2.0},
    ]
    metrics = hr.planner_metrics(rows, total_cost=10.0)
    assert len(metrics) == 5
    names = [m[0] for m in metrics]
    assert "Frozen contracts" in names
    assert "Cost share (%)" in names


def test_generator_metrics_returns_five_rows():
    assert len(hr.generator_metrics([], [], 0)) == 5


def test_evaluator_metrics_returns_five_rows():
    assert len(hr.evaluator_metrics([], [])) == 5
    eval_rows = [
        {"agent": "evaluator", "iteration": "v1", "verdict": "PASS", "pin_match": True, "cost_usd": 1.5},
        {"agent": "evaluator", "iteration": "v2", "verdict": "FAIL", "pin_match": True, "cost_usd": 1.0},
    ]
    m = hr.evaluator_metrics(eval_rows, [])
    assert len(m) == 5


# ---------- rendering ----------

def _fixture_rows() -> list[dict]:
    return [
        {"ts": "2026-04-20T10:00:00Z", "agent": "planner", "sprint": "S1", "phase": "final",
         "ac_count": 3, "gate_count": 2, "nfr_count": 2, "cost_usd": 1.2},
        {"ts": "2026-04-20T11:00:00Z", "agent": "evaluator", "sprint": "S1", "iteration": "v1",
         "verdict": "PASS", "passed": 7, "failed": 0, "blocked": 0, "total": 7,
         "pin_match": True, "cost_usd": 1.5},
    ]


def test_build_report_all_period(tmp_path):
    (tmp_path / ".harness-run" / "telemetry").mkdir(parents=True)
    p = tmp_path / ".harness-run" / "telemetry" / "runs.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in _fixture_rows()) + "\n")
    args = hr.parse_args(["--root", str(tmp_path), "--period", "all"])
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    report = hr.build_report(args, now)
    assert report is not None
    for key in ("period", "generated_at", "summary", "per_agent", "sprints"):
        assert key in report


def test_build_report_empty_returns_none(tmp_path):
    (tmp_path / ".harness-run" / "telemetry").mkdir(parents=True)
    args = hr.parse_args(["--root", str(tmp_path), "--period", "all"])
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    assert hr.build_report(args, now) is None


def test_render_markdown_contains_all_sections(tmp_path):
    (tmp_path / ".harness-run" / "telemetry").mkdir(parents=True)
    p = tmp_path / ".harness-run" / "telemetry" / "runs.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in _fixture_rows()) + "\n")
    args = hr.parse_args(["--root", str(tmp_path), "--period", "all"])
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    report = hr.build_report(args, now)
    md = hr.render_markdown(report)
    for section in ("# Harness Report", "## Cost Summary", "## Iteration Distribution",
                    "## Pin Health", "## Canary Health", "## Per-agent Effectiveness",
                    "## Disagreement Summary", "## Top Actions",
                    "### Planner", "### Generator", "### Evaluator"):
        assert section in md, f"missing: {section!r}"


def test_render_json_has_required_keys(tmp_path):
    (tmp_path / ".harness-run" / "telemetry").mkdir(parents=True)
    p = tmp_path / ".harness-run" / "telemetry" / "runs.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in _fixture_rows()) + "\n")
    args = hr.parse_args(["--root", str(tmp_path), "--format", "json", "--period", "all"])
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    report = hr.build_report(args, now)
    js = json.loads(hr.render_json(report))
    required = {"period", "generated_at", "summary", "per_agent", "sprints"}
    assert required.issubset(js.keys()), f"missing: {required - set(js.keys())}"


def test_deterministic_output_same_input(tmp_path):
    (tmp_path / ".harness-run" / "telemetry").mkdir(parents=True)
    p = tmp_path / ".harness-run" / "telemetry" / "runs.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in _fixture_rows()) + "\n")
    args = hr.parse_args(["--root", str(tmp_path), "--period", "all"])
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    r1 = hr.render_markdown(hr.build_report(args, now))
    r2 = hr.render_markdown(hr.build_report(args, now))
    assert r1 == r2


def test_cli_output_byte_identical_across_runs(tmp_path):
    """Regression test for AC-3 Part B: two subprocess CLI runs must produce identical stdout."""
    import subprocess
    (tmp_path / ".harness-run" / "telemetry").mkdir(parents=True)
    p = tmp_path / ".harness-run" / "telemetry" / "runs.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in _fixture_rows()) + "\n")
    cmd = [sys.executable, str(SCRIPT), "--root", str(tmp_path), "--period", "all"]
    r1 = subprocess.run(cmd, capture_output=True, text=True, check=True)
    r2 = subprocess.run(cmd, capture_output=True, text=True, check=True)
    assert r1.stdout == r2.stdout, "CLI output not deterministic across separate subprocess runs"


def test_sprint_filter_excludes_others(tmp_path):
    (tmp_path / ".harness-run" / "telemetry").mkdir(parents=True)
    rows = _fixture_rows() + [
        {"ts": "2026-04-21T10:00:00Z", "agent": "evaluator", "sprint": "S2",
         "iteration": "v1", "verdict": "FAIL", "passed": 1, "failed": 2, "blocked": 0,
         "total": 3, "pin_match": True, "cost_usd": 1.0}
    ]
    p = tmp_path / ".harness-run" / "telemetry" / "runs.jsonl"
    p.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    args = hr.parse_args(["--root", str(tmp_path), "--sprint", "S1"])
    now = dt.datetime(2026, 4, 23, tzinfo=dt.timezone.utc)
    report = hr.build_report(args, now)
    assert report is not None
    sprint_ids = {s["sprint_id"] for s in report["sprints"]}
    assert sprint_ids == {"S1"}
