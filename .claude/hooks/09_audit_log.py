#!/usr/bin/env python3
"""Append-only evidence log for all tool events. Enables post-hoc audit."""
import json, os, pathlib, sys, time

data = json.load(sys.stdin)

root = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()))
evidence = root / ".claude" / "evidence"
evidence.mkdir(parents=True, exist_ok=True)

event = {
    "ts": int(time.time()),
    "hook_event_name": data.get("hook_event_name"),
    "tool_name": data.get("tool_name"),
    "tool_input": data.get("tool_input"),
    "session_id": data.get("session_id"),
}

with (evidence / "tool-events.jsonl").open("a", encoding="utf-8") as f:
    f.write(json.dumps(event, ensure_ascii=False) + "\n")

sys.exit(0)
