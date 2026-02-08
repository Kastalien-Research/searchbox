#!/usr/bin/env python3
"""Canary monitor — PostToolUse hook that tracks edit velocity, scope breadth,
and computes a pressure score. Writes signals to canary_signals.json."""
import json, os, pathlib, sys, time

data = json.load(sys.stdin)
tool_name = data.get("tool_name", "")

root = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()))
state_dir = root / ".claude" / "state"
state_dir.mkdir(parents=True, exist_ok=True)
signals_path = state_dir / "canary_signals.json"

# Load existing signals or initialize
if signals_path.exists():
    try:
        signals = json.loads(signals_path.read_text())
    except (json.JSONDecodeError, OSError):
        signals = {}
else:
    signals = {}

# Initialize on first call
if "session_start" not in signals:
    signals["session_start"] = time.time()
    signals["edit_count"] = 0
    signals["files_touched"] = []
    signals["turn_count"] = 0
    signals["pressure"] = 0.0
    signals["warnings"] = []

# Track edits
if tool_name in ("Edit", "Write"):
    signals["edit_count"] = signals.get("edit_count", 0) + 1
    # Track file from tool input if available
    tool_input = data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")
    if file_path:
        touched = signals.get("files_touched", [])
        if file_path not in touched:
            touched.append(file_path)
            signals["files_touched"] = touched

# Track turns (every tool call counts)
signals["turn_count"] = signals.get("turn_count", 0) + 1

# Compute pressure score (0.0 - 1.0)
elapsed = time.time() - signals.get("session_start", time.time())
edit_count = signals.get("edit_count", 0)
file_count = len(signals.get("files_touched", []))
turn_count = signals.get("turn_count", 0)

# Pressure components (each 0.0 - 1.0, averaged)
# Edit velocity: >30 edits is high pressure
edit_pressure = min(edit_count / 30.0, 1.0)
# Scope breadth: >15 files is high pressure
scope_pressure = min(file_count / 15.0, 1.0)
# Turn count: >50 turns is high pressure
turn_pressure = min(turn_count / 50.0, 1.0)
# Time: >45 minutes is high pressure
time_pressure = min(elapsed / 2700.0, 1.0) if elapsed > 0 else 0.0

pressure = (edit_pressure * 0.3 + scope_pressure * 0.3 +
            turn_pressure * 0.2 + time_pressure * 0.2)

signals["pressure"] = round(pressure, 3)
signals["last_updated"] = time.time()
signals["components"] = {
    "edit_velocity": round(edit_pressure, 3),
    "scope_breadth": round(scope_pressure, 3),
    "turn_count": round(turn_pressure, 3),
    "elapsed_time": round(time_pressure, 3)
}

# Add warning if pressure threshold crossed
warnings = signals.get("warnings", [])
if pressure > 0.7 and not any(w.get("level") == "high" for w in warnings):
    warnings.append({
        "level": "high",
        "message": f"Canary: pressure at {pressure:.0%} — consider converging or closing",
        "at_turn": turn_count,
        "timestamp": time.time()
    })
elif pressure > 0.5 and not any(w.get("level") == "medium" for w in warnings):
    warnings.append({
        "level": "medium",
        "message": f"Canary: pressure at {pressure:.0%} — monitor scope breadth",
        "at_turn": turn_count,
        "timestamp": time.time()
    })
signals["warnings"] = warnings

# Write signals
signals_path.write_text(json.dumps(signals, indent=2) + "\n")

# If pressure > 0.7, inject warning into context
if pressure > 0.7:
    ctx = (f"Canary warning: System pressure at {pressure:.0%}. "
           f"Edits: {edit_count}, Files: {file_count}, Turns: {turn_count}. "
           f"Consider converging or closing current scope.")
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": ctx
        }
    }))

sys.exit(0)
