// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import commitAndTagVersionApi from 'commit-and-tag-version';

export interface CommitAndTagVersionResponse {
    newVersion: string;
}

export interface CommitAndTagVersionArguments {
    infile: string;
    bumpFiles: string[];
    packageFiles: string[];
    updaters: string[];
    sign: boolean;
    releaseAs: string;
    firstRelease: boolean;
    prerelease: string;
    dryRun: boolean;
    skip: Partial<{
        tag: boolean;
        bump: boolean;
        commit: boolean;
        changelog: boolean;
    }>;
}

export async function commitAndTagVersion(args: Partial<CommitAndTagVersionArguments>): Promise<CommitAndTagVersionResponse> {
    return commitAndTagVersionApi(args) as CommitAndTagVersionResponse;
}
