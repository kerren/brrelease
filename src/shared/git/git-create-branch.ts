import { spawnCommand } from '../spawn-command.js';

export async function gitCreateBranch(gitBinaryPath: string, branchName: string) {
    return await spawnCommand(gitBinaryPath, ['checkout', '-b', branchName]);
}
