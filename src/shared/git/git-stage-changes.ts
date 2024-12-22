import { spawnCommand } from '../spawn-command.js';

export async function gitStageChanges(gitBinaryPath: string) {
    return spawnCommand(gitBinaryPath, ['add', '-A']);
}
