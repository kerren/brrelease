import { expect } from 'chai';

import { runRelease, runReleaseExpectingFailure } from '../helpers/run-release.js';
import { attachRemote, createBareRemote, createTempDirectory, createTempGitRepo, TempGitRepo } from '../helpers/temp-git-repo.js';

describe('release', () => {
    let repo: TempGitRepo;

    beforeEach(() => {
        repo = createTempGitRepo();
    });

    afterEach(() => {
        repo.cleanup();
    });

    describe('the single branch flow', () => {
        it('tags the release, writes the changelog, bumps the version and cleans up after itself', async () => {
            await runRelease(repo);

            expect(repo.tags()).to.deep.equal(['v1.1.0']);
            expect(repo.packageVersion()).to.equal('1.1.0');
            expect(repo.exists('CHANGELOG.md')).to.equal(true);
            expect(repo.currentBranch()).to.equal('main');
            expect(repo.branches()).to.deep.equal(['main']);
        });

        it('leaves the working tree clean', async () => {
            await runRelease(repo);

            expect(repo.git('status', '--porcelain')).to.equal('');
        });

        it('builds the history as a changelog commit, a bump commit and a merge back into the branch', async () => {
            await runRelease(repo);

            expect(repo.log()).to.deep.equal([
                `Merge branch 'release/v1.1.0'`,
                'chore: bump the version in project files',
                'chore: generate the changelog',
                'feat: the initial commit',
            ]);
        });

        it('points the tag at the merge commit on the released branch', async () => {
            await runRelease(repo);

            expect(repo.git('rev-list', '-n', '1', 'v1.1.0')).to.equal(repo.git('rev-parse', 'main'));
        });

        it('writes the changelog entries into the annotated tag message', async () => {
            repo.commitFile('feature.txt', 'a feature\n', 'feat: something users will notice');
            repo.commitFile('fix.txt', 'a fix\n', 'fix: something users were tripping over');

            await runRelease(repo);

            const message = repo.tagMessage('v1.1.0');
            expect(message).to.contain('Release version v1.1.0');
            expect(message).to.contain('something users will notice');
            expect(message).to.contain('something users were tripping over');
        });

        it('records the changelog entries in the changelog file', async () => {
            repo.commitFile('feature.txt', 'a feature\n', 'feat: an entry for the changelog');

            await runRelease(repo);

            const changelog = repo.readFile('CHANGELOG.md');
            expect(changelog).to.contain('1.1.0');
            expect(changelog).to.contain('an entry for the changelog');
        });

        it('picks the version up from the conventional commits since the last release', async () => {
            repo.commitFile('fix.txt', 'a fix\n', 'fix: only a patch this time');

            await runRelease(repo);

            expect(repo.tags()).to.deep.equal(['v1.1.0']);
        });

        it('releases twice in a row, building on the previous tag', async () => {
            await runRelease(repo);
            repo.commitFile('fix.txt', 'a fix\n', 'fix: something after the first release');

            await runRelease(repo);

            expect(repo.tags()).to.have.members(['v1.1.0', 'v1.1.1']);
            expect(repo.packageVersion()).to.equal('1.1.1');
            expect(repo.readFile('CHANGELOG.md')).to.contain('something after the first release');
        });
    });

    describe('the multi branch flow', () => {
        beforeEach(() => {
            // `develop` is where the work happens, `production` is what gets released, which is the
            // arrangement --merge-into-branch exists for.
            repo.git('branch', 'production');
            repo.git('checkout', '-b', 'develop');
        });

        it('merges the release into the target branch and tags it there', async () => {
            await runRelease(repo, ['--merge-into-branch=production']);

            expect(repo.tags()).to.deep.equal(['v1.1.0']);
            expect(repo.git('rev-list', '-n', '1', 'v1.1.0')).to.equal(repo.git('rev-parse', 'production'));
        });

        it('merges the target branch back into the branch the release was started from', async () => {
            await runRelease(repo, ['--merge-into-branch=production']);

            expect(repo.currentBranch()).to.equal('develop');
            expect(repo.git('rev-parse', 'develop')).to.not.equal(repo.git('rev-parse', 'production'));
            // `develop` contains everything `production` does, which is what keeps the next
            // changelog correct.
            expect(branchesContaining(repo, 'production')).to.include('develop');
        });

        it('deletes the release branch and leaves both branches behind', async () => {
            await runRelease(repo, ['--merge-into-branch=production']);

            expect(repo.branches()).to.have.members(['develop', 'main', 'production']);
        });

        it('bumps the version on both branches', async () => {
            await runRelease(repo, ['--merge-into-branch=production']);

            expect(repo.packageVersion()).to.equal('1.1.0');
            repo.git('checkout', 'production');
            expect(repo.packageVersion()).to.equal('1.1.0');
        });

        it('does not take the different branch route when the target is the branch we are already on', async () => {
            await runRelease(repo, ['--merge-into-branch=develop']);

            expect(repo.currentBranch()).to.equal('develop');
            expect(repo.git('rev-list', '-n', '1', 'v1.1.0')).to.equal(repo.git('rev-parse', 'develop'));
        });
    });

    describe('versioning flags', () => {
        it('honours --release-as', async () => {
            await runRelease(repo, ['--release-as=major']);

            expect(repo.tags()).to.deep.equal(['v2.0.0']);
            expect(repo.packageVersion()).to.equal('2.0.0');
        });

        it('honours --prerelease', async () => {
            await runRelease(repo, ['--prerelease=beta']);

            expect(repo.tags()).to.deep.equal(['v1.1.0-beta.0']);
            expect(repo.packageVersion()).to.equal('1.1.0-beta.0');
        });

        it('tags the current version without bumping it when --first-release is used', async () => {
            await runRelease(repo, ['--first-release']);

            expect(repo.tags()).to.deep.equal(['v1.0.0']);
            expect(repo.packageVersion()).to.equal('1.0.0');
            expect(repo.log()).to.not.include('chore: bump the version in project files');
        });

        it('honours a custom --tag-prefix', async () => {
            await runRelease(repo, ['--tag-prefix=release-']);

            expect(repo.tags()).to.deep.equal(['release-1.1.0']);
        });

        it('honours a custom --release-branch-prefix', async () => {
            await runRelease(repo, ['--release-branch-prefix=rel/']);

            expect(repo.log()[0]).to.equal(`Merge branch 'rel/v1.1.0'`);
            expect(repo.branches()).to.deep.equal(['main']);
        });
    });

    describe('the changelog flags', () => {
        it('writes the changelog to a custom path', async () => {
            await runRelease(repo, ['--changelog-file-path=RELEASES.md']);

            expect(repo.exists('RELEASES.md')).to.equal(true);
            expect(repo.exists('CHANGELOG.md')).to.equal(false);
            expect(repo.readFile('RELEASES.md')).to.contain('1.1.0');
        });

        it('uses a custom commit message for the changelog', async () => {
            await runRelease(repo, ['--changelog-commit-message=docs: write the release notes']);

            expect(repo.log()).to.include('docs: write the release notes');
            expect(repo.log()).to.not.include('chore: generate the changelog');
        });

        it('skips the changelog entirely when asked to, while still tagging and bumping', async () => {
            await runRelease(repo, ['--skip-changelog']);

            expect(repo.exists('CHANGELOG.md')).to.equal(false);
            expect(repo.tags()).to.deep.equal(['v1.1.0']);
            expect(repo.packageVersion()).to.equal('1.1.0');
            expect(repo.log()).to.not.include('chore: generate the changelog');
        });
    });

    describe('the bump file flags', () => {
        it('bumps additional files named with --bump-file', async () => {
            // commit-and-tag-version recognises the file by name, so this uses one it knows about.
            repo.commitFile(
                'package-lock.json',
                `${JSON.stringify({ lockfileVersion: 3, name: 'fixture-package', version: '1.0.0' }, null, 2)}\n`,
                'chore: add a lock file',
            );

            await runRelease(repo, ['--bump-file=package-lock.json']);

            expect(JSON.parse(repo.readFile('package-lock.json')).version).to.equal('1.1.0');
            expect(repo.packageVersion()).to.equal('1.1.0');
        });

        it('uses a custom commit message when bumping', async () => {
            await runRelease(repo, ['--bump-files-commit-message=chore: set the new version']);

            expect(repo.log()).to.include('chore: set the new version');
        });

        it('reports that there was nothing to bump when no package or bump files are given', async () => {
            const { stderr } = await runRelease(repo, ['--package-file=']);

            expect(stderr).to.contain('No files specified to bump');
            expect(repo.tags()).to.deep.equal(['v1.1.0']);
            expect(repo.log()).to.not.include('chore: bump the version in project files');
        });
    });

    describe('the user scripts flag', () => {
        // The command shells out to /bin/bash, so these cannot run on Windows.
        before(function skipOnWindows() {
            if (process.platform === 'win32') {
                this.skip();
            }
        });

        it('runs the script and commits the files it produced', async () => {
            await runRelease(repo, ['--run-script-during-release=echo generated > generated.txt']);

            expect(repo.exists('generated.txt')).to.equal(true);
            expect(repo.log()).to.include('chore: generate the release file changes');
        });

        it('runs several scripts in the order they were given', async () => {
            await runRelease(repo, [
                '--run-script-during-release=echo first > order.txt',
                '--run-script-during-release=echo second >> order.txt',
            ]);

            expect(repo.readFile('order.txt')).to.equal('first\nsecond\n');
        });

        it('uses a custom commit message for the generated files', async () => {
            await runRelease(repo, [
                '--run-script-during-release=echo generated > generated.txt',
                '--run-script-during-release-commit-message=chore: regenerate the docs',
            ]);

            expect(repo.log()).to.include('chore: regenerate the docs');
        });

        it('does not add a commit when the script changed nothing', async () => {
            const { stderr } = await runRelease(repo, ['--run-script-during-release=echo nothing to see here']);

            expect(stderr).to.contain('no file changes found');
            expect(repo.log()).to.not.include('chore: generate the release file changes');
        });

        it('runs the script inside the release branch, before the merge', async () => {
            await runRelease(repo, ['--run-script-during-release=git rev-parse --abbrev-ref HEAD > branch.txt']);

            expect(repo.readFile('branch.txt').trim()).to.equal('release/v1.1.0');
        });

        it('aborts the release when a script fails', async () => {
            const { message } = await runReleaseExpectingFailure(repo, ['--run-script-during-release=exit 7']);

            expect(message).to.be.a('string');
            expect(repo.tags()).to.deep.equal([]);
        });
    });

    describe('preflight', () => {
        it('warns about uncommitted changes but still releases, because a build leaves files behind', async () => {
            repo.writeFile('scratch.txt', 'work in progress\n');

            const { stdout } = await runRelease(repo);

            expect(stdout).to.contain('There are uncommitted changes in the working tree');
            expect(repo.tags()).to.deep.equal(['v1.1.0']);
        });

        it('refuses to release with uncommitted changes when --fail-on-uncommitted is passed', async () => {
            repo.writeFile('scratch.txt', 'work in progress\n');

            const { message, stdout } = await runReleaseExpectingFailure(repo, ['--fail-on-uncommitted']);

            expect(message).to.contain('Preflight found 1 problem(s)');
            expect(stdout).to.contain('There are uncommitted changes in the working tree');
            expect(repo.tags()).to.deep.equal([]);
            expect(repo.exists('scratch.txt')).to.equal(true);
        });

        it('releases anyway when --skip-preflight is passed, and says that it did', async () => {
            repo.writeFile('scratch.txt', 'work in progress\n');

            const { stdout } = await runRelease(repo, ['--skip-preflight']);

            expect(stdout).to.contain('Skipping the preflight checks');
            expect(stdout).to.not.contain('Running preflight checks');
            expect(repo.tags()).to.deep.equal(['v1.1.0']);
        });

        it('refuses to release a version that is already tagged', async () => {
            // A release that tagged but never bumped the version leaves exactly this behind: the
            // tag for the version the next release is about to calculate.
            repo.git('tag', '-a', 'v1.1.0', '-m', 'a tag left behind by a previous attempt');
            repo.commitFile('feature.txt', 'a feature\n', 'feat: work done since the tag');

            const { message, stdout } = await runReleaseExpectingFailure(repo);

            expect(message).to.contain('Preflight found');
            expect(stdout).to.contain('The tag v1.1.0 already exists in this repository');
        });

        it('refuses to release when the release branch is still hanging around', async () => {
            repo.git('branch', 'release/v1.1.0');

            const { message, stdout } = await runReleaseExpectingFailure(repo);

            expect(message).to.contain('Preflight found');
            expect(stdout).to.contain('The branch release/v1.1.0 already exists');
            expect(repo.tags()).to.deep.equal([]);
        });

        it('refuses to release into a branch that does not exist locally', async () => {
            const { message, stdout } = await runReleaseExpectingFailure(repo, ['--merge-into-branch=production']);

            expect(message).to.contain('Preflight found');
            expect(stdout).to.contain('The branch production does not exist locally');
        });

        it('refuses to auto push a branch that has no upstream', async () => {
            const { message, stdout } = await runReleaseExpectingFailure(repo, ['--auto-push']);

            expect(message).to.contain('Preflight found');
            expect(stdout).to.contain('main has no upstream branch configured');
        });

        it('warns but does not block when the branch has no upstream and nothing will be pushed', async () => {
            const { stdout } = await runRelease(repo);

            expect(stdout).to.contain('main has no upstream branch configured');
            expect(repo.tags()).to.deep.equal(['v1.1.0']);
        });

        it('refuses to release from a directory that is not a git repository', async () => {
            const { message } = await runReleaseExpectingFailure({ path: createTempDirectory() });

            expect(message).to.contain('does not look like a git repository');
        });
    });

    describe('--auto-push', () => {
        it('pushes the branch and the tag to the remote', async () => {
            const remotePath = createBareRemote();
            attachRemote(repo, remotePath);

            await runRelease(repo, ['--auto-push']);

            expect(repo.git('ls-remote', '--tags', 'origin', 'refs/tags/v1.1.0')).to.contain('refs/tags/v1.1.0');
            expect(repo.git('ls-remote', 'origin', 'refs/heads/main')).to.contain(repo.git('rev-parse', 'main'));
        });

        it('pushes both branches when the release is merged into a different one', async () => {
            const remotePath = createBareRemote();
            repo.git('branch', 'production');
            attachRemote(repo, remotePath, 'main');
            repo.git('push', '--set-upstream', 'origin', 'production');
            repo.git('checkout', 'main');

            await runRelease(repo, ['--merge-into-branch=production', '--auto-push']);

            expect(repo.git('ls-remote', 'origin', 'refs/heads/production')).to.contain(repo.git('rev-parse', 'production'));
            expect(repo.git('ls-remote', 'origin', 'refs/heads/main')).to.contain(repo.git('rev-parse', 'main'));
            expect(repo.git('ls-remote', '--tags', 'origin', 'refs/tags/v1.1.0')).to.contain('refs/tags/v1.1.0');
        });

        it('does not touch the remote when it is not passed', async () => {
            attachRemote(repo, createBareRemote());
            const remoteHeadBefore = repo.git('ls-remote', 'origin', 'refs/heads/main');

            await runRelease(repo);

            expect(repo.git('ls-remote', 'origin', 'refs/heads/main')).to.equal(remoteHeadBefore);
            expect(repo.git('ls-remote', '--tags', 'origin', 'refs/tags/v1.1.0')).to.equal('');
        });
    });

    describe('--git-binary-path', () => {
        it('reports a helpful error when the configured binary is not git', async () => {
            const { message } = await runReleaseExpectingFailure(repo, [`--git-binary-path=${process.execPath}`]);

            expect(message).to.contain('does not look like a git repository');
        });
    });
});

/**
 * The local branches whose history contains the given ref.
 *
 * @param repo - The repository to inspect
 * @param ref - The ref that the branches should contain
 * @returns The branch names
 */
function branchesContaining(repo: TempGitRepo, ref: string): string[] {
    return repo
        .git('branch', '--format=%(refname:short)', '--contains', ref)
        .split('\n')
        .filter((line) => line !== '');
}
