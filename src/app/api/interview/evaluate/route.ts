import { NextResponse } from 'next/server';
import { evaluateResponse } from '@/lib/llm/openai-client';

export async function POST(request: Request) {
    try {
        const { config, messages, problem, code } = await request.json();

        if (!config || !messages) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const result = await evaluateResponse(config, problem, messages, code);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Evaluate API error:', error);
        return NextResponse.json(
            { error: 'Failed to evaluate response' },
            { status: 500 }
        );
    }
}
