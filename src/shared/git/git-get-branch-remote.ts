import { spawnCommand } from '../spawn-command.js';

export async function gitGetBranchRemote(gitBinaryPath: string, branchName: string) {
    try {
        const result = await spawnCommand(gitBinaryPath, ['config', '--get', `branch.${branchName}.remote`]);
        const remote = result.stdout.trim();
        return remote === '' ? undefined : remote;
    } catch {
        return undefined;
    }
}
