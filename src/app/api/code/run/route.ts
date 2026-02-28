import { NextResponse } from 'next/server';

// =====================================================
// Judge0 Code Execution Sandbox
// Supports self-hosted or RapidAPI Judge0
// =====================================================

// Language IDs for Judge0 CE
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
    python: 92,      // Python 3.11
    javascript: 93,   // Node.js
    typescript: 94,   // TypeScript
    java: 91,         // Java 21
    cpp: 76,          // C++ (GCC 14)
    go: 95,           // Go 1.21
};

const JUDGE0_BASE_URL =
    process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';

interface Judge0Submission {
    submission_id?: string;
    status: {
        id: number;
        description: string;
    };
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    time?: string;
    memory?: number;
    exit_code?: number;
}

interface RunResult {
    success: boolean;
    output: string;
    error?: string;
    executionTime?: string;
    memory?: number;
    statusDescription: string;
}

/**
 * Submit code to Judge0 and wait for result
 */
async function executeCode(
    code: string,
    language: string,
    stdin?: string
): Promise<RunResult> {
    const languageId = JUDGE0_LANGUAGE_IDS[language];

    if (!languageId) {
        return {
            success: false,
            output: '',
            error: `Unsupported language: ${language}`,
            statusDescription: 'Unsupported Language',
        };
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Use RapidAPI key if set, otherwise assume self-hosted
    if (process.env.JUDGE0_API_KEY) {
        headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
        headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    // Step 1: Create submission
    const submitRes = await fetch(`${JUDGE0_BASE_URL}/submissions?wait=true`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            source_code: code,
            language_id: languageId,
            stdin: stdin || '',
            cpu_time_limit: 5,       // 5 seconds
            memory_limit: 256000,    // 256 MB
        }),
    });

    if (!submitRes.ok) {
        const errText = await submitRes.text();
        return {
            success: false,
            output: '',
            error: `Submission failed: ${errText}`,
            statusDescription: 'Submission Error',
        };
    }

    const result: Judge0Submission = await submitRes.json();

    // Status codes: 1=In Queue, 2=Processing, 3=Accepted, ...
    const ACCEPTED = 3;
    const isSuccess = result.status?.id === ACCEPTED;

    const output = result.stdout
        ? atob(result.stdout).trim()
        : '';

    const errorOutput = result.stderr
        ? atob(result.stderr).trim()
        : result.compile_output
            ? atob(result.compile_output).trim()
            : '';

    return {
        success: isSuccess,
        output,
        error: errorOutput || undefined,
        executionTime: result.time,
        memory: result.memory,
        statusDescription: result.status?.description || 'Unknown',
    };
}

export async function POST(request: Request) {
    try {
        const { code, language, stdin } = await request.json();

        if (!code || !language) {
            return NextResponse.json(
                { error: 'Missing code or language' },
                { status: 400 }
            );
        }

        const result = await executeCode(code, language, stdin);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Code execution error:', error);
        return NextResponse.json(
            {
                success: false,
                output: '',
                error: 'Code execution service unavailable',
                statusDescription: 'Service Error',
            },
            { status: 500 }
        );
    }
}
