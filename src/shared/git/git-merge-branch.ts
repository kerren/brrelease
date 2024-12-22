import { spawnCommand } from '../spawn-command.js';

export async function gitMergeBranch(gitBinary: string, branchName: string, sign: boolean, noFastForward = true) {
    const commandArgs = ['merge', branchName];
    if (!sign) {
        commandArgs.push('--no-gpg-sign');
    }
    if (noFastForward) {
        commandArgs.push('--no-ff');
    }
    return spawnCommand(gitBinary, commandArgs);
}
