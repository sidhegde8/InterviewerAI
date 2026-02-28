import OpenAI from 'openai';

// =====================================================
// Behavioral Interview — Streaming LLM endpoint
// Mode-aware system prompts for resume grill, behavioral,
// or mixed interviews. SSE output.
// =====================================================

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

const BASE_SYSTEM = `You are an expert interviewer at a top-tier tech company. You are conducting a behavioral / resume screening interview. You are warm but thorough. You speak naturally like a real person. You ask ONE question at a time and wait for the candidate to respond. Keep your responses concise — 1-3 sentences unless you need to set up context.`;

function getModePrompt(mode: string, resumeText: string | null): string {
    switch (mode) {
        case 'resume_grill':
            return `MODE: STRICT RESUME GRILL
You are DEEPLY probing the candidate's resume. Your job is to verify every claim.
- Ask technical questions about specific projects, architectures, and decisions mentioned in their resume.
- Challenge vague claims — "You say you 'built a scalable microservices architecture.' Walk me through the specific services, how they communicated, and your deployment strategy."
- Ask about their SPECIFIC contribution vs. the team's work.
- If they can't go deep on something they listed, note it but move on.
- Ask 2-4 follow-up questions per topic if answers are vague or surface-level.

RESUME CONTENT:
${resumeText || '(No resume provided)'}`;

        case 'behavioral':
            return `MODE: BEHAVIORAL QUESTIONS
Ask classic behavioral interview questions. Use the STAR format to evaluate answers.
- "Tell me about a time when..."
- "Describe a situation where..."
- "What would you do if..."
- Ask about: leadership, conflict resolution, failure, teamwork, time management, handling ambiguity, taking initiative.
- If the candidate gives a vague answer (no specific example), push back: "Can you give me a specific example?"
- Ask 2-4 follow-up questions to probe for depth on each topic.
- Do NOT ask about their resume or specific projects unless they bring it up.`;

        case 'mixed':
        default:
            return `MODE: MIXED (RESUME + BEHAVIORAL)
Alternate between resume-specific questions and classic behavioral questions.
- Start with a resume question, then a behavioral one, then back.
- For resume questions: probe their projects, contributions, technical decisions.
- For behavioral questions: use STAR format — leadership, conflict, failure, growth.
- If they give vague answers, push back for specifics.
- Ask 2-4 follow-up questions per topic if needed.

${resumeText ? `RESUME CONTENT:\n${resumeText}` : '(No resume provided — lean more toward behavioral questions)'}`;
    }
}

export async function POST(request: Request) {
    try {
        const { config, messages, action } = await request.json();

        const contextMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: BASE_SYSTEM },
        ];

        // Build conversation history
        if (Array.isArray(messages)) {
            for (const msg of messages) {
                contextMessages.push({
                    role: msg.role === 'interviewer' ? 'assistant' : 'user',
                    content: msg.content,
                });
            }
        }

        // Extract last candidate message for intent classification
        const lastCandidateMsg = Array.isArray(messages) && messages.length > 0
            ? [...messages].reverse().find((m: { role: string }) => m.role === 'candidate')?.content
            : null;

        const modePrompt = getModePrompt(config.mode, config.resumeText);

        let promptText: string;

        if (action === 'first_question') {
            promptText = `${modePrompt}

You just greeted the candidate. Now ask your FIRST question. 
${config.mode === 'resume_grill' || config.mode === 'mixed'
                    ? 'Start by picking something specific from their resume and asking about it.'
                    : 'Start with a warm-up behavioral question like "Tell me about yourself" or "Walk me through your background."'
                }
Ask ONE question only. Keep it natural and conversational.`;
        } else if (action === 'wrap_up') {
            promptText = `The interview time is running out. Give a brief, warm closing statement thanking the candidate for their time. Do NOT ask another question. Be natural and professional.`;
        } else {
            promptText = `${modePrompt}

The candidate's last message: "${lastCandidateMsg}"

STEP 1 — Classify the candidate's last message:
• strong_answer — gave a specific, detailed answer with real examples
• vague_answer — gave a generic or surface-level answer without specifics
• clarification — asking you to clarify or repeat the question
• thinking_aloud — narrating thoughts, not done answering
• off_topic — unrelated to the question

STEP 2 — Respond:
• If strong_answer → Acknowledge briefly what was good about their answer (1 sentence). Then either ask a follow-up to go deeper OR move to the next topic.
• If vague_answer → Push back for specifics. Say something like "Can you walk me through a specific example?" or "What was YOUR role specifically?"
• If clarification → Rephrase or clarify your question.
• If thinking_aloud → Encourage briefly. "Take your time."
• If off_topic → Gently redirect.

CRITICAL RULES:
- NEVER say the classified intent aloud. Just respond naturally.
- Ask at most ONE question per turn.
- Keep responses concise — 2-4 sentences max.
- Sound like a human, not a chatbot.
- Ask 2-4 follow-ups per topic maximum before moving on.
- AVOID REPETITION: Do NOT ask about a topic the candidate already answered well.
- Read the ENTIRE conversation history before responding.`;
        }

        contextMessages.push({ role: 'system', content: promptText });

        const stream = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: contextMessages,
            stream: true,
            temperature: 0.7,
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.choices[0]?.delta?.content;
                        if (text) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                            );
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (err) {
                    controller.error(err);
                }
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Behavioral stream error:', error);
        return new Response(
            JSON.stringify({ error: 'Stream failed' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
