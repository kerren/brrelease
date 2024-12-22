import { spawnCommand } from '../spawn-command.js';

export async function gitCommitChanges(gitBinaryPath: string, message: string) {
    return spawnCommand(gitBinaryPath, ['commit', '-m', message]);
}
