import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// =====================================================
// Behavioral Interview — Feedback Generation
// Evidence-backed grading with the behavioral rubric
// =====================================================

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
        const { config, messages } = await request.json();

        if (!config || !messages) {
            return NextResponse.json({ error: 'Missing config or messages' }, { status: 400 });
        }

        const transcript = messages
            .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');

        const isResumeMode = config.mode === 'resume_grill' || config.mode === 'mixed';

        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are a STRICT but fair behavioral interviewer evaluating a ${config.role} candidate. You are tough and evidence-based.`,
                },
                {
                    role: 'user',
                    content: `Evaluate this behavioral interview transcript. Be STRICT.

IMPORTANT RULES:
- You MUST find verbatim evidence in the CANDIDATE's messages for every item you mark passed=true.
- If the candidate did not EXPLICITLY do something, mark passed=false with evidence=null.
- "gaveSpecificExamples" requires NAMED projects, companies, or situations — not generic answers.
- "usedSTARStructure" requires Situation, Task, Action, AND Result — even loosely structured.
- "quantifiedImpact" requires actual numbers, percentages, or measurable outcomes.
- "showedOwnership" requires the candidate to describe THEIR specific role, not just "we did X."
${isResumeMode ? `
- "technicalAccuracy" requires the candidate to correctly explain architectures, tools, or decisions from their resume.
- "depthOfUnderstanding" requires going beyond surface-level — discussing trade-offs, alternatives, or reasoning.
` : ''}

Interview mode: ${config.mode}
Transcript:
${transcript}

Respond ONLY in valid JSON matching this EXACT structure:
{
  "checklists": {
    "answerQuality": {
      "gaveSpecificExamples": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "usedSTARStructure": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "quantifiedImpact": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "showedOwnership": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "addressedFollowUps": { "passed": boolean, "evidence": "short verbatim quote or null" }
    },
    "resumeDepth": {
      "technicalAccuracy": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "depthOfUnderstanding": { "passed": boolean, "evidence": "short verbatim quote or null" }
    }
  },
  "scores": {
    "communication": number,
    "storytelling": number,
    "technicalDepth": number,
    "selfAwareness": number,
    "leadershipTeamwork": number
  },
  "overallScore": number,
  "decision": "No Hire" | "Hire" | "Strong Hire",
  "report": "string"
}${!isResumeMode ? '\n\nNOTE: For "resumeDepth" items, mark both as { "passed": false, "evidence": null } since this was a behavioral-only interview.' : ''}`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from LLM');

        return NextResponse.json(JSON.parse(content));
    } catch (error) {
        console.error('Behavioral feedback error:', error);
        return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
    }
}
