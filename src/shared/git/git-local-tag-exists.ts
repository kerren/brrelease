import { spawnCommand } from '../spawn-command.js';

export async function gitLocalTagExists(gitBinaryPath: string, tag: string) {
    try {
        await spawnCommand(gitBinaryPath, ['show-ref', '--verify', '--quiet', `refs/tags/${tag}`]);
        return true;
    } catch {
        return false;
    }
}
