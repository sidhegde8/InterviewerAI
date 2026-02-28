import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// =====================================================
// Streaming LLM endpoint
// Returns server-sent events so the frontend can
// show text progressively as the interviewer speaks
// =====================================================

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY not set');
        }
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

const SYSTEM_PROMPT = `You are an expert technical interviewer at a top tech company.
You conduct fair, challenging interviews and speak naturally like a real person.
Keep responses concise — 1-3 sentences unless giving detailed feedback.
Ask one thing at a time.`;

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { config, messages, problem, code, action } = await request.json();

        const contextMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
        ];

        const constraintsText = problem?.constraints?.length
            ? problem.constraints.map((c: string) => `• ${c}`).join('\n')
            : 'Not specified';

        const examplesText = problem?.examples?.length
            ? problem.examples
                .map((e: any, i: number) => `Example ${i + 1}: Input = ${e.input} → Output = ${e.output}`)
                .join('\n')
            : 'None provided';

        // Extract last candidate message
        const lastCandidateMsg = Array.isArray(messages) && messages.length > 0
            ? [...messages].reverse().find((m) => m.role === 'candidate' || m.role === 'user')?.content ?? ''
            : '';

        // Build the advanced intent-classification prompt
        const promptText = `You are interviewing a candidate for a ${config?.role || 'software engineering'} position.

== PROBLEM ==
Title: ${problem?.title || 'General discussion'}
Description: ${problem?.description || 'N/A'}
Constraints:
${constraintsText}
Examples:
${examplesText}

${code ? `== CANDIDATE'S CODE (${config?.language || 'code'}) ==\n\`\`\`${config?.language}\n${code}\n\`\`\`` : '(No code submitted yet)'}

== CANDIDATE'S LAST MESSAGE ==
"${lastCandidateMsg}"

---
STEP 1 — Classify the candidate's last message into ONE intent:
• clarification_request — asking about constraints, input format, edge cases, assumptions, or expected output
• thinking_aloud — narrating their thoughts, not asking for anything specific
• approach_proposed — proposing a specific algorithm or data structure to solve the problem
• partial_answer — describing an approach but not fully done
• complete_answer — submitted code or fully explained a complete solution
• needs_hint — clearly stuck, says they don't know or asks for help
• off_topic — unrelated to the problem

STEP 2 — Formulate your response:
• If clarification_request → Answer the question DIRECTLY using the problem info above. Be concise and helpful. Do NOT pivot to a follow-up question yet.
• If thinking_aloud → Encourage briefly (1-2 sentences) ("Good instinct", "Keep going"). Do NOT ask a follow-up.
• If approach_proposed → EVALUATE the pre-coding checklist by reading the ENTIRE conversation history. Have they completed ALL 4 of the following: 1) restated the problem, 2) asked about edge cases/constraints, 3) discussed AT LEAST 2 different approaches (or trade-offs), and 4) stated time & space complexity of their chosen approach? 
  - If NO (missing any step): Acknowledge their approach, but ask them to complete ONE missing step (e.g. "That approach makes sense. Before we code, can you think of any alternative approaches?" or "What are the time/space complexities?").
  - If YES to all 4: Explicitly give them the go-ahead to start coding. Do NOT ask endless follow-up questions if the approach is sound.
• If partial_answer → Ask ONE targeted follow-up about their specific approach, a complexity concern, or an edge case they haven't mentioned.
• If complete_answer → Give brief feedback. Then, check the ENTIRE conversation history. Have they discussed time/space complexity? Have they discussed edge cases? Ask ONE question about a topic they have NOT YET discussed. If they have already discussed BOTH complexity AND edge cases in the past, do NOT ask about them again. Instead, just formally wrap up the interview.
• If needs_hint → Give ONE small directional hint using a guiding question. Never reveal the solution.
• If off_topic → Gently redirect to the problem.

CRITICAL RULES:
- MENTAL CHECKLIST: Before allowing the candidate to code, you MUST mentally verify they have done ALL 4: 1. Restated problem, 2. Asked about edge cases, 3. Discussed >1 approach, 4. Stated time/space complexity. Do not blindly say "go ahead" if they skipped even one of these.
- AVOID REPETITION: Never ask a question about time complexity, space complexity, or edge cases if the candidate has ALREADY answered it previously in the conversation. Read the history carefully!
- IMPORTANT: DO NOT speak your classified intent aloud. NEVER prefix your response with "needs_hint", "clarification_request", etc.
- Just provide the conversational response as if you were speaking directly to the candidate.
- Never ignore a clarification question. Always answer it first.
- Ask at most ONE question per turn.
- Keep responses concise — 2-4 sentences max.
- Sound like a human, not a chatbot. Use natural conversation flow.`;

        // We only pass the system prompt and conversation history to the LLM
        // The instructions above serve as the final system message guiding its behavior
        contextMessages.push({
            role: 'system',
            content: promptText,
        });

        // Add the specific action instructions if it's evaluated code or wrap_up
        if (action === 'evaluate_code') {
            contextMessages.push({
                role: 'system',
                content: 'Special instruction: The candidate just submitted code. Evaluate it briefly, mention edge cases, and ask about time/space complexity.',
            });
        } else if (action === 'wrap_up') {
            contextMessages.push({
                role: 'system',
                content: 'Special instruction: The interview time is up. Wrap up professionally and tell the candidate you are done.',
            });
        } else if (code && code.trim() !== '') {
            contextMessages.push({
                role: 'system',
                content: 'Special instruction: The candidate has started coding. Do NOT rapid-fire questions at them. Allow them to code in silence unless they ask a question, think aloud, or you notice a critical flaw. If you must ask a question, ask ONE reasonable question about their choice of data structure or an edge case, then let them continue working.',
            });
        }


        // Create streaming response
        const stream = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: contextMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 300,
        });

        // Return as a ReadableStream with SSE format
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const delta = chunk.choices[0]?.delta?.content;
                        if (delta) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`)
                            );
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } catch (err) {
                    controller.error(err);
                } finally {
                    controller.close();
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
        console.error('Streaming LLM error:', error);
        return NextResponse.json({ error: 'Stream failed' }, { status: 500 });
    }
}
