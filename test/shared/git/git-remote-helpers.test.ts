import { expect } from 'chai';

import { gitFetchBranch } from '../../../src/shared/git/git-fetch-branch.js';
import { gitGetAheadBehind } from '../../../src/shared/git/git-get-ahead-behind.js';
import { gitGetBranchRemote } from '../../../src/shared/git/git-get-branch-remote.js';
import { gitGetUpstreamBranch } from '../../../src/shared/git/git-get-upstream-branch.js';
import { gitIsInsideWorkTree } from '../../../src/shared/git/git-is-inside-work-tree.js';
import { gitLocalBranchExists } from '../../../src/shared/git/git-local-branch-exists.js';
import { gitLocalTagExists } from '../../../src/shared/git/git-local-tag-exists.js';
import { gitPushBranch } from '../../../src/shared/git/git-push-branch.js';
import { gitRemoteTagExists } from '../../../src/shared/git/git-remote-tag-exists.js';
import { attachRemote, createBareRemote, createTempDirectory, createTempGitRepo, TempGitRepo } from '../../helpers/temp-git-repo.js';

const git = 'git';

describe('git remote helpers', () => {
    let repo: TempGitRepo;
    let originalWorkingDirectory: string;

    beforeEach(() => {
        originalWorkingDirectory = process.cwd();
        repo = createTempGitRepo();
        process.chdir(repo.path);
    });

    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        repo.cleanup();
    });

    describe('gitIsInsideWorkTree', () => {
        it('is true inside a repository', async () => {
            expect(await gitIsInsideWorkTree(git)).to.equal(true);
        });

        it('is false outside a repository, rather than throwing', async () => {
            process.chdir(createTempDirectory());

            expect(await gitIsInsideWorkTree(git)).to.equal(false);
        });

        it('is false when the configured binary is not git, rather than throwing', async () => {
            // Node stands in for a binary that exists but does not understand git's arguments,
            // which is what a wrong --git-binary-path looks like in practice.
            expect(await gitIsInsideWorkTree(process.execPath)).to.equal(false);
        });
    });

    describe('gitLocalBranchExists', () => {
        it('finds a branch that exists', async () => {
            expect(await gitLocalBranchExists(git, 'main')).to.equal(true);
        });

        it('does not find a branch that does not exist', async () => {
            expect(await gitLocalBranchExists(git, 'release/v9.9.9')).to.equal(false);
        });

        it('matches the ref exactly rather than by prefix', async () => {
            repo.git('branch', 'release/v1.1.0');

            expect(await gitLocalBranchExists(git, 'release')).to.equal(false);
            expect(await gitLocalBranchExists(git, 'release/v1.1.0')).to.equal(true);
        });
    });

    describe('gitLocalTagExists', () => {
        it('finds a tag that exists', async () => {
            repo.git('tag', '-a', 'v1.0.0', '-m', 'the first release');

            expect(await gitLocalTagExists(git, 'v1.0.0')).to.equal(true);
        });

        it('finds a lightweight tag as well as an annotated one', async () => {
            repo.git('tag', 'v1.0.1');

            expect(await gitLocalTagExists(git, 'v1.0.1')).to.equal(true);
        });

        it('does not find a tag that does not exist', async () => {
            expect(await gitLocalTagExists(git, 'v9.9.9')).to.equal(false);
        });

        it('does not confuse a branch of the same name for a tag', async () => {
            repo.git('branch', 'v2.0.0');

            expect(await gitLocalTagExists(git, 'v2.0.0')).to.equal(false);
        });
    });

    describe('gitGetUpstreamBranch', () => {
        it('is undefined when the branch has no upstream', async () => {
            expect(await gitGetUpstreamBranch(git, 'main')).to.equal(undefined);
        });

        it('returns the upstream ref once one is configured', async () => {
            attachRemote(repo, createBareRemote());

            expect(await gitGetUpstreamBranch(git, 'main')).to.equal('origin/main');
        });

        it('is undefined for a branch that does not exist, rather than throwing', async () => {
            expect(await gitGetUpstreamBranch(git, 'no-such-branch')).to.equal(undefined);
        });
    });

    describe('gitGetBranchRemote', () => {
        it('is undefined when the branch is not tracking a remote', async () => {
            expect(await gitGetBranchRemote(git, 'main')).to.equal(undefined);
        });

        it('returns the configured remote name', async () => {
            attachRemote(repo, createBareRemote(), 'main', 'upstream');

            expect(await gitGetBranchRemote(git, 'main')).to.equal('upstream');
        });
    });

    describe('gitGetAheadBehind', () => {
        beforeEach(() => {
            attachRemote(repo, createBareRemote());
        });

        it('reports zero on both sides when the branch is level with its upstream', async () => {
            expect(await gitGetAheadBehind(git, 'main', 'origin/main')).to.deep.equal({ ahead: 0, behind: 0 });
        });

        it('counts local commits that have not been pushed as ahead', async () => {
            repo.commitFile('one.txt', 'one\n', 'feat: one');
            repo.commitFile('two.txt', 'two\n', 'feat: two');

            expect(await gitGetAheadBehind(git, 'main', 'origin/main')).to.deep.equal({ ahead: 2, behind: 0 });
        });

        it('counts remote commits that have not been pulled as behind', async () => {
            repo.commitFile('one.txt', 'one\n', 'feat: one');
            repo.git('push', 'origin', 'main');
            repo.git('reset', '--hard', 'HEAD~1');

            expect(await gitGetAheadBehind(git, 'main', 'origin/main')).to.deep.equal({ ahead: 0, behind: 1 });
        });

        it('reports both sides when the branches have diverged', async () => {
            repo.commitFile('remote.txt', 'remote\n', 'feat: remote work');
            repo.git('push', 'origin', 'main');
            repo.git('reset', '--hard', 'HEAD~1');
            repo.commitFile('local.txt', 'local\n', 'feat: local work');

            expect(await gitGetAheadBehind(git, 'main', 'origin/main')).to.deep.equal({ ahead: 1, behind: 1 });
        });
    });

    describe('gitFetchBranch', () => {
        it('updates the remote tracking ref from the remote', async () => {
            const remotePath = createBareRemote();
            attachRemote(repo, remotePath);

            // A second clone stands in for another developer pushing to the same remote.
            const other = createTempGitRepo({ initialCommit: false });
            other.git('remote', 'add', 'origin', remotePath);
            other.git('fetch', 'origin', 'main');
            other.git('checkout', '-b', 'main', 'origin/main');
            other.commitFile('theirs.txt', 'theirs\n', 'feat: their work');
            other.git('push', 'origin', 'main');

            const before = repo.git('rev-parse', 'origin/main');
            await gitFetchBranch(git, 'origin', 'main');
            const after = repo.git('rev-parse', 'origin/main');

            expect(after).to.not.equal(before);
            other.cleanup();
        });

        it('rejects when the remote does not exist', async () => {
            const error = await rejectionOf(gitFetchBranch(git, 'a-remote-that-does-not-exist', 'main'));

            expect((error as { code: number }).code).to.not.equal(0);
        });
    });

    describe('gitRemoteTagExists', () => {
        it('is false when the remote has no such tag', async () => {
            attachRemote(repo, createBareRemote());

            expect(await gitRemoteTagExists(git, 'origin', 'v1.0.0')).to.equal(false);
        });

        it('is true once the tag has been pushed', async () => {
            attachRemote(repo, createBareRemote());
            repo.git('tag', '-a', 'v1.0.0', '-m', 'the first release');
            repo.git('push', 'origin', 'v1.0.0');

            expect(await gitRemoteTagExists(git, 'origin', 'v1.0.0')).to.equal(true);
        });

        it('rejects when the remote cannot be reached, so the caller can warn rather than block', async () => {
            const error = await rejectionOf(gitRemoteTagExists(git, 'a-remote-that-does-not-exist', 'v1.0.0'));

            expect((error as { code: number }).code).to.not.equal(0);
        });
    });

    describe('gitPushBranch', () => {
        it('pushes the current branch to its upstream', async () => {
            const remotePath = createBareRemote();
            attachRemote(repo, remotePath);
            repo.commitFile('pushed.txt', 'pushed\n', 'feat: work to push');

            await gitPushBranch(git);

            expect(repo.git('rev-parse', 'origin/main')).to.equal(repo.git('rev-parse', 'main'));
        });

        it('carries annotated tags along with the branch by default', async () => {
            attachRemote(repo, createBareRemote());
            repo.commitFile('pushed.txt', 'pushed\n', 'feat: work to push');
            repo.git('tag', '-a', 'v1.1.0', '-m', 'Release version v1.1.0');

            await gitPushBranch(git);

            expect(await gitRemoteTagExists(git, 'origin', 'v1.1.0')).to.equal(true);
        });

        it('leaves tags behind when following them is turned off', async () => {
            attachRemote(repo, createBareRemote());
            repo.commitFile('pushed.txt', 'pushed\n', 'feat: work to push');
            repo.git('tag', '-a', 'v1.1.0', '-m', 'Release version v1.1.0');

            await gitPushBranch(git, false);

            expect(await gitRemoteTagExists(git, 'origin', 'v1.1.0')).to.equal(false);
        });

        it('rejects when the branch has no upstream to push to', async () => {
            repo.commitFile('pushed.txt', 'pushed\n', 'feat: work to push');

            const error = await rejectionOf(gitPushBranch(git));

            expect((error as { code: number }).code).to.not.equal(0);
        });
    });
});

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }

    throw new Error('The promise was expected to reject but it resolved');
}
