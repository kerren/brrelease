import { spawnCommand } from '../spawn-command.js';

export async function gitCreateTag(gitBinaryPath: string, tag: string, annotation: string, sign: boolean) {
    const commandArgs = ['tag'];
    if (sign) {
        // The -s flag creates a signed tag which is annotated by default
        commandArgs.push('-s');
    } else {
        commandArgs.push('-a', '--no-sign');
    }

    commandArgs.push(tag, '-m', `Release version ${tag}\n${annotation}`);
    return spawnCommand(gitBinaryPath, commandArgs);
}
