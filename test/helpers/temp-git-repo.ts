import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Imported for its side effect - see the module for what it isolates and why.
import './git-environment.js';

export interface TempGitRepoOptions {
    /** The branch the repository is initialised on (default `main`) */
    defaultBranch?: string;
    /** The version written into the initial `package.json` (default `1.0.0`) */
    version?: string;
    /** The name written into the initial `package.json` (default `fixture-package`) */
    name?: string;
    /**
     * Create the initial commit (default `true`). Pass `false` when the test needs a repository
     * with no history at all.
     */
    initialCommit?: boolean;
    /** The message used for the initial commit (default `feat: the initial commit`) */
    initialCommitMessage?: string;
}

export interface TempGitRepo {
    /** The absolute path to the working tree */
    readonly path: string;
    /** Runs `git` inside the repository and returns its trimmed stdout */
    git(...args: string[]): string;
    /** Writes a file relative to the repository root, creating parent directories as needed */
    writeFile(relativePath: string, contents: string): void;
    readFile(relativePath: string): string;
    exists(relativePath: string): boolean;
    /** Stages everything and commits it */
    commit(message: string): void;
    /** Writes a file, stages everything and commits it */
    commitFile(relativePath: string, contents: string, message: string): void;
    /** Every tag in the repository */
    tags(): string[];
    /** Every local branch in the repository */
    branches(): string[];
    currentBranch(): string;
    /** Commit subjects, newest first */
    log(): string[];
    /** The `version` field of the repository's `package.json` */
    packageVersion(): string;
    /** The annotated message body of a tag */
    tagMessage(tag: string): string;
    /** Removes the repository from disk */
    cleanup(): void;
}

const createdRepositories: string[] = [];

/**
 * Creates a throwaway git repository in a temporary directory, seeded with a `package.json` and a
 * conventional commit so that a release can be calculated from it.
 *
 * The repository configures its own identity and disables signing, so it is completely independent
 * of the machine's git configuration.
 *
 * @param options - Overrides for the fixture's default shape
 * @returns The repository handle
 */
export function createTempGitRepo(options: TempGitRepoOptions = {}): TempGitRepo {
    const {
        defaultBranch = 'main',
        version = '1.0.0',
        name = 'fixture-package',
        initialCommit = true,
        initialCommitMessage = 'feat: the initial commit',
    } = options;

    const path = mkdtempSync(join(tmpdir(), 'brrelease-repo-'));
    createdRepositories.push(path);

    const repo = createRepoHandle(path);

    repo.git('init', '--initial-branch', defaultBranch);
    configureRepository(repo);

    if (initialCommit) {
        repo.writeFile('package.json', `${JSON.stringify({ name, version }, null, 2)}\n`);
        repo.commit(initialCommitMessage);
    }

    return repo;
}

/**
 * Creates an empty temporary directory that is deliberately not a git repository, for the checks
 * that have to cope with being run outside one.
 *
 * @returns The absolute path to the directory
 */
export function createTempDirectory(): string {
    const path = mkdtempSync(join(tmpdir(), 'brrelease-plain-'));
    createdRepositories.push(path);
    return path;
}

/**
 * Creates a bare repository that can stand in for a remote, so tests can exercise fetching,
 * pushing and remote tag lookups without touching the network.
 *
 * @param name - A label used in the temporary directory name
 * @returns The absolute path to the bare repository
 */
export function createBareRemote(name = 'remote'): string {
    const path = mkdtempSync(join(tmpdir(), `brrelease-${name}-`));
    createdRepositories.push(path);
    execFileSync('git', ['init', '--bare', '--initial-branch', 'main', path], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    return path;
}

/**
 * Points a repository at a bare remote and pushes the given branch so that it has an upstream.
 *
 * @param repo - The repository to configure
 * @param remotePath - The bare repository to use as the remote
 * @param branch - The branch to publish (defaults to the current branch)
 * @param remoteName - The name to give the remote
 */
export function attachRemote(repo: TempGitRepo, remotePath: string, branch?: string, remoteName = 'origin'): void {
    const branchToPush = branch ?? repo.currentBranch();
    repo.git('remote', 'add', remoteName, remotePath);
    repo.git('push', '--set-upstream', remoteName, branchToPush);
}

/**
 * Runs a function with the process working directory switched to the given directory, restoring it
 * afterwards even if the function throws.
 *
 * The CLI operates on `process.cwd()`, so this is how the integration tests aim it at a fixture.
 *
 * @param target - The repository, or anything else with a path, to run inside
 * @param run - The function to run
 * @returns Whatever the function returns
 */
export async function inRepo<T>(target: { path: string }, run: () => Promise<T>): Promise<T> {
    const previousWorkingDirectory = process.cwd();
    process.chdir(target.path);
    try {
        return await run();
    } finally {
        process.chdir(previousWorkingDirectory);
    }
}

/**
 * Deletes every repository created by this module. Registered as an exit handler below, so a
 * failing or interrupted run cannot leave temporary directories behind.
 */
export function cleanupTempGitRepos(): void {
    while (createdRepositories.length > 0) {
        const path = createdRepositories.pop();
        if (path) {
            rmSync(path, { force: true, recursive: true });
        }
    }
}

function configureRepository(repo: TempGitRepo): void {
    repo.git('config', 'user.name', 'brrelease test');
    repo.git('config', 'user.email', 'test@brrelease.invalid');
    // Signing needs a key and a passphrase prompt, neither of which exists on a test runner.
    repo.git('config', 'commit.gpgsign', 'false');
    repo.git('config', 'tag.gpgsign', 'false');
    // Keeps the fixture independent of any hooks or templates configured on the machine.
    repo.git('config', 'core.hooksPath', '/dev/null');
}

function createRepoHandle(path: string): TempGitRepo {
    // stderr is piped rather than inherited so that git's chatter ("Switched to a new branch...")
    // stays out of the test report; it is still attached to the error when a command fails.
    const git = (...args: string[]) => execFileSync('git', args, { cwd: path, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

    const writeFile = (relativePath: string, contents: string) => {
        const target = join(path, relativePath);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, contents);
    };

    const commit = (message: string) => {
        git('add', '-A');
        git('commit', '--no-gpg-sign', '-m', message);
    };

    return {
        branches: () =>
            git('for-each-ref', '--format=%(refname:short)', 'refs/heads')
                .split('\n')
                .filter((line) => line !== ''),
        cleanup: () => rmSync(path, { force: true, recursive: true }),
        commit,
        commitFile: (relativePath: string, contents: string, message: string) => {
            writeFile(relativePath, contents);
            commit(message);
        },
        currentBranch: () => git('rev-parse', '--abbrev-ref', 'HEAD'),
        exists: (relativePath: string) => existsSync(join(path, relativePath)),
        git,
        // --topo-order keeps children ahead of parents, which the default date order does not
        // guarantee when several commits land inside the same second.
        log: () =>
            git('log', '--topo-order', '--pretty=%s')
                .split('\n')
                .filter((line) => line !== ''),
        packageVersion: () => JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')).version as string,
        path,
        readFile: (relativePath: string) => readFileSync(join(path, relativePath), 'utf8'),
        tagMessage: (tag: string) => git('tag', '-l', '--format=%(contents)', tag),
        tags: () =>
            git('tag', '--list')
                .split('\n')
                .filter((line) => line !== ''),
        writeFile,
    };
}

// A test that throws part way through never reaches its own teardown, so this is the safety net.
process.on('exit', cleanupTempGitRepos);
