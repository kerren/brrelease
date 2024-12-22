import { spawnCommand } from '../spawn-command.js';

export async function gitCreateTag(gitBinaryPath: string, tag: string, annotation: string) {
    return spawnCommand(gitBinaryPath, ['tag', '-a', tag, '-m', `Release version ${tag}\n${annotation}`]);
}
