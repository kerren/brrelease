import { expect } from 'chai';

import { PreflightCheck, PreflightOptions } from '../../../src/shared/preflight/preflight-check.js';
import { runVersionChecks } from '../../../src/shared/preflight/run-version-checks.js';
import { attachRemote, createBareRemote, createTempGitRepo, TempGitRepo } from '../../helpers/temp-git-repo.js';

describe('runVersionChecks', () => {
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

    describe('the local tag check', () => {
        it('passes when the tag is not in the repository yet', async () => {
            const check = findCheck(
                await runVersionChecks(options(), 'v1.1.0', 'release/v1.1.0'),
                'Tag v1.1.0 does not already exist locally',
            );

            expect(check.status).to.equal('pass');
        });

        it('fails when the tag already exists, which is the state a half finished release leaves behind', async () => {
            repo.git('tag', '-a', 'v1.1.0', '-m', 'a tag from a previous attempt');

            const check = findCheck(
                await runVersionChecks(options(), 'v1.1.0', 'release/v1.1.0'),
                'Tag v1.1.0 does not already exist locally',
            );

            expect(check.status).to.equal('fail');
            expect(check.remedy).to.contain('git tag -d v1.1.0');
        });
    });

    describe('the remote tag check', () => {
        it('is skipped when --skip-fetch was passed, and says why', async () => {
            const check = findCheck(
                await runVersionChecks(options({ skipFetch: true }), 'v1.1.0', 'release/v1.1.0'),
                'Tag v1.1.0 does not already exist on the remote',
            );

            expect(check.status).to.equal('skip');
            expect(check.message).to.contain('--skip-fetch');
        });

        it('passes when the remote does not have the tag', async () => {
            attachRemote(repo, createBareRemote());

            const check = findCheck(
                await runVersionChecks(options({ skipFetch: false }), 'v1.1.0', 'release/v1.1.0'),
                'Tag v1.1.0 does not already exist on the remote',
            );

            expect(check.status).to.equal('pass');
            expect(check.message).to.contain('available on origin');
        });

        it('fails when somebody else has already released the version', async () => {
            attachRemote(repo, createBareRemote());
            repo.git('tag', '-a', 'v1.1.0', '-m', 'released elsewhere');
            repo.git('push', 'origin', 'v1.1.0');
            repo.git('tag', '-d', 'v1.1.0');

            const check = findCheck(
                await runVersionChecks(options({ skipFetch: false }), 'v1.1.0', 'release/v1.1.0'),
                'Tag v1.1.0 does not already exist on the remote',
            );

            expect(check.status).to.equal('fail');
            expect(check.message).to.contain('already exists on origin');
        });

        it('warns rather than failing when the remote cannot be reached', async () => {
            attachRemote(repo, createBareRemote());
            repo.git('remote', 'set-url', 'origin', '/a/path/that/does/not/exist');

            const check = findCheck(
                await runVersionChecks(options({ skipFetch: false }), 'v1.1.0', 'release/v1.1.0'),
                'Tag v1.1.0 does not already exist on the remote',
            );

            expect(check.status).to.equal('warn');
            expect(check.remedy).to.contain('--skip-fetch');
        });

        it('uses the remote configured for the current branch rather than assuming origin', async () => {
            attachRemote(repo, createBareRemote(), 'main', 'upstream');

            const check = findCheck(
                await runVersionChecks(options({ skipFetch: false }), 'v1.1.0', 'release/v1.1.0'),
                'Tag v1.1.0 does not already exist on the remote',
            );

            expect(check.status).to.equal('pass');
            expect(check.message).to.contain('available on upstream');
        });
    });

    describe('the release branch check', () => {
        it('passes when the release branch is free', async () => {
            const check = findCheck(
                await runVersionChecks(options(), 'v1.1.0', 'release/v1.1.0'),
                'Release branch release/v1.1.0 does not already exist',
            );

            expect(check.status).to.equal('pass');
        });

        it('fails when a release branch of the same name is still around', async () => {
            repo.git('branch', 'release/v1.1.0');

            const check = findCheck(
                await runVersionChecks(options(), 'v1.1.0', 'release/v1.1.0'),
                'Release branch release/v1.1.0 does not already exist',
            );

            expect(check.status).to.equal('fail');
            expect(check.remedy).to.contain('git branch -D release/v1.1.0');
        });
    });

    it('runs every check even when an earlier one has already failed, so the user sees the whole picture', async () => {
        repo.git('tag', '-a', 'v1.1.0', '-m', 'a tag from a previous attempt');
        repo.git('branch', 'release/v1.1.0');

        const checks = await runVersionChecks(options(), 'v1.1.0', 'release/v1.1.0');

        expect(checks).to.have.lengthOf(3);
        expect(checks.filter((check) => check.status === 'fail')).to.have.lengthOf(2);
    });
});

function findCheck(checks: PreflightCheck[], name: string): PreflightCheck {
    const check = checks.find((candidate) => candidate.name === name);
    if (!check) {
        throw new Error(`Expected a check named "${name}" but found: ${checks.map((c) => c.name).join(', ')}`);
    }

    return check;
}
