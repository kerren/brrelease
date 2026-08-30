import { gitCheckForChanges } from '../git/git-check-for-changes.js';
import { gitFetchBranch } from '../git/git-fetch-branch.js';
import { gitGetAheadBehind } from '../git/git-get-ahead-behind.js';
import { gitGetBranchRemote } from '../git/git-get-branch-remote.js';
import { gitGetUpstreamBranch } from '../git/git-get-upstream-branch.js';
import { gitLocalBranchExists } from '../git/git-local-branch-exists.js';
import { PreflightCheck, PreflightOptions } from './preflight-check.js';

/**
 * Checks that depend only on the state of the repository, so they can run before the version
 * number has been calculated.
 */
export async function runRepositoryChecks(options: PreflightOptions): Promise<PreflightCheck[]> {
    const { gitBinaryPath, mergeIntoBranch, currentBranch } = options;
    const checks: PreflightCheck[] = [];

    checks.push(await checkForUncommittedChanges(options));

    if (mergeIntoBranch && mergeIntoBranch !== currentBranch) {
        checks.push(await checkMergeTargetExists(gitBinaryPath, mergeIntoBranch));
    }

    // The current branch is where the release is built and merged back to, and the merge target is
    // checked out and merged into, so both need to be level with their remote before we start.
    const branchesToVerify = [currentBranch];
    if (mergeIntoBranch && mergeIntoBranch !== currentBranch) {
        branchesToVerify.push(mergeIntoBranch);
    }

    for (const branch of branchesToVerify) {
        // These hit the network one branch at a time, so they are deliberately sequential
        // eslint-disable-next-line no-await-in-loop
        checks.push(...(await checkBranchIsInSyncWithRemote(options, branch)));
    }

    return checks;
}

async function checkForUncommittedChanges(options: PreflightOptions): Promise<PreflightCheck> {
    const name = 'Working tree';

    const hasChanges = await gitCheckForChanges(options.gitBinaryPath);
    if (!hasChanges) {
        return { name, status: 'pass', message: 'No uncommitted changes' };
    }

    // Builds routinely leave generated files behind, so uncommitted changes are normal rather than
    // fatal. They are still worth reporting, because the release stages everything it finds.
    if (!options.failOnUncommitted) {
        return {
            name,
            status: 'warn',
            message: 'There are uncommitted changes in the working tree',
            remedy: 'The release stages every change it finds, so they will be committed into the release. Pass --fail-on-uncommitted to stop the release when the working tree is dirty.',
        };
    }

    return {
        name,
        status: 'fail',
        message: 'There are uncommitted changes in the working tree and --fail-on-uncommitted was passed',
        remedy: 'Commit or stash them first. The release stages every change it finds and discards unstaged files while building the changelog, so uncommitted work would be committed into the release or lost.',
    };
}

async function checkMergeTargetExists(gitBinaryPath: string, mergeIntoBranch: string): Promise<PreflightCheck> {
    const name = `Merge target ${mergeIntoBranch} exists`;
    const exists = await gitLocalBranchExists(gitBinaryPath, mergeIntoBranch);

    if (!exists) {
        return {
            name,
            status: 'fail',
            message: `The branch ${mergeIntoBranch} does not exist locally`,
            remedy: `Check it out first with "git checkout ${mergeIntoBranch}", or correct the --merge-into-branch value`,
        };
    }

    return { name, status: 'pass', message: `${mergeIntoBranch} exists locally` };
}

async function checkBranchIsInSyncWithRemote(options: PreflightOptions, branch: string): Promise<PreflightCheck[]> {
    const { gitBinaryPath, autoPush, skipFetch } = options;
    const name = `Branch ${branch} is in sync with its remote`;

    const upstream = await gitGetUpstreamBranch(gitBinaryPath, branch);
    if (!upstream) {
        return [
            {
                name,
                status: autoPush ? 'fail' : 'warn',
                message: `${branch} has no upstream branch configured`,
                remedy: autoPush
                    ? `--auto-push runs a bare "git push", which fails without an upstream. Set one with "git push -u origin ${branch}", or drop --auto-push.`
                    : `Set one with "git branch --set-upstream-to=origin/${branch} ${branch}" if you intend to push this release`,
            },
        ];
    }

    const checks: PreflightCheck[] = [];
    let comparisonIsStale = false;

    if (skipFetch) {
        comparisonIsStale = true;
    } else {
        const remote = (await gitGetBranchRemote(gitBinaryPath, branch)) ?? 'origin';
        try {
            await gitFetchBranch(gitBinaryPath, remote, branch);
        } catch {
            comparisonIsStale = true;
            checks.push({
                name: `Fetch ${remote}/${branch}`,
                status: 'warn',
                message: `Could not reach ${remote}, so ${branch} is being compared against the last known state of the remote`,
                remedy: 'Check your network connection and remote access if you expect this branch to be up to date',
            });
        }
    }

    const { ahead, behind } = await gitGetAheadBehind(gitBinaryPath, branch, upstream);
    const staleNote = comparisonIsStale ? ' (compared without refreshing from the remote)' : '';

    if (behind > 0 && ahead > 0) {
        checks.push({
            name,
            status: 'fail',
            message: `${branch} has diverged from ${upstream}: ${ahead} ahead, ${behind} behind${staleNote}`,
            remedy: `Reconcile the branches first, for example with "git pull --rebase" on ${branch}. Releasing from a diverged branch produces a merge the remote will reject.`,
        });
        return checks;
    }

    if (behind > 0) {
        checks.push({
            name,
            status: 'fail',
            message: `${branch} is ${behind} commit(s) behind ${upstream}${staleNote}`,
            remedy: `Bring it up to date with "git pull" on ${branch}. Releasing from a stale branch tags the wrong commit and the push is rejected.`,
        });
        return checks;
    }

    checks.push({
        name,
        status: comparisonIsStale ? 'warn' : 'pass',
        message:
            ahead > 0
                ? `${branch} is up to date with ${upstream} (${ahead} unpushed commit(s))${staleNote}`
                : `${branch} is up to date with ${upstream}${staleNote}`,
    });

    return checks;
}
