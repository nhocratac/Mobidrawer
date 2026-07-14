# fixtures/pass/ — Known-PASS canary codebase

Populate this directory with minimal, intentionally-correct code that satisfies every AC in `../canary-pass.yaml`.

The Evaluator run on this directory + `canary-pass.yaml` **must always emit PASS**. If it doesn't, the Evaluator is over-flagging — investigate prompts/tools/model before running real sprints.

## What to put here

Domain-specific. A minimal example:

```
fixtures/pass/
  src/add.py                  # def add(a, b): return a + b
  tests/test_add.py           # assert add(2, 3) == 5
  pyproject.toml              # pytest configured
```

Or for a JVM stack:

```
fixtures/pass/
  pom.xml
  src/main/java/.../Add.java
  src/test/java/.../AddTest.java
```

## Rules

- Keep it minimal — this file should compile + test in < 5 seconds.
- Don't add anything unrelated to the canary contract ACs.
- Commit this directory so the canary is reproducible across machines.
