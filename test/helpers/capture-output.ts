export interface CapturedOutput<T> {
    /** The value the function resolved with, when it did not throw */
    result?: T;
    /** The error the function threw, when it did */
    error?: unknown;
    stdout: string;
    stderr: string;
}

type WriteFunction = typeof process.stdout.write;

/**
 * Runs a function with `process.stdout` and `process.stderr` captured, and returns what was
 * written along with the outcome.
 *
 * The release command, the ora spinners and `commit-and-tag-version` all write directly to the
 * process streams, so patching `write` is the only place that catches all three. The streams are
 * always restored, including when the function throws.
 *
 * @param run - The function to run
 * @returns The captured streams and the outcome of the function
 */
export async function captureOutput<T>(run: () => Promise<T>): Promise<CapturedOutput<T>> {
    let stdout = '';
    let stderr = '';

    const originalStdoutWrite = process.stdout.write.bind(process.stdout) as WriteFunction;
    const originalStderrWrite = process.stderr.write.bind(process.stderr) as WriteFunction;

    process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => {
        stdout += decode(chunk);
        return callback(rest);
    }) as WriteFunction;

    process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => {
        stderr += decode(chunk);
        return callback(rest);
    }) as WriteFunction;

    try {
        const result = await run();
        return { result, stderr, stdout };
    } catch (error) {
        return { error, stderr, stdout };
    } finally {
        process.stdout.write = originalStdoutWrite;
        process.stderr.write = originalStderrWrite;
    }
}

function decode(chunk: unknown): string {
    if (typeof chunk === 'string') {
        return chunk;
    }

    if (chunk instanceof Uint8Array) {
        return Buffer.from(chunk).toString('utf8');
    }

    return String(chunk);
}

/**
 * `stream.write` accepts an optional encoding and an optional completion callback in either of the
 * trailing positions, and callers are entitled to have it invoked.
 *
 * @param rest - The trailing arguments the caller passed to `write`
 * @returns `true`, matching a stream that is not applying back pressure
 */
function callback(rest: unknown[]): boolean {
    const maybeCallback = rest.find((argument) => typeof argument === 'function');
    if (typeof maybeCallback === 'function') {
        (maybeCallback as () => void)();
    }

    return true;
}
