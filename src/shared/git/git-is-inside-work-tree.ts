import { spawnCommand } from '../spawn-command.js';

export async function gitIsInsideWorkTree(gitBinaryPath: string) {
    try {
        const result = await spawnCommand(gitBinaryPath, ['rev-parse', '--is-inside-work-tree']);
        return result.stdout.trim() === 'true';
    } catch {
        return false;
    }
}
