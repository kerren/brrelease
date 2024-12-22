import { spawnCommand } from '../spawn-command.js';

export async function gitCheckForChanges(gitBinaryPath: string) {
    const changes = await spawnCommand(gitBinaryPath, ['status', '--porcelain']);
    const changesOut = changes.stdout
        .trim()
        .split(`\n`)
        .filter((line) => line.trim() !== '');
    return changesOut.length > 0;
}
