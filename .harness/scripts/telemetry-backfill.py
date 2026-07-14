#!/usr/bin/env python3
"""
Telemetry backfill — rebuild .harness-run/telemetry/runs.jsonl from canonical artifacts.

Scans the per-sprint layout:
    .harness-run/sprints/<sprint_id>/contract.yaml   → one planner line (if .frozen exists)
    .harness-run/sprints/<sprint_id>/evals/v*.yaml   → one evaluator line per iteration

Idempotent: overwrites runs.jsonl from scratch on every invocation.
Lines sorted chronologically by metadata.created_at.

Usage (from harness root, i.e. the dir containing .harness/ and .harness-run/):
    python3 .harness/scripts/telemetry-backfill.py

Outputs:
    .harness-run/telemetry/runs.jsonl   (canonical, machine-parseable)

runs.jsonl is the source of truth for divergence measurement (guide §0.2 Level 2,
§3.5 sample-size formula). live.jsonl, written by agents themselves, is a
tripwire that an agent actually ran — runs.jsonl is what divergence.py queries.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("error: pyyaml required — install with `pip install pyyaml`", file=sys.stderr)
    sys.exit(2)


HARNESS_RUN = Path(".harness-run")
SPRINTS = HARNESS_RUN / "sprints"
OUT = HARNESS_RUN / "telemetry" / "runs.jsonl"


def parse_yaml(path: Path) -> dict[str, Any]:
    with path.open() as fh:
        return yaml.safe_load(fh) or {}


def iteration_from_eval_filename(path: Path) -> str:
    # evals/v1.yaml → "v1"; evals/v10.yaml → "v10"; fallback from metadata.id if needed.
    stem = path.stem
    return stem if re.fullmatch(r"v\d+", stem) else ""


def evaluator_line(report: dict[str, Any], fallback_iteration: str) -> dict[str, Any] | None:
    meta = report.get("metadata", {}) or {}
    payload = report.get("payload", {}) or {}
    audit = report.get("audit", {}) or {}
    if meta.get("type") != "eval_report":
        return None

    sprint_id = payload.get("sprint_id") or ""
    # metadata.id has format "<sprint_id>-v<N>"; extract v<N>
    meta_id = meta.get("id", "")
    iter_from_id = ""
    if sprint_id and meta_id.startswith(sprint_id + "-"):
        iter_from_id = meta_id[len(sprint_id) + 1 :]
    iteration = iter_from_id or fallback_iteration

    actual = payload.get("evaluator_version_hash_actual")
    expected = payload.get("evaluator_version_hash_expected")
    summary = payload.get("summary", {}) or {}
    token_cost = audit.get("token_cost", {}) or {}

    return {
        "ts": meta.get("created_at"),
        "agent": "evaluator",
        "sprint": sprint_id,
        "iteration": iteration,
        "verdict": summary.get("verdict"),
        "passed": summary.get("passed"),
        "failed": summary.get("failed"),
        "blocked": summary.get("blocked"),
        "total": summary.get("total"),
        "pin_match": (actual is not None and expected is not None and actual == expected),
        "evaluator_tag": payload.get("evaluator_version_tag"),
        "evaluator_hash_actual": actual,
        "evaluator_hash_expected": expected,
        "duration_s": audit.get("duration_seconds"),
        "tokens_in": token_cost.get("input"),
        "tokens_out": token_cost.get("output"),
        "cost_usd": token_cost.get("total_usd"),
        "model": audit.get("model"),
    }


def planner_line(contract: dict[str, Any]) -> dict[str, Any] | None:
    meta = contract.get("metadata", {}) or {}
    payload = contract.get("payload", {}) or {}
    audit = contract.get("audit", {}) or {}
    if meta.get("type") != "sprint_contract":
        return None

    sprint_id = payload.get("sprint_id") or meta.get("id", "")
    token_cost = audit.get("token_cost", {}) or {}

    return {
        "ts": meta.get("created_at"),
        "agent": "planner",
        "sprint": sprint_id,
        "phase": "final",
        "contract_frozen": True,
        "ac_count": len(payload.get("acceptance_criteria", []) or []),
        "gate_count": len(payload.get("quality_gates", []) or []),
        "nfr_count": len(payload.get("non_functional", []) or []),
        "duration_s": audit.get("duration_seconds"),
        "tokens_in": token_cost.get("input"),
        "tokens_out": token_cost.get("output"),
        "cost_usd": token_cost.get("total_usd"),
        "model": audit.get("model"),
    }


def collect_lines() -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []

    if not SPRINTS.is_dir():
        return lines

    for sprint_dir in sorted(p for p in SPRINTS.iterdir() if p.is_dir()):
        # Frozen contract → 1 planner line
        contract_path = sprint_dir / "contract.yaml"
        frozen_marker = sprint_dir / ".frozen"
        if contract_path.is_file() and frozen_marker.exists():
            try:
                doc = parse_yaml(contract_path)
            except yaml.YAMLError as exc:
                print(f"skip {contract_path}: YAML error — {exc}", file=sys.stderr)
            else:
                line = planner_line(doc)
                if line:
                    lines.append(line)

        # Eval reports under evals/v*.yaml → N evaluator lines
        evals_dir = sprint_dir / "evals"
        if evals_dir.is_dir():
            for eval_path in sorted(evals_dir.glob("v*.yaml")):
                try:
                    doc = parse_yaml(eval_path)
                except yaml.YAMLError as exc:
                    print(f"skip {eval_path}: YAML error — {exc}", file=sys.stderr)
                    continue
                line = evaluator_line(doc, fallback_iteration=iteration_from_eval_filename(eval_path))
                if line:
                    lines.append(line)

    lines.sort(key=lambda row: (row.get("ts") or "", row.get("sprint") or "", row.get("iteration") or ""))
    return lines


def main() -> int:
    if not HARNESS_RUN.is_dir():
        print(f"error: {HARNESS_RUN} not found — run from the harness root", file=sys.stderr)
        return 1

    lines = collect_lines()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w") as fh:
        for row in lines:
            fh.write(json.dumps(row, separators=(",", ":"), default=str) + "\n")

    evaluator_count = sum(1 for r in lines if r.get("agent") == "evaluator")
    planner_count = sum(1 for r in lines if r.get("agent") == "planner")
    print(f"wrote {len(lines)} lines to {OUT} (evaluator={evaluator_count}, planner={planner_count})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
