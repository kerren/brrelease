import { gitGetBranchRemote } from '../git/git-get-branch-remote.js';
import { gitLocalBranchExists } from '../git/git-local-branch-exists.js';
import { gitLocalTagExists } from '../git/git-local-tag-exists.js';
import { gitRemoteTagExists } from '../git/git-remote-tag-exists.js';
import { PreflightCheck, PreflightOptions } from './preflight-check.js';

/**
 * Checks that can only run once the new version number is known, since they depend on the tag and
 * release branch names that the release is about to create.
 */
export async function runVersionChecks(options: PreflightOptions, tag: string, releaseBranchName: string): Promise<PreflightCheck[]> {
    const { gitBinaryPath } = options;
    const checks: PreflightCheck[] = [];

    checks.push(await checkTagIsAvailableLocally(gitBinaryPath, tag));
    checks.push(await checkTagIsAvailableOnRemote(options, tag));
    checks.push(await checkReleaseBranchIsAvailable(gitBinaryPath, releaseBranchName));

    return checks;
}

async function checkTagIsAvailableLocally(gitBinaryPath: string, tag: string): Promise<PreflightCheck> {
    const name = `Tag ${tag} does not already exist locally`;
    const exists = await gitLocalTagExists(gitBinaryPath, tag);

    if (exists) {
        return {
            name,
            status: 'fail',
            message: `The tag ${tag} already exists in this repository`,
            remedy: `Delete it with "git tag -d ${tag}" if it was created in error, or use --release-as/--prerelease to pick a different version`,
        };
    }

    return { name, status: 'pass', message: `${tag} is available` };
}

async function checkTagIsAvailableOnRemote(options: PreflightOptions, tag: string): Promise<PreflightCheck> {
    const { gitBinaryPath, currentBranch, skipFetch } = options;
    const name = `Tag ${tag} does not already exist on the remote`;

    if (skipFetch) {
        return {
            name,
            status: 'skip',
            message: 'Skipped because --skip-fetch was passed',
            remedy: 'A tag that already exists on the remote will only be discovered when the push is rejected',
        };
    }

    const remote = (await gitGetBranchRemote(gitBinaryPath, currentBranch)) ?? 'origin';

    let exists: boolean;
    try {
        exists = await gitRemoteTagExists(gitBinaryPath, remote, tag);
    } catch {
        return {
            name,
            status: 'warn',
            message: `Could not reach ${remote} to check whether ${tag} already exists`,
            remedy: 'Check your network connection and remote access, or pass --skip-fetch to run the release without contacting the remote',
        };
    }

    if (exists) {
        return {
            name,
            status: 'fail',
            message: `The tag ${tag} already exists on ${remote}`,
            remedy: `Someone has already released ${tag}. Pull the latest tags with "git fetch --tags" and pick a different version.`,
        };
    }

    return { name, status: 'pass', message: `${tag} is available on ${remote}` };
}

async function checkReleaseBranchIsAvailable(gitBinaryPath: string, releaseBranchName: string): Promise<PreflightCheck> {
    const name = `Release branch ${releaseBranchName} does not already exist`;
    const exists = await gitLocalBranchExists(gitBinaryPath, releaseBranchName);

    if (exists) {
        return {
            name,
            status: 'fail',
            message: `The branch ${releaseBranchName} already exists`,
            remedy: `It is usually left behind by a release that failed part way through. Inspect it, then remove it with "git branch -D ${releaseBranchName}" once you are sure it is not needed.`,
        };
    }

    return { name, status: 'pass', message: `${releaseBranchName} is available` };
}
