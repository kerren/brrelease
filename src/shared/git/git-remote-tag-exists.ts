import { spawnCommand } from '../spawn-command.js';

export async function gitRemoteTagExists(gitBinaryPath: string, remote: string, tag: string) {
    const result = await spawnCommand(gitBinaryPath, ['ls-remote', '--tags', remote, `refs/tags/${tag}`]);
    return result.stdout.trim() !== '';
}
