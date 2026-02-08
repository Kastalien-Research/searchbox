#!/usr/bin/env python3
"""Canary inject — UserPromptSubmit hook that reads canary signals and injects
a brief pressure summary when thresholds are exceeded."""
import json, os, pathlib, sys, time

data = json.load(sys.stdin)

root = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()))
signals_path = root / ".claude" / "state" / "canary_signals.json"

if not signals_path.exists():
    sys.exit(0)

try:
    signals = json.loads(signals_path.read_text())
except (json.JSONDecodeError, OSError):
    sys.exit(0)

pressure = signals.get("pressure", 0.0)
if pressure < 0.5:
    sys.exit(0)

edit_count = signals.get("edit_count", 0)
file_count = len(signals.get("files_touched", []))
turn_count = signals.get("turn_count", 0)
components = signals.get("components", {})

# Read current phase
phase_path = root / ".claude" / "state" / "system_phase.json"
phase = "unknown"
if phase_path.exists():
    try:
        phase = json.loads(phase_path.read_text()).get("phase", "unknown")
    except (json.JSONDecodeError, OSError):
        pass

if pressure > 0.7:
    level = "HIGH"
    advice = "Strongly consider phase transition toward completion. Use /helm to evaluate."
elif pressure > 0.5:
    level = "MEDIUM"
    advice = "Monitor scope breadth. Avoid opening new explorations."
else:
    sys.exit(0)

summary = (
    f"[Canary {level}] Pressure: {pressure:.0%} | "
    f"Phase: {phase} | "
    f"Edits: {edit_count}, Files: {file_count}, Turns: {turn_count} | "
    f"Dominant: {max(components, key=components.get) if components else 'n/a'} | "
    f"{advice}"
)

print(summary)
sys.exit(0)
