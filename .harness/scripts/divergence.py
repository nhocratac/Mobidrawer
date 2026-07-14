#!/usr/bin/env python3
"""
Divergence analysis — joins runs.jsonl with disagreements.jsonl.

Reports:
    - Sample size (reviewed eval runs)
    - Divergence rate + Wilson 95% confidence interval
    - False-positive / false-negative breakdown
    - Per-AC concentration warning (§0.2 Level 2: >60% of disagreements in one
      category → pattern error rather than random skeptic bias)
    - Progress toward the §3.5 sample-size target (96 runs at ±10%, E=0.10)

Usage:
    python3 .harness/scripts/divergence.py

An eval run is "reviewed" when either:
    - A matching line exists in disagreements.jsonl (human found Evaluator wrong), OR
    - The run was explicitly confirmed-agree (not yet implemented as separate log;
      for now, reviewed = has-disagreement-entry; future: add agreements.jsonl).

Matching keys: (sprint, iteration). Only "evaluator" agent rows are considered.
"""
from __future__ import annotations

import json
import math
import sys
from collections import Counter
from pathlib import Path

HARNESS_RUN = Path(".harness-run")
TELEMETRY = HARNESS_RUN / "telemetry"
RUNS = TELEMETRY / "runs.jsonl"
DISAGREES = TELEMETRY / "disagreements.jsonl"

# §3.5 sample-size targets
TARGET_RUNS_10PCT = 96
TARGET_RUNS_15PCT = 43
TARGET_RUNS_20PCT = 24

# §0.2 Level 2 alert threshold
CONCENTRATION_ALERT = 0.60


def read_jsonl(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    out: list[dict] = []
    for line_num, raw in enumerate(path.read_text().splitlines(), 1):
        raw = raw.strip()
        if not raw:
            continue
        try:
            out.append(json.loads(raw))
        except json.JSONDecodeError as exc:
            print(f"warn: {path}:{line_num} malformed JSON — {exc}", file=sys.stderr)
    return out


def wilson_interval(successes: int, total: int, z: float = 1.96) -> tuple[float, float]:
    """Wilson score interval — works correctly for small N and extreme proportions."""
    if total == 0:
        return (0.0, 0.0)
    p = successes / total
    denom = 1 + z * z / total
    centre = (p + z * z / (2 * total)) / denom
    margin = z * math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denom
    return (max(0.0, centre - margin), min(1.0, centre + margin))


def main() -> int:
    if not RUNS.is_file():
        print(f"error: {RUNS} not found. Run telemetry-backfill.py first.", file=sys.stderr)
        return 1

    runs = [r for r in read_jsonl(RUNS) if r.get("agent") == "evaluator"]
    disagrees = read_jsonl(DISAGREES)

    total_runs = len(runs)
    if total_runs == 0:
        print("no evaluator runs found in runs.jsonl")
        return 0

    # Index disagreements by (sprint, iteration)
    disagree_map = {(d.get("sprint"), d.get("iteration")): d for d in disagrees}

    reviewed = 0
    fp = 0  # Evaluator FAIL, human PASS
    fn = 0  # Evaluator PASS, human FAIL
    other = 0  # verdict shift (e.g. FAIL → INCONCLUSIVE)
    ac_counter: Counter[str] = Counter()

    for run in runs:
        key = (run.get("sprint"), run.get("iteration"))
        if key not in disagree_map:
            continue
        reviewed += 1
        d = disagree_map[key]
        ev = (run.get("verdict") or "").upper()
        hu = (d.get("human_verdict") or "").upper()
        if ev == "FAIL" and hu == "PASS":
            fp += 1
        elif ev == "PASS" and hu == "FAIL":
            fn += 1
        else:
            other += 1
        for ac in d.get("ac_affected") or []:
            ac_counter[ac] += 1

    divergence_total = fp + fn + other
    div_rate = divergence_total / reviewed if reviewed else 0.0
    lo, hi = wilson_interval(divergence_total, reviewed)

    # Output
    print(f"═══ Divergence report ═══")
    print(f"Total evaluator runs logged:      {total_runs}")
    print(f"Runs with human disagreement:     {divergence_total}")
    print(f"Runs reviewed (rev-or-disagree):  {reviewed}  (source: disagreements.jsonl entries)")
    print()

    if reviewed == 0:
        print("No disagreement entries yet — either Evaluator is perfect (optimistic)")
        print("or nobody has logged disagreements. Use the log-disagreement skill.")
    else:
        print(f"Divergence rate:                  {div_rate:.1%}")
        print(f"Wilson 95% CI:                    [{lo:.1%}, {hi:.1%}]  (use upper bound for gating)")
        print()
        print(f"  False-positive (eval FAIL → human PASS):  {fp}  ({fp/reviewed:.1%})")
        print(f"  False-negative (eval PASS → human FAIL):  {fn}  ({fn/reviewed:.1%})")
        if other:
            print(f"  Other verdict shift:                        {other}  ({other/reviewed:.1%})")
        print()
        print("  Interpretation (guide §0.2 Level 2):")
        print("    FP > FN is expected — Evaluator is skeptic-by-default (§3.1 principle 4).")
        print("    FN > FP is a red flag — Evaluator is letting bugs through.")

        # Per-AC concentration
        if ac_counter:
            print()
            print("  Per-AC/gate/NFR disagreement concentration:")
            total_ac_hits = sum(ac_counter.values())
            for ac, count in ac_counter.most_common():
                pct = count / total_ac_hits
                flag = "  ⚠️  PATTERN" if pct > CONCENTRATION_ALERT else ""
                print(f"    {ac:40s}  {count}  ({pct:.0%}){flag}")
            top_ac, top_count = ac_counter.most_common(1)[0]
            if top_count / total_ac_hits > CONCENTRATION_ALERT:
                print()
                print(f"  🚨 {top_count}/{total_ac_hits} ({top_count/total_ac_hits:.0%}) disagreements hit {top_ac}.")
                print(f"     §0.2 warning: this is pattern error, not random skeptic bias.")
                print(f"     Fix the Evaluator prompt/tool for this check, don't tolerate.")

    # Sample-size progress
    print()
    print(f"═══ Sample size progress (guide §3.5) ═══")

    def progress_bar(current: int, target: int, width: int = 30) -> str:
        filled = min(width, int(width * current / target))
        return f"[{'█' * filled}{'░' * (width - filled)}]"

    for target, margin in ((TARGET_RUNS_10PCT, "±10%"), (TARGET_RUNS_15PCT, "±15%"), (TARGET_RUNS_20PCT, "±20%")):
        bar = progress_bar(reviewed, target)
        status = "✓ REACHED" if reviewed >= target else f"{target - reviewed} more needed"
        print(f"  {margin}  {bar}  {reviewed}/{target}  {status}")

    if reviewed < TARGET_RUNS_20PCT:
        print()
        print("  Divergence numbers are directional only — too few samples for statistical claims.")
    elif reviewed < TARGET_RUNS_10PCT:
        print()
        print(f"  OK for exploratory / non-gating decisions. Use Wilson upper bound ({hi:.1%})")
        print(f"  for any gate, not the point estimate.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
