import type {
    InterviewConfig,
    InterviewPhase,
    Message,
    Problem,
} from '@/types/interview';

// =============================================================
// Interview Orchestrator — State Machine
// =============================================================

/**
 * Valid phase transitions for the interview flow
 */
const VALID_TRANSITIONS: Record<InterviewPhase, InterviewPhase[]> = {
    setup: ['greeting'],
    greeting: ['questioning'],
    questioning: ['code_share', 'follow_up'],
    code_share: ['candidate_coding'],
    candidate_coding: ['follow_up'],
    follow_up: ['questioning', 'debrief'],
    debrief: [],
};

export interface OrchestratorAction {
    type:
    | 'speak'           // avatar speaks this text
    | 'type_problem'    // typewriter effect in editor
    | 'set_phase'       // transition interview phase
    | 'wait_for_code'   // wait for candidate to submit code
    | 'show_feedback';  // display scorecard
    payload: unknown;
}

/**
 * Determines if a phase transition is valid
 */
export function canTransition(
    from: InterviewPhase,
    to: InterviewPhase
): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Determine the next action based on current state
 */
export function getNextAction(
    phase: InterviewPhase,
    config: InterviewConfig,
    messages: Message[],
    currentProblem: Problem | null
): OrchestratorAction {
    switch (phase) {
        case 'setup':
            return { type: 'set_phase', payload: 'greeting' };

        case 'greeting':
            return { type: 'set_phase', payload: 'questioning' };

        case 'questioning':
            if (config.type === 'technical') {
                return { type: 'set_phase', payload: 'code_share' };
            }
            // Behavioral / system design — go straight to follow-ups
            return { type: 'set_phase', payload: 'follow_up' };

        case 'code_share':
            if (currentProblem) {
                return {
                    type: 'type_problem',
                    payload: {
                        title: currentProblem.title,
                        description: currentProblem.description,
                        starterCode: currentProblem.starterCode,
                    },
                };
            }
            return { type: 'set_phase', payload: 'candidate_coding' };

        case 'candidate_coding':
            return { type: 'wait_for_code', payload: null };

        case 'follow_up': {
            // After a certain number of follow-ups, end the interview
            const followUpCount = messages.filter(
                (m) => m.type === 'follow_up'
            ).length;
            if (followUpCount >= 3) {
                return { type: 'set_phase', payload: 'debrief' };
            }
            return { type: 'speak', payload: 'Evaluating response...' };
        }

        case 'debrief':
            return { type: 'show_feedback', payload: null };

        default:
            return { type: 'set_phase', payload: 'debrief' };
    }
}

/**
 * Build the LLM context prompt from interview state
 */
export function buildContextPrompt(
    config: InterviewConfig,
    messages: Message[],
    currentProblem: Problem | null,
    candidateCode?: string
): string {
    const parts: string[] = [
        `Interview Type: ${config.type}`,
        `Role: ${config.role}`,
        `Difficulty: ${config.difficulty}`,
        config.company ? `Company: ${config.company}` : '',
    ].filter(Boolean);

    if (currentProblem) {
        parts.push(`\nCurrent Problem: ${currentProblem.title}`);
        parts.push(`Description: ${currentProblem.description}`);
    }

    if (messages.length > 0) {
        parts.push('\nConversation History:');
        messages.forEach((m) => {
            parts.push(`${m.role}: ${m.content}`);
        });
    }

    if (candidateCode) {
        parts.push(`\nCandidate Code:\n\`\`\`\n${candidateCode}\n\`\`\``);
    }

    return parts.join('\n');
}
