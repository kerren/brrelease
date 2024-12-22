import { spawnCommand } from '../spawn-command.js';

export async function gitCheckoutBranch(gitBinary: string, branchName: string) {
    return spawnCommand(gitBinary, ['checkout', branchName]);
}
