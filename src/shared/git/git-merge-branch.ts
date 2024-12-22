import { spawnCommand } from '../spawn-command.js';

export async function gitMergeBranch(gitBinary: string, branchName: string, sign: boolean) {
    const commandArgs = ['merge', branchName];
    if (!sign) {
        commandArgs.push('--no-gpg-sign');
    }
    return spawnCommand(gitBinary, commandArgs);
}
