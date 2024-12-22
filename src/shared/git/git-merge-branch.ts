import { spawnCommand } from '../spawn-command.js';

export async function gitMergeBranch(gitBinary: string, branchName: string) {
    return spawnCommand(gitBinary, ['merge', branchName]);
}
