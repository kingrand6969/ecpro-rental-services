---
name: dnd-kit drag in Playwright e2e
description: How to make drag-to-reorder work in e2e test plans against dnd-kit lists
---
Playwright's `dragAndDrop()` does not trigger dnd-kit's PointerSensor. Instruct the testing subagent to use the raw mouse API: move to the handle center, `mouse.down`, move ~10px with steps to pass the 5px activation constraint, pause, then move the remaining distance in ~20 steps with small pauses, pause again, and `mouse.up`.

**Why:** dnd-kit sensors need real pointer-move sequences past the activation threshold; a single synthetic drop event never activates the drag, making tests report false reorder failures.

**How to apply:** In `runTest` plans that drag dnd-kit rows, spell out the stepped mouse sequence explicitly and mention the activation constraint in the technical documentation.
