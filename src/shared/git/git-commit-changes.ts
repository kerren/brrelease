import { spawnCommand } from '../spawn-command.js';

export async function gitCommitChanges(gitBinaryPath: string, message: string, sign: boolean) {
    const commandArgs = ['commit', '-m', message];
    if (!sign) {
        commandArgs.push('--no-gpg-sign');
    }
    return spawnCommand(gitBinaryPath, commandArgs);
}
