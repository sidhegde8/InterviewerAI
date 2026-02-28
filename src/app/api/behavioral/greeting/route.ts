import { NextResponse } from 'next/server';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

export async function POST(request: Request) {
    try {
        const { config } = await request.json();

        if (!config) {
            return NextResponse.json({ error: 'Missing config' }, { status: 400 });
        }

        const modeLabel =
            config.mode === 'resume_grill'
                ? 'resume deep-dive'
                : config.mode === 'behavioral'
                    ? 'behavioral'
                    : 'mixed behavioral and resume';

        const resumeHint = config.resumeText
            ? ` You have access to their resume and will be asking about their experience.`
            : '';

        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are a friendly but thorough interviewer conducting a ${modeLabel} interview for a ${config.role} role${config.company ? ` at ${config.company}` : ''}.${resumeHint} Generate a warm, natural greeting (2-3 sentences) welcoming the candidate and setting expectations for the conversation. Do NOT ask a question yet.`,
                },
                {
                    role: 'user',
                    content: 'Generate the greeting.',
                },
            ],
            temperature: 0.8,
        });

        const greeting =
            response.choices[0]?.message?.content ||
            "Hi there! Thanks for joining today. Let's get started with our conversation about your experience.";

        return NextResponse.json({ greeting });
    } catch (error) {
        console.error('Behavioral greeting error:', error);
        return NextResponse.json({ error: 'Failed to generate greeting' }, { status: 500 });
    }
}
