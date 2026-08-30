/**
 * The outcome of a single preflight check.
 *
 * - `pass` the check succeeded
 * - `warn` the check could not be completed, or found something worth knowing, but the release may continue
 * - `fail` the check found a problem that would corrupt or break the release, so it must not continue
 * - `skip` the check was deliberately bypassed by a flag
 */
export type PreflightStatus = 'pass' | 'warn' | 'fail' | 'skip';

export interface PreflightCheck {
    name: string;
    status: PreflightStatus;
    message: string;
    /** How the user can resolve a `warn` or `fail` */
    remedy?: string;
}

export interface PreflightOptions {
    gitBinaryPath: string;
    /** Turn the uncommitted changes warning into a failure that stops the release */
    failOnUncommitted: boolean;
    /** Do not contact the remote during the checks */
    skipFetch: boolean;
    /** Whether the release will push, which makes a missing upstream fatal rather than a warning */
    autoPush: boolean;
    currentBranch: string;
    /** The branch the release will be merged into, when it differs from the current branch */
    mergeIntoBranch?: string;
}

export function hasFailure(checks: PreflightCheck[]) {
    return checks.some((check) => check.status === 'fail');
}
