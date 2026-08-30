import { Config } from '@oclif/core';
import { fileURLToPath } from 'node:url';

import Release from '../../src/commands/release.js';
import { captureOutput } from './capture-output.js';
import { inRepo } from './temp-git-repo.js';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

let cachedConfig: Config | undefined;

/**
 * Loads the oclif config once and reuses it. Loading it per test is slow and the release command
 * does not read anything off it, so a single instance is enough.
 *
 * @returns The oclif config rooted at the project
 */
async function loadConfig(): Promise<Config> {
    cachedConfig ||= await Config.load(projectRoot);
    return cachedConfig;
}

export interface ReleaseRunResult {
    stdout: string;
    stderr: string;
}

/**
 * Signing is on by default, and `commit-and-tag-version` passes `-S` to git when it is, which
 * needs a real key. Every test opts out unless it is specifically exercising signing.
 */
const defaultArgv = ['--no-sign'];

/** Anything the command can be pointed at - a fixture repository, or a bare directory */
export interface ReleaseTarget {
    path: string;
}

/**
 * Runs the release command inside a fixture repository and fails the test if it errors.
 *
 * @param repo - The repository to release from
 * @param argv - Flags to pass to the command
 * @returns Everything the command wrote to stdout and stderr
 */
export async function runRelease(repo: ReleaseTarget, argv: string[] = []): Promise<ReleaseRunResult> {
    const config = await loadConfig();
    const captured = await inRepo(repo, async () => captureOutput(async () => Release.run([...defaultArgv, ...argv], config)));

    if (captured.error) {
        // The command's own output is the only useful diagnostic when this fails on CI, so it is
        // folded into the failure rather than discarded.
        throw new Error(
            `The release command failed unexpectedly: ${describeError(captured.error)}\n--- stdout ---\n${captured.stdout}\n--- stderr ---\n${captured.stderr}`,
        );
    }

    return { stderr: captured.stderr, stdout: captured.stdout };
}

/**
 * Runs the release command inside a fixture repository and asserts that it failed.
 *
 * @param repo - The repository to release from
 * @param argv - Flags to pass to the command
 * @returns The error message the command produced, along with its output
 */
export async function runReleaseExpectingFailure(
    repo: ReleaseTarget,
    argv: string[] = [],
): Promise<ReleaseRunResult & { message: string }> {
    const config = await loadConfig();
    const captured = await inRepo(repo, async () => captureOutput(async () => Release.run([...defaultArgv, ...argv], config)));

    if (!captured.error) {
        throw new Error(`The release command was expected to fail but it succeeded.\n--- stdout ---\n${captured.stdout}`);
    }

    return { message: describeError(captured.error), stderr: captured.stderr, stdout: captured.stdout };
}

function describeError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}
