# Plan

Tracked follow-up work for the smaller defects found while reading through the
release flow. Each item has a checklist so we can tick things off as they land.

Status key: `[ ]` todo, `[x]` done.

---

## 1. `/bin/bash` is hardcoded, so `--run-script-during-release` is broken on Windows

**Where:** `src/commands/release.ts` (the `spawnCommand('/bin/bash', ['-c', script])` call in
step 4), `src/shared/spawn-command.ts`.

**Problem:** We ship `win32-x64` and `win32-arm64` tarballs via `generate:tarballs`, but
`/bin/bash` does not exist on a stock Windows machine. Any Windows user who passes
`--run-script-during-release` gets an `ENOENT` that surfaces as an unknown-structure error.

- [ ] Decide on the mechanism: `shell: true` on `spawn` vs. explicitly resolving a shell per
      platform (`cmd.exe /d /s /c` or `powershell -Command` on `win32`, `/bin/sh -c` elsewhere)
- [ ] Add a `resolveShell()` helper (or a `shell` option on `spawnCommand`) rather than
      inlining platform checks in the command
- [ ] Honour `process.env.SHELL` / `process.env.ComSpec` where it makes sense, so users on
      unusual setups are not forced onto our guess
- [ ] Consider a `--script-shell` flag to let users override the resolved shell explicitly
- [ ] Confirm the existing quoting advice in the `--run-script-during-release` flag description
      (the note about avoiding the `"` character) is still accurate for the chosen mechanism,
      and update it if not
- [ ] Verify on Windows (or at minimum a Windows CI runner) that a multi-step script runs

---

## 2. Script output is buffered until the process exits

**Where:** `src/shared/spawn-command.ts`, consumed in `src/commands/release.ts` step 4.

**Problem:** `spawnCommand` accumulates `stdout`/`stderr` into strings and only resolves on
`close`, and the command then logs the whole blob at once. A long-running user script (e.g.
`pnpm build`) looks completely hung while it runs, underneath a spinner that never moves.

- [ ] Add an opt-in streaming mode to `spawnCommand` (e.g. an `onStdout` / `onStderr` callback,
      or a `stream: boolean` option) while still returning the captured output
- [ ] Stream the user scripts in step 4 so progress is visible as it happens
- [ ] Make sure the ora spinner and the streamed output do not fight over the same terminal
      lines — stop/persist the spinner before streaming, then restart it
- [ ] Keep the buffered behaviour for the internal git helpers, which parse the output and
      should stay quiet
- [ ] Check the result is still readable when stdout is not a TTY (piped to a file, CI logs)

---

## 3. `spawnCommand` rejects with a plain object instead of an `Error`

**Where:** `src/shared/spawn-command.ts`, error handling in `src/commands/release.ts`.

**Problem:** The promise rejects with a bare `SpawnResult` (`{ stdout, stderr, code }`). It has
no `message`, no stack, and does not pass `instanceof Error`. That is why the catch block has to
fall back through `(error as any).stderr ?? (error as any).message ?? error`, and why a failure
with an empty stderr degrades into "An error has occurred with an unknown structure...".

- [ ] Add a `SpawnError extends Error` class carrying `stdout`, `stderr`, `code`, and the
      binary + args that were run
- [ ] Build a useful `message` from the binary, exit code, and the first line of stderr, so the
      error is legible even when stderr is empty
- [ ] Reject with `SpawnError` from `spawnCommand`
- [ ] Handle the `spawn` `'error'` event as well — it currently is not listened for at all, so a
      missing binary leaves the promise pending forever rather than rejecting
- [ ] Simplify the catch block in `release.ts` now that errors have a real `message`
- [ ] Confirm the error text still shows the underlying git stderr, which is the most useful
      part of a failure

---

## 4. `--sign` does not sign the tag

**Where:** `src/shared/git/git-create-tag.ts`, invoked from `src/commands/release.ts` step 5.

**Problem:** `gitCommitChanges` and `gitMergeBranch` both take `sign` and pass `--no-gpg-sign`
when it is false, but `gitCreateTag` ignores signing entirely and always runs `git tag -a`. With
signing on you end up with signed commits and an unsigned release tag, which is exactly the
object most people want signed.

- [ ] Thread the `sign` flag through to `gitCreateTag`
- [ ] Use `git tag -s` when signing and `git tag -a` when not, mirroring the commit/merge helpers
- [ ] Decide the behaviour when `--sign` is on but no signing key is configured: fail loudly, or
      warn and fall back to an annotated tag (this overlaps with the new preflight checks, which
      are a good place to detect a missing key up front)
- [ ] Audit the rest of the git helpers for the same inconsistency
- [ ] Add a test covering signed vs. unsigned tag creation

---

## 5. The tests are still the oclif template stubs

**Where:** `test/commands/release.test.ts`.

**Problem:** The file is untouched scaffolding: it asserts on `"hello world"` and passes a
`--name` flag that does not exist on the command. It cannot pass. Worse, `runCommand('release')`
would attempt a *real* release against the working directory it runs in. Given `posttest` runs
lint and the release flow is genuinely intricate, this is the coverage gap most worth closing.

- [ ] Delete or rewrite the two stub tests so the suite reflects the real command
- [ ] Build a fixture helper that creates a throwaway git repo in a temp dir: `git init`, a
      committed `package.json`, a configured user/email, signing disabled, and a few
      conventional commits
- [ ] Make sure the fixture repo is isolated from the developer's real git config and is torn
      down afterwards, so a test run can never touch the actual working tree
- [ ] Integration test the single-branch flow: assert the tag exists, the changelog was written,
      the version was bumped, and the release branch was deleted
- [ ] Integration test the multi-branch flow (`--merge-into-branch`), including the merge back
      into the originating branch
- [ ] Cover the flags with real branching behaviour: `--skip-changelog`, `--first-release`,
      `--prerelease`, `--release-as`
- [ ] Cover the new preflight checks, including that each failure blocks the release and that
      the skip flags bypass it
- [ ] Unit test the smaller helpers directly (`gitCheckForChanges` parsing, `spawnCommand`
      error shape)
- [ ] Add a CI workflow so the suite actually runs on push — there is no `.github/` directory in
      the repo today
