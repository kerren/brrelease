import { spawnCommand } from '../spawn-command.js';

export async function gitPushBranch(gitBinaryPath: string, followTags = true) {
    const commandArgs = ['push'];
    if (followTags) {
        commandArgs.push('--follow-tags');
    }
    return spawnCommand(gitBinaryPath, commandArgs);
}
