import { NextResponse } from 'next/server';
import { generateGreeting } from '@/lib/llm/openai-client';

export async function POST(request: Request) {
    try {
        const { config } = await request.json();

        if (!config) {
            return NextResponse.json(
                { error: 'Missing interview config' },
                { status: 400 }
            );
        }

        const greeting = await generateGreeting(config);
        return NextResponse.json({ greeting });
    } catch (error) {
        console.error('Greeting API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate greeting' },
            { status: 500 }
        );
    }
}
