## Phase Transitions

Phase transitions are the primary feedback mechanism of the dynamical system. They are managed by the Helmsman (`/helm`) based on observable criteria, not arbitrary decisions.

### Transition Triggers

**Exploration → Convergence:**
- Scout signals repeat — same themes surfacing across searches
- Cartographer map stabilizing — boundaries aren't shifting between mapping sessions
- Key unknowns addressed — the "what we don't know" list is shrinking
- Canary pressure rising above 0.3

**Convergence → Execution:**
- Scope locked — boundaries decided, edge cases resolved
- Names agreed — key concepts have stable, load-bearing names
- No major unknowns — remaining questions are detail-level
- Dependencies mapped and unblocked

**Execution → Completion:**
- Most execution work closed — bulk of implementation done
- Canary pressure above 0.5 — session resources depleting
- Remaining work is polish — no structural changes needed
- Git log shows implementation, not exploration

### Topology per Phase

| Phase | Primary | Secondary | Dormant |
|---|---|---|---|
| Exploration | Scout, Cartographer | Namer, Helmsman | Closer, Triage-Fix |
| Convergence | Cartographer, Namer | Helmsman, Scout | Closer |
| Execution | Triage-Fix, Verification-Judge | Helmsman, Canary | Scout, Namer |
| Completion | Closer, Helmsman | Canary, Verification-Judge | Scout, Cartographer |

**Primary**: Actively invoked, outputs drive decisions.
**Secondary**: Available, invoked when needed.
**Dormant**: Should not be invoked unless explicitly needed for a blocking issue.

### Backward Transitions

Phases can go backward if new information invalidates previous convergence:
- **Execution → Convergence**: Scope needs reopening (new requirement discovered)
- **Convergence → Exploration**: Fundamental assumption proved wrong
- **Completion → Execution**: Critical bug or gap found

Backward transitions should be rare and require explicit justification via `/helm`.
