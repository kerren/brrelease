import { spawnCommand } from '../spawn-command.js';

export async function gitLocalBranchExists(gitBinaryPath: string, branchName: string) {
    try {
        // `show-ref --verify` matches the ref exactly, unlike `branch --list` which globs
        await spawnCommand(gitBinaryPath, ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`]);
        return true;
    } catch {
        return false;
    }
}
