import { expect } from 'chai';

import { PreflightCheck, PreflightOptions } from '../../../src/shared/preflight/preflight-check.js';
import { runRepositoryChecks } from '../../../src/shared/preflight/run-repository-checks.js';
import { attachRemote, createBareRemote, createTempGitRepo, TempGitRepo } from '../../helpers/temp-git-repo.js';

describe('runRepositoryChecks', () => {
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

    function options(overrides: Partial<PreflightOptions> = {}): PreflightOptions {
        return {
            failOnUncommitted: false,
            autoPush: false,
            currentBranch: 'main',
            gitBinaryPath: 'git',
            skipFetch: true,
            ...overrides,
        };
    }

    describe('the working tree check', () => {
        it('passes when there is nothing uncommitted', async () => {
            const check = findCheck(await runRepositoryChecks(options()), 'Working tree');

            expect(check.status).to.equal('pass');
        });

        it('warns, rather than fails, when there are uncommitted changes', async () => {
            repo.writeFile('scratch.txt', 'work in progress\n');

            const check = findCheck(await runRepositoryChecks(options()), 'Working tree');

            expect(check.status).to.equal('warn');
            expect(check.message).to.contain('uncommitted changes');
            expect(check.remedy).to.contain('--fail-on-uncommitted');
        });

        it('fails when there are uncommitted changes and --fail-on-uncommitted is used', async () => {
            repo.writeFile('scratch.txt', 'work in progress\n');

            const check = findCheck(await runRepositoryChecks(options({ failOnUncommitted: true })), 'Working tree');

            expect(check.status).to.equal('fail');
            expect(check.message).to.contain('uncommitted changes');
            expect(check.remedy).to.contain('Commit or stash');
        });

        it('passes when the tree is clean even with --fail-on-uncommitted', async () => {
            const check = findCheck(await runRepositoryChecks(options({ failOnUncommitted: true })), 'Working tree');

            expect(check.status).to.equal('pass');
        });
    });

    describe('the merge target check', () => {
        it('is not run when there is no separate merge target', async () => {
            const checks = await runRepositoryChecks(options());

            expect(checks.map((c) => c.name).join('\n')).to.not.contain('Merge target');
        });

        it('is not run when the merge target is the branch we are already on', async () => {
            const checks = await runRepositoryChecks(options({ mergeIntoBranch: 'main' }));

            expect(checks.map((c) => c.name).join('\n')).to.not.contain('Merge target');
        });

        it('passes when the merge target exists locally', async () => {
            repo.git('branch', 'production');

            const check = findCheck(
                await runRepositoryChecks(options({ mergeIntoBranch: 'production' })),
                'Merge target production exists',
            );

            expect(check.status).to.equal('pass');
        });

        it('fails when the merge target does not exist locally', async () => {
            const check = findCheck(
                await runRepositoryChecks(options({ mergeIntoBranch: 'production' })),
                'Merge target production exists',
            );

            expect(check.status).to.equal('fail');
            expect(check.remedy).to.contain('git checkout production');
        });
    });

    describe('the branch sync check', () => {
        it('warns when the branch has no upstream and the release will not push', async () => {
            const check = findCheck(await runRepositoryChecks(options()), 'Branch main is in sync with its remote');

            expect(check.status).to.equal('warn');
            expect(check.message).to.contain('no upstream branch configured');
        });

        it('fails when the branch has no upstream but --auto-push was requested', async () => {
            const check = findCheck(await runRepositoryChecks(options({ autoPush: true })), 'Branch main is in sync with its remote');

            expect(check.status).to.equal('fail');
            expect(check.remedy).to.contain('git push -u origin main');
        });

        it('warns rather than passing when the comparison was made without fetching', async () => {
            attachRemote(repo, createBareRemote());

            const check = findCheck(await runRepositoryChecks(options()), 'Branch main is in sync with its remote');

            expect(check.status).to.equal('warn');
            expect(check.message).to.contain('compared without refreshing from the remote');
        });

        it('passes when the branch is level with its upstream and the remote was fetched', async () => {
            attachRemote(repo, createBareRemote());

            const check = findCheck(await runRepositoryChecks(options({ skipFetch: false })), 'Branch main is in sync with its remote');

            expect(check.status).to.equal('pass');
            expect(check.message).to.contain('up to date with origin/main');
        });

        it('passes with unpushed commits, since being ahead is the normal state before a release', async () => {
            attachRemote(repo, createBareRemote());
            repo.commitFile('one.txt', 'one\n', 'feat: unpushed work');

            const check = findCheck(await runRepositoryChecks(options({ skipFetch: false })), 'Branch main is in sync with its remote');

            expect(check.status).to.equal('pass');
            expect(check.message).to.contain('1 unpushed commit(s)');
        });

        it('fails when the branch is behind its upstream', async () => {
            attachRemote(repo, createBareRemote());
            repo.commitFile('one.txt', 'one\n', 'feat: remote work');
            repo.git('push', 'origin', 'main');
            repo.git('reset', '--hard', 'HEAD~1');

            const check = findCheck(await runRepositoryChecks(options({ skipFetch: false })), 'Branch main is in sync with its remote');

            expect(check.status).to.equal('fail');
            expect(check.message).to.contain('1 commit(s) behind');
        });

        it('fails when the branch has diverged from its upstream', async () => {
            attachRemote(repo, createBareRemote());
            repo.commitFile('remote.txt', 'remote\n', 'feat: remote work');
            repo.git('push', 'origin', 'main');
            repo.git('reset', '--hard', 'HEAD~1');
            repo.commitFile('local.txt', 'local\n', 'feat: local work');

            const check = findCheck(await runRepositoryChecks(options({ skipFetch: false })), 'Branch main is in sync with its remote');

            expect(check.status).to.equal('fail');
            expect(check.message).to.contain('has diverged');
            expect(check.message).to.contain('1 ahead, 1 behind');
        });

        it('warns when the remote cannot be reached, and still reports on the last known state', async () => {
            attachRemote(repo, createBareRemote());
            repo.git('remote', 'set-url', 'origin', '/a/path/that/does/not/exist');

            const checks = await runRepositoryChecks(options({ skipFetch: false }));

            const fetchCheck = findCheck(checks, 'Fetch origin/main');
            expect(fetchCheck.status).to.equal('warn');
            expect(fetchCheck.message).to.contain('Could not reach origin');

            const syncCheck = findCheck(checks, 'Branch main is in sync with its remote');
            expect(syncCheck.status).to.equal('warn');
        });

        it('checks the merge target as well as the current branch', async () => {
            repo.git('branch', 'production');

            const names = (await runRepositoryChecks(options({ mergeIntoBranch: 'production' }))).map((c) => c.name);

            expect(names).to.include('Branch main is in sync with its remote');
            expect(names).to.include('Branch production is in sync with its remote');
        });
    });
});

function findCheck(checks: PreflightCheck[], name: string): PreflightCheck {
    const check = checks.find((candidate) => candidate.name === name);
    if (!check) {
        throw new Error(`Expected a check named "${name}" but found: ${checks.map((c) => c.name).join(', ')}`);
    }

    return check;
}
