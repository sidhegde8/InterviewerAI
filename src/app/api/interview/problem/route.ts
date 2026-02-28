import { NextResponse } from 'next/server';
import { generateCodingProblem } from '@/lib/llm/openai-client';

export async function POST(request: Request) {
    try {
        const { config } = await request.json();

        if (!config) {
            return NextResponse.json(
                { error: 'Missing interview config' },
                { status: 400 }
            );
        }

        const problem = await generateCodingProblem(config);
        return NextResponse.json({ problem });
    } catch (error) {
        console.error('Problem generation API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate problem' },
            { status: 500 }
        );
    }
}
