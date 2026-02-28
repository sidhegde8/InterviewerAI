// ============================================================
// InterviewerAI — Core Type Definitions
// ============================================================

export type InterviewType = 'technical' | 'behavioral' | 'system_design';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type InterviewPhase =
    | 'setup'
    | 'greeting'
    | 'questioning'
    | 'code_share'
    | 'candidate_coding'
    | 'follow_up'
    | 'debrief';

export type ProgrammingLanguage =
    | 'python'
    | 'javascript'
    | 'typescript'
    | 'java'
    | 'cpp'
    | 'go';

export interface InterviewConfig {
    type: InterviewType;
    role: string;              // e.g. "Frontend Engineer", "Backend Engineer"
    company?: string;          // optional target company
    difficulty: Difficulty;
    language: ProgrammingLanguage;
    durationMinutes: number;   // interview length
}

export interface Problem {
    id: string;
    type: InterviewType;
    difficulty: Difficulty;
    title: string;
    description: string;
    examples: ProblemExample[];
    constraints: string[];
    starterCode: Partial<Record<ProgrammingLanguage, string>>;
    solution?: string;
    followUps: string[];
    tags: string[];
    companies: string[];
}

export interface ProblemExample {
    input: string;
    output: string;
    explanation?: string;
}

export interface Message {
    id: string;
    role: 'interviewer' | 'candidate';
    content: string;
    timestamp: number;
    type: 'question' | 'answer' | 'follow_up' | 'hint' | 'feedback' | 'greeting';
}

export interface CodeSubmission {
    language: ProgrammingLanguage;
    code: string;
    timestamp: number;
}

export interface InterviewSession {
    id: string;
    config: InterviewConfig;
    phase: InterviewPhase;
    currentProblem: Problem | null;
    messages: Message[];
    codeSubmissions: CodeSubmission[];
    startedAt: number;
    endedAt?: number;
}

// Each checklist item carries the verdict AND the verbatim transcript snippet
// that proves it. If passed=false, evidence must be null.
export interface ChecklistItem {
    passed: boolean;
    evidence: string | null; // verbatim quote from transcript, or null if failed
}

export interface FeedbackChecklists {
    beforeCoding: {
        restatedProblem: ChecklistItem;
        askedClarifyingQuestions: ChecklistItem;
        discussedApproaches: ChecklistItem;
        statedComplexity: ChecklistItem;
        gotGoAhead: ChecklistItem;
    };
    duringCoding: {
        talkedThroughCode: ChecklistItem;
        meaningfulVariableNames: ChecklistItem;
        cleanModularCode: ChecklistItem;
        handledEdgeCases: ChecklistItem;
    };
    afterCoding: {
        walkedThroughExample: ChecklistItem;
        testedEdgeCasesManually: ChecklistItem;
        identifiedFixedBugs: ChecklistItem;
        discussedOptimizations: ChecklistItem;
    };
}

export interface FeedbackScores {
    problemSolving: number; // 1-5
    dsa: number;            // 1-5
    communication: number;  // 1-5
    coding: number;         // 1-5
    speed: number;          // 1-5
}

export type HiringDecision = 'No Hire' | 'Hire' | 'Strong Hire';

export interface InterviewFeedback {
    sessionId: string;
    checklists: FeedbackChecklists;
    scores: FeedbackScores;
    overallScore: number;     // out of 10
    decision: HiringDecision;
    report: string;           // Detailed report referencing the transcript
}
