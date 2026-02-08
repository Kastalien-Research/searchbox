## Phase Awareness

The system operates in one of four phases. The current phase is stored in `.claude/state/system_phase.json`. All agents and skills must read the current phase and adjust behavior accordingly.

### Phases

- **Exploration**: Maximize coverage, tolerate ambiguity. Scout and Cartographer are primary. Cast wide nets, report raw signals, sketch rough maps. Don't prematurely converge on solutions.

- **Convergence**: Narrow scope, resolve naming, sharpen boundaries. Namer and Cartographer are primary. Commit to specific boundaries, retire ambiguous terms, lock scope decisions.

- **Execution**: Implement decisions. Triage-Fix and Verification-Judge are primary. Follow the scope map, don't reopen settled questions. Only activate Scout for blocking unknowns.

- **Completion**: Drive to done. Closer and Helmsman are primary, Canary pressure is high. Cut aggressively, defer non-essentials, enforce completion checklists.

### Reading Phase State

```bash
cat .claude/state/system_phase.json 2>/dev/null || echo '{"phase": "exploration"}'
```

### Behavioral Adjustments

At key decision points (expanding scope, starting new exploration, choosing approach), check the current phase:

- If **exploration**: proceed with broad searches, tolerate uncertainty
- If **convergence**: favor depth over breadth, lock decisions
- If **execution**: only work within established scope, flag drift
- If **completion**: bias hard toward finishing, cut rather than add
