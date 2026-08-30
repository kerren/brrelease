import { spawnCommand } from '../spawn-command.js';

export interface AheadBehind {
    ahead: number;
    behind: number;
}

export async function gitGetAheadBehind(gitBinaryPath: string, branchName: string, upstreamBranch: string): Promise<AheadBehind> {
    // `--left-right --count A...B` prints "<commits only in A>\t<commits only in B>"
    const result = await spawnCommand(gitBinaryPath, ['rev-list', '--left-right', '--count', `${branchName}...${upstreamBranch}`]);
    const [ahead, behind] = result.stdout.trim().split(/\s+/).map(Number);
    return { ahead: ahead || 0, behind: behind || 0 };
}
