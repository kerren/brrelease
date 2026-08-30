import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Isolates every `git` process spawned by the tests - both the ones the fixtures run directly and
 * the ones the CLI spawns under the hood - from the machine the tests happen to be running on.
 *
 * Without this, a developer with `commit.gpgsign = true`, a `core.hooksPath`, or a template
 * directory in their global config would see failures that have nothing to do with the code under
 * test, and the CLI (which shells out to the real `git` binary) would happily pick that config up.
 *
 * The module is imported for its side effect, so the environment is in place before any test body
 * runs. Importing it more than once is harmless.
 */

const isolationRoot = mkdtempSync(join(tmpdir(), 'brrelease-git-env-'));

const emptyGlobalConfig = join(isolationRoot, 'gitconfig-global');
const emptySystemConfig = join(isolationRoot, 'gitconfig-system');
writeFileSync(emptyGlobalConfig, '');
writeFileSync(emptySystemConfig, '');

// `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM` are git's own supported way of pointing at a different
// config file, so this covers `git` however it is invoked rather than only the calls we make here.
process.env.GIT_CONFIG_GLOBAL = emptyGlobalConfig;
process.env.GIT_CONFIG_SYSTEM = emptySystemConfig;

// Nothing in the suite should ever reach out to a real remote or block on a credential prompt.
process.env.GIT_TERMINAL_PROMPT = '0';
process.env.GIT_ASKPASS = 'echo';

// Identity is set per repository as well, but the environment covers commands that run outside a
// repository and makes the failure mode obvious if a fixture ever forgets.
process.env.GIT_AUTHOR_NAME = 'brrelease test';
process.env.GIT_AUTHOR_EMAIL = 'test@brrelease.invalid';
process.env.GIT_COMMITTER_NAME = 'brrelease test';
process.env.GIT_COMMITTER_EMAIL = 'test@brrelease.invalid';

// The directory only holds two empty config files, but there is no reason to leave it behind.
process.on('exit', () => {
    rmSync(isolationRoot, { force: true, recursive: true });
});

export const gitIsolationRoot = isolationRoot;
