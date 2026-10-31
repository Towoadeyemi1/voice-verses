---
name: steward
description: How changes to Voice Verses are made, checked, committed, reviewed and merged (branch naming, required checks, version bump, PR body, CI, merge method, what never to do). Use for every code change and when handling PR or CI events.
---

# Shipping a change

1. **Start** from the latest `main`: `git fetch origin main && git checkout -B feature/<short-name> origin/main`. Use `fix/` for bug fixes. If the branch's PR is already merged, restart it from `main`.
2. **Before writing code**, read the relevant parts of `docs/PRODUCT_SPEC.md`, `docs/LESSONS.md` and, for UI, `docs/DESIGN_SYSTEM.md`.
3. **Build the change.** Keep it focused, and keep user-facing words plain (see `CLAUDE.md` rule 10).
4. **Checks.** All must pass:
   - `npx tsc -p tsconfig.app.json --noEmit`
   - `VITE_BASE_PATH=/voice-verses/ npm run build` and `ELECTRON_BUILD=true npx vite build`
   - The detector check (command in `CLAUDE.md`), always after a merge from `main`.
   - `npx eslint src`, with the error count no higher than before (about 37 old ones).
   - The `e2e-electron` skill for anything users can see.
5. **Version:** bump the patch in `package.json` (`npm pkg set version=X.Y.Z`). Minor bumps are for big redesigns.
6. **Commit:** a subject like `1.3.8: <what users get>`, then a body explaining what and why. End with the attribution lines the session gives. Never name a model in commits or PRs.
7. **Push:** `git push -u origin <branch>`, retrying on network errors with backoff. Never force-push; if history must change, make a new branch.
8. **PR:**
   - Title: the same as the commit subject.
   - Body: "## What this changes" (bullets naming files and behaviour) and "## Testing" (what was run and seen), ending with the PR attribution lines.
9. **CI:** the `qa` check must pass on the latest commit. If it fails, reproduce locally, fix, and push again. Never skip tests and never push empty commits.
10. **Merge** with a merge commit once `qa` passes. The owner has asked for finished work to be merged. Then unsubscribe from the PR.
11. **Tell the owner** in plain words what changed, and that they can publish `vX.Y.Z` (see the `release` skill).
12. **Record:** add new lessons to `docs/LESSONS.md` and new decisions to `docs/DECISIONS.md`. Update `docs/PRODUCT_SPEC.md` for any behaviour change, and the open-work list in `CLAUDE.md`.

## Never

- Push tags. Releases are the owner's job.
- Get around bot checks, proxies or paywalls.
- Put copyrighted lyrics or Bible text in the repo.
- Ship a key in the web build.
