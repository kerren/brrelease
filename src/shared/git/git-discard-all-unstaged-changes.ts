import { spawnCommand } from '../spawn-command.js';

export async function gitDiscardAllUnstagedChanges(gitBinaryPath: string) {
    return spawnCommand(gitBinaryPath, ['checkout', '--', '.']);
}
