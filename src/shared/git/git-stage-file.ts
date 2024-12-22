import { spawnCommand } from '../spawn-command.js';

export async function gitStageFile(gitBinaryPath: string, file: string) {
    return spawnCommand(gitBinaryPath, ['add', file]);
}
