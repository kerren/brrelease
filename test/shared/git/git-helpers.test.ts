import { expect } from 'chai';

import { gitCheckForChanges } from '../../../src/shared/git/git-check-for-changes.js';
import { gitCheckoutBranch } from '../../../src/shared/git/git-checkout-branch.js';
import { gitCommitChanges } from '../../../src/shared/git/git-commit-changes.js';
import { gitCreateBranch } from '../../../src/shared/git/git-create-branch.js';
import { gitCreateTag } from '../../../src/shared/git/git-create-tag.js';
import { gitDeleteBranch } from '../../../src/shared/git/git-delete-branch.js';
import { gitDiscardAllUnstagedChanges } from '../../../src/shared/git/git-discard-all-unstaged-changes.js';
import { gitGetCurrentBranch } from '../../../src/shared/git/git-get-current-branch.js';
import { gitMergeBranch } from '../../../src/shared/git/git-merge-branch.js';
import { gitStageChanges } from '../../../src/shared/git/git-stage-changes.js';
import { gitStageFile } from '../../../src/shared/git/git-stage-file.js';
import { createTempGitRepo, TempGitRepo } from '../../helpers/temp-git-repo.js';

const git = 'git';

describe('git helpers', () => {
    let repo: TempGitRepo;
    let originalWorkingDirectory: string;

    // Every helper shells out to git in the process working directory, so the tests run from
    // inside the fixture rather than passing a path.
    beforeEach(() => {
        originalWorkingDirectory = process.cwd();
        repo = createTempGitRepo();
        process.chdir(repo.path);
    });

    afterEach(() => {
        process.chdir(originalWorkingDirectory);
        repo.cleanup();
    });

    describe('gitGetCurrentBranch', () => {
        it('returns the branch the repository is on, without a trailing newline', async () => {
            const result = await gitGetCurrentBranch(git);

            expect(result.stdout).to.equal('main');
        });

        it('follows a checkout', async () => {
            repo.git('checkout', '-b', 'feature/something');

            const result = await gitGetCurrentBranch(git);

            expect(result.stdout).to.equal('feature/something');
        });
    });

    describe('gitCheckForChanges', () => {
        it('is false for a clean working tree', async () => {
            expect(await gitCheckForChanges(git)).to.equal(false);
        });

        it('is true when a tracked file has been modified', async () => {
            repo.writeFile('package.json', '{"name":"fixture-package","version":"1.0.1"}\n');

            expect(await gitCheckForChanges(git)).to.equal(true);
        });

        it('is true when there is an untracked file', async () => {
            repo.writeFile('notes.txt', 'untracked\n');

            expect(await gitCheckForChanges(git)).to.equal(true);
        });

        it('is true when a change is staged but not committed', async () => {
            repo.writeFile('notes.txt', 'staged\n');
            repo.git('add', 'notes.txt');

            expect(await gitCheckForChanges(git)).to.equal(true);
        });

        it('is false again once the changes are committed', async () => {
            repo.commitFile('notes.txt', 'committed\n', 'chore: add notes');

            expect(await gitCheckForChanges(git)).to.equal(false);
        });
    });

    describe('gitCreateBranch', () => {
        it('creates the branch and checks it out', async () => {
            await gitCreateBranch(git, 'release/v1.1.0');

            expect(repo.currentBranch()).to.equal('release/v1.1.0');
            expect(repo.branches()).to.include('release/v1.1.0');
        });

        it('rejects when the branch already exists', async () => {
            await gitCreateBranch(git, 'release/v1.1.0');
            await gitCheckoutBranch(git, 'main');

            const error = await rejectionOf(gitCreateBranch(git, 'release/v1.1.0'));

            expect(String((error as { stderr: string }).stderr)).to.contain('already exists');
        });
    });

    describe('gitCheckoutBranch', () => {
        it('moves onto an existing branch', async () => {
            repo.git('branch', 'develop');

            await gitCheckoutBranch(git, 'develop');

            expect(repo.currentBranch()).to.equal('develop');
        });

        it('rejects for a branch that does not exist', async () => {
            const error = await rejectionOf(gitCheckoutBranch(git, 'no-such-branch'));

            expect((error as { code: number }).code).to.not.equal(0);
        });
    });

    describe('gitDeleteBranch', () => {
        it('deletes a branch that has been merged', async () => {
            await gitCreateBranch(git, 'release/v1.1.0');
            await gitCheckoutBranch(git, 'main');

            await gitDeleteBranch(git, 'release/v1.1.0');

            expect(repo.branches()).to.not.include('release/v1.1.0');
        });

        it('refuses to delete a branch holding unmerged work, because it uses the safe -d flag', async () => {
            await gitCreateBranch(git, 'release/v1.1.0');
            repo.commitFile('unmerged.txt', 'work\n', 'feat: unmerged work');
            await gitCheckoutBranch(git, 'main');

            const error = await rejectionOf(gitDeleteBranch(git, 'release/v1.1.0'));

            expect(String((error as { stderr: string }).stderr)).to.contain('not fully merged');
            expect(repo.branches()).to.include('release/v1.1.0');
        });
    });

    describe('gitStageFile and gitStageChanges', () => {
        it('stages only the named file', async () => {
            repo.writeFile('CHANGELOG.md', '# Changelog\n');
            repo.writeFile('other.txt', 'not staged\n');

            await gitStageFile(git, 'CHANGELOG.md');

            expect(stagedFiles(repo)).to.deep.equal(['CHANGELOG.md']);
        });

        it('stages everything, including deletions', async () => {
            repo.commitFile('doomed.txt', 'goodbye\n', 'chore: add a file to delete');
            repo.git('rm', '--quiet', 'doomed.txt');
            repo.writeFile('added.txt', 'hello\n');

            await gitStageChanges(git);

            expect(stagedFiles(repo)).to.have.members(['added.txt', 'doomed.txt']);
        });
    });

    describe('gitCommitChanges', () => {
        it('commits the staged changes with the given message', async () => {
            repo.writeFile('CHANGELOG.md', '# Changelog\n');
            await gitStageFile(git, 'CHANGELOG.md');

            await gitCommitChanges(git, 'chore: generate the changelog', false);

            expect(repo.log()[0]).to.equal('chore: generate the changelog');
            expect(await gitCheckForChanges(git)).to.equal(false);
        });

        it('passes --no-gpg-sign when signing is off, so the repository config cannot force a signature', async () => {
            repo.git('config', 'commit.gpgsign', 'true');
            // A key that does not exist, so the commit can only succeed if signing is suppressed.
            repo.git('config', 'user.signingkey', 'DOESNOTEXIST');
            repo.writeFile('CHANGELOG.md', '# Changelog\n');
            await gitStageFile(git, 'CHANGELOG.md');

            await gitCommitChanges(git, 'chore: generate the changelog', false);

            expect(repo.log()[0]).to.equal('chore: generate the changelog');
        });

        it('rejects when there is nothing staged to commit', async () => {
            const error = await rejectionOf(gitCommitChanges(git, 'chore: nothing to do', false));

            expect((error as { code: number }).code).to.not.equal(0);
        });
    });

    describe('gitDiscardAllUnstagedChanges', () => {
        it('restores tracked files that were modified', async () => {
            repo.writeFile('package.json', '{"broken":true}\n');

            await gitDiscardAllUnstagedChanges(git);

            expect(JSON.parse(repo.readFile('package.json')).version).to.equal('1.0.0');
        });

        it('leaves untracked files alone, which is why the release stages before it discards', async () => {
            repo.writeFile('untracked.txt', 'still here\n');

            await gitDiscardAllUnstagedChanges(git);

            expect(repo.exists('untracked.txt')).to.equal(true);
        });
    });

    describe('gitMergeBranch', () => {
        it('creates a merge commit rather than fast forwarding', async () => {
            await gitCreateBranch(git, 'release/v1.1.0');
            repo.commitFile('release.txt', 'released\n', 'chore: release work');
            await gitCheckoutBranch(git, 'main');

            await gitMergeBranch(git, 'release/v1.1.0', false);

            expect(repo.log()[0]).to.equal(`Merge branch 'release/v1.1.0'`);
            expect(repo.exists('release.txt')).to.equal(true);
        });

        it('fast forwards when asked to', async () => {
            await gitCreateBranch(git, 'release/v1.1.0');
            repo.commitFile('release.txt', 'released\n', 'chore: release work');
            await gitCheckoutBranch(git, 'main');

            await gitMergeBranch(git, 'release/v1.1.0', false, false);

            expect(repo.log()[0]).to.equal('chore: release work');
        });

        it('rejects on a conflict and leaves the merge for the user to resolve', async () => {
            repo.commitFile('conflict.txt', 'main version\n', 'feat: main version');
            repo.git('checkout', '-b', 'other', 'HEAD~1');
            repo.commitFile('conflict.txt', 'other version\n', 'feat: other version');
            await gitCheckoutBranch(git, 'main');

            const error = await rejectionOf(gitMergeBranch(git, 'other', false));

            expect(String((error as { stdout: string }).stdout)).to.contain('CONFLICT');
        });
    });

    describe('gitCreateTag', () => {
        it('creates an annotated tag carrying the changelog in its message', async () => {
            await gitCreateTag(git, 'v1.1.0', '### Features\n\n* something new\n');

            expect(repo.tags()).to.deep.equal(['v1.1.0']);
            expect(repo.git('cat-file', '-t', 'v1.1.0')).to.equal('tag');

            const message = repo.tagMessage('v1.1.0');
            expect(message).to.contain('Release version v1.1.0');
            expect(message).to.contain('something new');
        });

        it('rejects when the tag already exists', async () => {
            await gitCreateTag(git, 'v1.1.0', 'notes');

            const error = await rejectionOf(gitCreateTag(git, 'v1.1.0', 'notes'));

            expect(String((error as { stderr: string }).stderr)).to.contain('already exists');
        });
    });
});

function stagedFiles(repo: TempGitRepo): string[] {
    return repo
        .git('diff', '--cached', '--name-only')
        .split('\n')
        .filter((line) => line !== '');
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }

    throw new Error('The promise was expected to reject but it resolved');
}
