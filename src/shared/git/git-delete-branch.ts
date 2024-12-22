import { spawnCommand } from '../spawn-command.js';

export async function gitDeleteBranch(gitBinary: string, branchName: string) {
    return spawnCommand(gitBinary, ['branch', '-d', branchName]);
}
