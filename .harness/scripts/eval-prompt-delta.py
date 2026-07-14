#!/usr/bin/env python3
"""
eval-prompt-delta — compare prompt-change detection across baseline vs candidate.

Runs a canary fixture against TWO prompt versions:
    baseline = git HEAD snapshot of plugins/harness-engineering/assets/prompts/*.md
    candidate = current working-tree version of those prompts

Reports per-fixture detection delta: does the candidate catch the same defects
the baseline catches? Does it introduce regressions (false positives on
`contract-clean` or false negatives on the adversarial cases)?

Usage:
    python3 eval-prompt-delta.py --fixture <path-to-fixture-dir> [--verbose]

The script does NOT actually invoke Claude subagents — that's too slow/expensive
for a smoke test. Instead it performs a lightweight textual diff of prompts and
reports what the delta would influence. For full evaluation, use /harness-eval
on each fixture manually.

Output format:
    === Prompt Delta Report ===
    Fixture: <name>
    Baseline prompts SHA: <sha>
    Candidate prompts SHA: <sha>
    Planner prompt:    <diff summary>  (delta: +N / -M lines)
    Generator prompt:  <diff summary>
    Evaluator prompt:  <diff summary>   (MUST be empty to preserve pin)
    Expected defects:  <read from fixture/expected-defects.md>
    Recommendation:    <PASS baseline, re-run candidate via /harness-eval>
"""
from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
from pathlib import Path


PROMPT_FILES = [
    "plugins/harness-engineering/assets/prompts/planner.md",
    "plugins/harness-engineering/assets/prompts/generator.md",
    "plugins/harness-engineering/assets/prompts/evaluator.md",
]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="eval-prompt-delta",
        description="Compare harness prompts delta (HEAD baseline vs working tree candidate) for a canary fixture — smoke test before running full /harness-eval.",
    )
    p.add_argument("--fixture", type=Path, required=True, help="path to canary fixture directory")
    p.add_argument("--verbose", action="store_true", help="dump full unified diff per prompt")
    return p.parse_args(argv)


def git_show(path: str, ref: str = "HEAD") -> bytes:
    """Read file contents at a git ref. Returns b'' on error (file missing at ref)."""
    try:
        return subprocess.check_output(["git", "show", f"{ref}:{path}"], stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        return b""


def sha16(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


def count_lines(data: bytes) -> int:
    return len(data.decode("utf-8", errors="replace").splitlines())


def diff_summary(baseline: bytes, candidate: bytes, label: str) -> dict:
    bl = count_lines(baseline)
    cl = count_lines(candidate)
    identical = baseline == candidate
    return {
        "label": label,
        "baseline_lines": bl,
        "candidate_lines": cl,
        "delta": cl - bl,
        "identical": identical,
        "baseline_sha": sha16(baseline),
        "candidate_sha": sha16(candidate),
    }


def read_expected(fixture_dir: Path) -> str:
    for name in ("expected-defects.md", "expected-outcome.md"):
        p = fixture_dir / name
        if p.is_file():
            return p.read_text()
    return "(no expected-defects.md or expected-outcome.md found)"


def unified_diff(baseline: bytes, candidate: bytes, label: str) -> str:
    if baseline == candidate:
        return f"(no changes to {label})"
    import difflib
    bl_lines = baseline.decode("utf-8", errors="replace").splitlines(keepends=True)
    cl_lines = candidate.decode("utf-8", errors="replace").splitlines(keepends=True)
    return "".join(difflib.unified_diff(bl_lines, cl_lines, fromfile=f"HEAD:{label}", tofile=f"WORKING:{label}", lineterm=""))


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    fixture = args.fixture
    if not fixture.is_dir():
        print(f"error: fixture dir not found: {fixture}", file=sys.stderr)
        return 2

    # Collect per-prompt deltas
    rows = []
    for path in PROMPT_FILES:
        label = Path(path).name
        baseline = git_show(path, "HEAD")
        p = Path(path)
        candidate = p.read_bytes() if p.is_file() else b""
        rows.append(diff_summary(baseline, candidate, label))

    # Load expected defects
    expected = read_expected(fixture)

    # Report
    print("=== Prompt Delta Report ===")
    print(f"Fixture: {fixture.name}")
    print()
    print(f"{'Prompt':20s}  {'baseline lines':>15s}  {'candidate lines':>16s}  {'delta':>6s}  identical?")
    print("-" * 80)
    for r in rows:
        identical_flag = "yes" if r["identical"] else "no"
        print(f"{r['label']:20s}  {r['baseline_lines']:>15d}  {r['candidate_lines']:>16d}  {r['delta']:+6d}  {identical_flag}")
    print()

    # Evaluator.md must be identical (pin preservation)
    evaluator_row = next(r for r in rows if r["label"] == "evaluator.md")
    if not evaluator_row["identical"]:
        print("🚨 WARNING: evaluator.md has CHANGED — evaluator_pin.hash_expected will shift.")
        print("   Existing user-frozen contracts will emit `pin_mismatch`.")
        print("   Bump evaluator_pin.tag in release notes and re-init user repos.")
        print()

    # SHA summary
    print(f"baseline prompts combined SHA[:16]: {sha16(b''.join(git_show(p) for p in PROMPT_FILES))}")
    print(f"candidate prompts combined SHA[:16]: {sha16(b''.join((Path(p).read_bytes() if Path(p).is_file() else b'') for p in PROMPT_FILES))}")
    print()

    # Recommendation
    any_change = any(not r["identical"] for r in rows)
    if any_change:
        print("Recommendation: run `/harness-eval <fixture>` with BOTH baseline (checkout HEAD) and candidate (working tree) to measure real detection delta. This script only confirms prompts differ and quantifies the textual delta.")
    else:
        print("Recommendation: no prompt changes detected — candidate == baseline.")
    print()

    # Expected defects
    print("=== Expected defects / outcome for this fixture ===")
    print(expected)

    # Verbose: dump diffs
    if args.verbose:
        for path in PROMPT_FILES:
            label = Path(path).name
            baseline = git_show(path, "HEAD")
            candidate = Path(path).read_bytes() if Path(path).is_file() else b""
            print()
            print(f"=== unified diff: {label} ===")
            print(unified_diff(baseline, candidate, label))

    return 0


if __name__ == "__main__":
    sys.exit(main())
