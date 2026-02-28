import { NextResponse } from 'next/server';
import { generateFeedback } from '@/lib/llm/openai-client';

export async function POST(request: Request) {
    try {
        const { config, messages, code } = await request.json();

        if (!config || !messages) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const codeSubmissions = code
            ? [{ language: config.language, code }]
            : [];

        const feedback = await generateFeedback(config, messages, codeSubmissions);
        return NextResponse.json(feedback);
    } catch (error) {
        console.error('Feedback API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate feedback' },
            { status: 500 }
        );
    }
}
