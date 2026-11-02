# Sixcharge Development Rules

These rules are mandatory for all code changes in this repository. Correctness, preservation of existing behavior, and verifiable results take priority over speed.

## 1. Inspect Before Editing
Before changing code:
- Read this file and any other applicable instructions.
- Inspect the complete target function or relevant code section, not just a matching snippet.
- Trace relevant callers, dependencies, state changes, and side effects.
- Read the related tests and relevant project documentation.
- Identify the root cause of the reported problem and define the expected behavior before implementing a fix.
- Check the current Git branch and working-tree state when repository access permits.
Do not begin implementation while important dependencies or expected behavior remain unclear. Ask for clarification when necessary.

## 2. Keep Changes Scoped
- Modify only files necessary to complete the requested task.
- Do not perform unrelated cleanup, refactoring, formatting, renaming, or dependency upgrades.
- Preserve existing naming conventions, module boundaries, and code style.
- Avoid duplicating existing functionality or introducing unnecessary abstractions.
- Do not replace established systems with new implementations unless explicitly required.
- Review the final diff for unrelated changes before declaring the task complete.

## 3. Protect Gameplay Behavior and Existing Data
Unless the user explicitly requests a behavior change, preserve:
- Gameplay rules, scoring, balance, match outcomes.
- Existing controls, touch gestures, input timing, and player interactions.
- Public interfaces between modules and existing event flows.
- Saved profiles, career progression, player data, statistics, achievements, and other persistent data.
- Existing game modes, rendering behavior, and supported devices.
Changes to data structures or persistence must account for existing saved profiles and migration compatibility.
Do not silently change game balance, reset user data, remove functionality, or alter unrelated game modes.

## 4. Avoid Speculative Fixes
- Diagnose underlying cause before modifying code.
- Do not add CSS overrides, arbitrary delays, special cases, or duplicate logic merely to hide symptoms.
- Do not assume a component behaves a certain way without inspecting its implementation.
- Prefer the smallest maintainable fix that addresses the identified cause.
- If root cause cannot be confirmed, explain uncertainty and propose a diagnostic step rather than presenting a guess as a verified fix.

## 5. Test at the Right Level
Choose verification appropriate to the change.
- Logic changes: add or update regression tests.
- Gameplay changes: test affected mechanics and relevant existing behavior.
- UI changes: test affected interactions and screen states.
- Rendering/animation changes: verify actual rendered output and relevant timing behavior.
- Persistence changes: test existing saved data and new or migrated data.
- Cross-module changes: test affected integration paths.
Use repository commands:
- `npm test` for the automated Node.js suite.
- `npm run smoke` for the browser smoke test, where Chromium and Playwright requirements are available.
Run relevant checks after implementation and inspect failures. Do not claim a check passed unless it was actually run and passed. Report unavailable checks explicitly.

## 6. Verify Visual Changes
Never claim a visual fix is complete based only on reading or modifying CSS.
- Inspect actual rendered results whenever browser tooling is available.
- Test relevant narrow and wide viewports, short and tall screens, and portrait or landscape where applicable.
- Check text clipping, overflow, scrolling, safe areas, browser viewport behavior, and touch-target usability.
- Preserve intended art style, aspect ratios, and existing asset behavior.
- Consider both iOS Safari and Android browsers; desktop emulation alone does not establish real-device compatibility.
If real-device testing is unavailable, state that limitation and distinguish emulated results from verified device behavior.

## 7. Protect the Git History
- Inspect the branch and working-tree state before making changes.
- Preserve existing user changes and unrelated work.
- Keep each task focused and easy to review or reverse.
- Inspect the diff before creating a commit.
- Do not discard changes, reset branches, force-push, rewrite history, or run destructive Git operations without explicit authorization.
- Do not commit, push, merge, or publish changes unless the user has authorized that action.
- Prefer a reversible commit or isolated feature branch when appropriate.
- Never claim a change was pushed, deployed, or tested unless the action actually succeeded.

## 8. Report Limitations Honestly
Every completed coding task must report:
- What changed and why.
- Which files were modified.
- Which tests and verification steps were run.
- Which checks passed or failed.
- What could not be tested.
- Any known remaining risks.
Clearly distinguish observed facts, assumptions, and unverified conclusions. Do not claim a feature works merely because code was edited or a build succeeded.

## 9. Completion Standard
A task is complete only when:
1. The requested behavior is understood and implemented.
2. The change follows these rules and applicable project instructions.
3. The diff contains only necessary changes.
4. Relevant tests and verification are performed to the extent possible.
5. Existing behavior and data are considered.
6. Results and limitations are reported accurately.
When any requirement cannot be met, state what remains outstanding instead of presenting the task as fully verified.
