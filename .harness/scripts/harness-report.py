#!/usr/bin/env python3
"""
harness-report — periodic markdown/JSON report from harness telemetry.

Reads:
    <root>/.harness-run/telemetry/runs.jsonl          (canonical, from telemetry-backfill.py)
    <root>/.harness-run/telemetry/disagreements.jsonl (human-appended via log-disagreement skill)
    <root>/.harness-run/sprints/<id>/abort.md         (abort-and-restart markers, §4.6)

Emits to stdout:
    markdown report (default) — 8 required sections per harness-engineering guide §0.2
    JSON dict                   — keys: period, generated_at, summary, per_agent, sprints

Never crashes on missing/malformed data. Deterministic: same input → byte-identical output.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path
from typing import Any

PERIOD_CHOICES = ("weekly", "monthly", "sprint", "all")
FORMAT_CHOICES = ("markdown", "json")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="harness-report",
        description="Emit a markdown/JSON report from .harness-run telemetry.",
    )
    p.add_argument("--root", default=Path("."), type=Path, help="repo root (default: current dir)")
    p.add_argument("--period", choices=PERIOD_CHOICES, default=None,
                   help="scope window: weekly|monthly|sprint(latest)|all")
    p.add_argument("--sprint", default=None, help="single sprint_id to report on")
    p.add_argument("--format", choices=FORMAT_CHOICES, default="markdown", help="output format")
    args = p.parse_args(argv)
    if args.sprint and args.period:
        p.error("cannot combine --sprint with --period; use one or the other")
    if not args.sprint and not args.period:
        args.period = "all"
    return args


def read_jsonl(path: Path) -> tuple[list[dict[str, Any]], int]:
    if not path.is_file():
        return [], 0
    rows: list[dict[str, Any]] = []
    malformed = 0
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            malformed += 1
    if malformed:
        print(f"warn: skipped {malformed} malformed lines in {path}", file=sys.stderr)
    return rows, malformed


def parse_ts(row: dict[str, Any]) -> dt.datetime | None:
    raw = row.get("ts") or ""
    try:
        return dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def filter_period(rows: list[dict], period: str, now: dt.datetime) -> list[dict]:
    if period == "all":
        return list(rows)
    if period == "sprint":
        timed = [(parse_ts(r), r) for r in rows]
        timed = [(t, r) for t, r in timed if t is not None]
        if not timed:
            return []
        timed.sort(key=lambda x: x[0], reverse=True)
        latest_sprint = timed[0][1].get("sprint")
        return [r for r in rows if r.get("sprint") == latest_sprint]
    days = {"weekly": 7, "monthly": 30}[period]
    cutoff = now - dt.timedelta(days=days)
    out = []
    for r in rows:
        t = parse_ts(r)
        if t is not None and t >= cutoff:
            out.append(r)
    return out


def filter_sprint(rows: list[dict], sprint_id: str) -> list[dict]:
    return [r for r in rows if r.get("sprint") == sprint_id]


def _round(x: float | None) -> float:
    return round(x or 0, 2)


def aggregate_summary(rows: list[dict]) -> dict[str, Any]:
    sprints = sorted({r.get("sprint") for r in rows if r.get("sprint")})
    return {
        "total_runs": len(rows),
        "total_cost_usd": _round(sum((r.get("cost_usd") or 0) for r in rows)),
        "sprint_count": len(sprints),
        "sprint_ids": sprints,
    }


def sprints_breakdown(rows: list[dict]) -> list[dict]:
    out = []
    seen = sorted({r.get("sprint") for r in rows if r.get("sprint")})
    for sid in seen:
        sr = [r for r in rows if r.get("sprint") == sid]
        eval_rows = [r for r in sr if r.get("agent") == "evaluator"]
        eval_rows.sort(key=lambda r: (parse_ts(r) or dt.datetime.min.replace(tzinfo=dt.timezone.utc)))
        final = eval_rows[-1].get("verdict") if eval_rows else None
        first_ts = min((r.get("ts") or "" for r in sr), default="")
        out.append({
            "sprint_id": sid,
            "ts": first_ts,
            "iterations": len(eval_rows),
            "final_verdict": final,
            "cost_usd": _round(sum((r.get("cost_usd") or 0) for r in sr)),
        })
    out.sort(key=lambda s: (s["ts"], s["sprint_id"]))
    return out


def planner_metrics(rows: list[dict], total_cost: float) -> list[tuple[str, str]]:
    planner_rows = [r for r in rows if r.get("agent") == "planner" and r.get("phase") == "final"]
    n = len(planner_rows)
    if n == 0:
        return [
            ("Frozen contracts", "0"),
            ("Avg AC count per contract", "n/a"),
            ("Avg gate count per contract", "n/a"),
            ("Avg NFR count per contract", "n/a"),
            ("Cost share (%)", "n/a"),
        ]
    avg_ac = sum((r.get("ac_count") or 0) for r in planner_rows) / n
    avg_gate = sum((r.get("gate_count") or 0) for r in planner_rows) / n
    avg_nfr = sum((r.get("nfr_count") or 0) for r in planner_rows) / n
    planner_cost = sum((r.get("cost_usd") or 0) for r in planner_rows)
    share = (planner_cost / total_cost * 100) if total_cost > 0 else 0
    return [
        ("Frozen contracts", str(n)),
        ("Avg AC count per contract", f"{avg_ac:.1f}"),
        ("Avg gate count per contract", f"{avg_gate:.1f}"),
        ("Avg NFR count per contract", f"{avg_nfr:.1f}"),
        ("Cost share (%)", f"{share:.1f}"),
    ]


def generator_metrics(eval_rows: list[dict], sprints_data: list[dict], abort_count: int) -> list[tuple[str, str]]:
    total_sprints = len(sprints_data)
    if total_sprints == 0:
        return [
            ("v1 PASS rate (%)", "n/a"),
            ("Avg iterations per sprint", "n/a"),
            ("Sprints aborted", str(abort_count)),
            ("Sprints with >=3 iterations", "n/a"),
            ("Sprints with any FAIL round", "n/a"),
        ]
    v1_pass = sum(1 for r in eval_rows if r.get("iteration") == "v1" and r.get("verdict") == "PASS")
    v1_total = sum(1 for r in eval_rows if r.get("iteration") == "v1")
    v1_rate = (v1_pass / v1_total * 100) if v1_total > 0 else 0
    avg_iter = sum(s["iterations"] for s in sprints_data) / total_sprints
    three_plus = sum(1 for s in sprints_data if s["iterations"] >= 3)
    any_fail = sum(
        1 for s in sprints_data
        if any(r.get("sprint") == s["sprint_id"] and r.get("verdict") == "FAIL" for r in eval_rows)
    )
    return [
        ("v1 PASS rate (%)", f"{v1_rate:.1f}"),
        ("Avg iterations per sprint", f"{avg_iter:.2f}"),
        ("Sprints aborted", str(abort_count)),
        ("Sprints with >=3 iterations", str(three_plus)),
        ("Sprints with any FAIL round", str(any_fail)),
    ]


def evaluator_metrics(eval_rows: list[dict], disagreements: list[dict]) -> list[tuple[str, str]]:
    n = len(eval_rows)
    if n == 0:
        return [
            ("Total eval runs", "0"),
            ("Pin match rate (%)", "n/a"),
            ("Verdict PASS rate (%)", "n/a"),
            ("Avg cost per eval ($)", "n/a"),
            ("Divergence count (humans disagreed)", str(len(disagreements))),
        ]
    pin_ok = sum(1 for r in eval_rows if r.get("pin_match") is True)
    pass_ct = sum(1 for r in eval_rows if r.get("verdict") == "PASS")
    avg_cost = sum((r.get("cost_usd") or 0) for r in eval_rows) / n
    return [
        ("Total eval runs", str(n)),
        ("Pin match rate (%)", f"{pin_ok / n * 100:.1f}"),
        ("Verdict PASS rate (%)", f"{pass_ct / n * 100:.1f}"),
        ("Avg cost per eval ($)", f"{avg_cost:.2f}"),
        ("Divergence count (humans disagreed)", str(len(disagreements))),
    ]


def count_aborts(sprints_dir: Path) -> int:
    if not sprints_dir.is_dir():
        return 0
    return sum(1 for p in sprints_dir.glob("*/abort.md"))


def canary_stats(rows: list[dict]) -> dict[str, Any]:
    canary_rows = [r for r in rows if r.get("agent") == "evaluator" and (r.get("sprint") or "").lower().startswith("canary")]
    total = len(canary_rows)
    passed = sum(1 for r in canary_rows if r.get("verdict") == "PASS")
    return {"total": total, "passed": passed, "rate_pct": (passed / total * 100) if total > 0 else None}


def pin_stats(rows: list[dict]) -> dict[str, Any]:
    eval_rows = [r for r in rows if r.get("agent") == "evaluator"]
    mismatches = sum(1 for r in eval_rows if r.get("pin_match") is False)
    return {"total_evals": len(eval_rows), "mismatches": mismatches}


def iteration_distribution(sprints_data: list[dict]) -> dict[str, int]:
    buckets = {"v1_pass": 0, "v2_pass": 0, "v3_plus_pass": 0, "failed": 0, "inconclusive": 0}
    for s in sprints_data:
        v = s.get("final_verdict")
        it = s.get("iterations") or 0
        if v == "PASS":
            if it <= 1:
                buckets["v1_pass"] += 1
            elif it == 2:
                buckets["v2_pass"] += 1
            else:
                buckets["v3_plus_pass"] += 1
        elif v == "FAIL":
            buckets["failed"] += 1
        elif v == "INCONCLUSIVE":
            buckets["inconclusive"] += 1
    return buckets


def derive_top_actions(
    summary: dict, per_agent: dict, sprints_data: list[dict], pin: dict, canary: dict,
) -> list[str]:
    actions: list[str] = []
    if pin["mismatches"] > 0:
        actions.append(f"🚨 {pin['mismatches']} pin mismatch(es) detected — investigate evaluator drift before next sprint.")
    if canary["total"] > 0 and canary["passed"] < canary["total"]:
        actions.append(f"🚨 Canary failures {canary['total'] - canary['passed']}/{canary['total']} — Evaluator may be broken, block pipeline.")
    failed_sprints = sum(1 for s in sprints_data if s.get("final_verdict") == "FAIL")
    if failed_sprints and failed_sprints >= max(1, len(sprints_data) // 4):
        actions.append(f"⚠️  {failed_sprints}/{len(sprints_data)} sprints ended in FAIL — review Planner contract quality or Generator prompts.")
    three_plus = sum(1 for s in sprints_data if (s.get("iterations") or 0) >= 3)
    if three_plus >= 2:
        actions.append(f"⚠️  {three_plus} sprints hit ≥3 iterations — likely contract ambiguity, not Generator code issues.")
    if not actions:
        actions.append("No red flags from telemetry — keep shipping.")
    return actions


def render_markdown(report: dict) -> str:
    out: list[str] = []
    s = report["summary"]
    p = report["pin_health"]
    c = report["canary_health"]
    it = report["iteration_distribution"]
    avg_per_sprint = (s["total_cost_usd"] / s["sprint_count"]) if s["sprint_count"] > 0 else 0
    out += [
        "# Harness Report", "",
        f"**Scope**: {report['period']}  |  **Generated**: {report['generated_at']}", "",
        f"Sprints: {s['sprint_count']} · Runs: {s['total_runs']} · Total cost: ${s['total_cost_usd']:.2f}", "",
        "## Cost Summary", "",
        "| Metric | Value |", "|--------|-------|",
        f"| Total cost | ${s['total_cost_usd']:.2f} |",
        f"| Avg cost per sprint | ${avg_per_sprint:.2f} |",
        f"| Sprint count | {s['sprint_count']} |", "",
        "## Iteration Distribution", "",
        "| Outcome | Sprints |", "|---------|---------|",
        f"| PASS at v1 | {it['v1_pass']} |",
        f"| PASS at v2 | {it['v2_pass']} |",
        f"| PASS at v3+ | {it['v3_plus_pass']} |",
        f"| FAIL (after iterations) | {it['failed']} |",
        f"| INCONCLUSIVE (blocked) | {it['inconclusive']} |", "",
        "## Pin Health", "",
        f"Eval runs: **{p['total_evals']}**  ·  Pin mismatches: **{p['mismatches']}**  (must be 0 in healthy state)", "",
        "## Canary Health", "",
        ("_No canary runs detected in scope. Canary sprints have id starting with `canary-`._"
         if c["total"] == 0 else
         f"Canary runs: **{c['total']}**  ·  Passed: **{c['passed']}**  ·  Pass rate: **{c['rate_pct']:.1f}%**"), "",
        "## Per-agent Effectiveness", "",
    ]
    for label, metrics in (("Planner", report["per_agent"]["planner"]),
                           ("Generator", report["per_agent"]["generator"]),
                           ("Evaluator", report["per_agent"]["evaluator"])):
        out += [f"### {label}", "", "| Metric | Value |", "|--------|-------|"]
        out += [f"| {m} | {v} |" for m, v in metrics]
        out.append("")
    dcount = report["disagreements_count"]
    out += ["## Disagreement Summary", "",
            ("_No disagreements logged. Run `log-disagreement` skill when Evaluator verdict differs from human review._"
             if dcount == 0 else
             f"Total disagreements logged: **{dcount}**. Run `divergence.py` for Wilson CI and FP/FN breakdown."), ""]
    if report["sprints"]:
        out += ["### Sprints in scope", "",
                "| sprint_id | ts | iterations | final | cost_usd |",
                "|-----------|----|-----------:|-------|---------:|"]
        out += [f"| {sp['sprint_id']} | {sp['ts']} | {sp['iterations']} | {sp['final_verdict'] or '-'} | {sp['cost_usd']:.2f} |"
                for sp in report["sprints"]]
        out.append("")
    out += ["## Top Actions", ""]
    out += [f"{i}. {a}" for i, a in enumerate(report["top_actions"], 1)]
    out.append("")
    return "\n".join(out)


def render_json(report: dict) -> str:
    return json.dumps(report, indent=2, default=str, sort_keys=True)


def build_report(args: argparse.Namespace, now: dt.datetime) -> dict[str, Any] | None:
    root = args.root
    runs_path = root / ".harness-run" / "telemetry" / "runs.jsonl"
    disagreements_path = root / ".harness-run" / "telemetry" / "disagreements.jsonl"
    sprints_dir = root / ".harness-run" / "sprints"

    runs, _ = read_jsonl(runs_path)
    disagreements, _ = read_jsonl(disagreements_path)

    if not runs:
        return None  # caller prints empty-state message

    if args.sprint:
        filtered = filter_sprint(runs, args.sprint)
        period_str = f"sprint:{args.sprint}"
    else:
        filtered = filter_period(runs, args.period, now)
        period_str = args.period

    summary = aggregate_summary(filtered)
    sprints_data = sprints_breakdown(filtered)
    abort_ct = count_aborts(sprints_dir)
    eval_rows = [r for r in filtered if r.get("agent") == "evaluator"]

    per_agent = {
        "planner": planner_metrics(filtered, summary["total_cost_usd"]),
        "generator": generator_metrics(eval_rows, sprints_data, abort_ct),
        "evaluator": evaluator_metrics(eval_rows, disagreements),
    }
    pin = pin_stats(filtered)
    canary = canary_stats(filtered)
    it_dist = iteration_distribution(sprints_data)
    top_actions = derive_top_actions(summary, per_agent, sprints_data, pin, canary)

    # `generated_at` derives from input (max ts of filtered rows) not wall-clock, for determinism.
    valid_ts = sorted((r.get("ts") for r in filtered if r.get("ts")), reverse=True)
    data_as_of = valid_ts[0] if valid_ts else "1970-01-01T00:00:00Z"

    return {
        "period": period_str,
        "generated_at": data_as_of,
        "summary": summary,
        "per_agent": per_agent,
        "sprints": sprints_data,
        "iteration_distribution": it_dist,
        "pin_health": pin,
        "canary_health": canary,
        "disagreements_count": len(disagreements),
        "top_actions": top_actions,
    }


def main(argv: list[str] | None = None, now: dt.datetime | None = None) -> int:
    args = parse_args(argv)
    if now is None:
        now = dt.datetime.now(tz=dt.timezone.utc)
    report = build_report(args, now)
    if report is None:
        print("no telemetry data yet — run /harness-eval or populate .harness-run/telemetry/runs.jsonl first")
        return 0
    if args.format == "json":
        print(render_json(report))
    else:
        print(render_markdown(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
