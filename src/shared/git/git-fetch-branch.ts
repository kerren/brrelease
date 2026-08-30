import { spawnCommand } from '../spawn-command.js';

export async function gitFetchBranch(gitBinaryPath: string, remote: string, branchName: string) {
    return spawnCommand(gitBinaryPath, ['fetch', remote, branchName]);
}
