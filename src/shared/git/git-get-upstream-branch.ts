import { spawnCommand } from '../spawn-command.js';

export async function gitGetUpstreamBranch(gitBinaryPath: string, branchName: string) {
    try {
        const result = await spawnCommand(gitBinaryPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', `${branchName}@{upstream}`]);
        const upstream = result.stdout.trim();
        return upstream === '' ? undefined : upstream;
    } catch {
        // The branch has no upstream configured, which git reports with a non-zero exit code
        return undefined;
    }
}
