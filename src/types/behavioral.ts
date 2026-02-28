// ============================================================
// InterviewerAI — Behavioral Interview Type Definitions
// ============================================================

export type BehavioralMode = 'resume_grill' | 'behavioral' | 'mixed';

export type BehavioralPhase =
    | 'setup'
    | 'greeting'
    | 'questioning'
    | 'debrief';

export interface BehavioralConfig {
    mode: BehavioralMode;
    role: string;              // e.g. "Software Engineer"
    company?: string;          // optional target company
    durationMinutes: number;
    resumeText: string | null; // extracted text from uploaded PDF
}

export interface BehavioralMessage {
    id: string;
    role: 'interviewer' | 'candidate';
    content: string;
    timestamp: number;
    type: 'question' | 'answer' | 'follow_up' | 'greeting' | 'feedback';
}

export interface BehavioralSession {
    id: string;
    config: BehavioralConfig;
    phase: BehavioralPhase;
    messages: BehavioralMessage[];
    questionCount: number;     // track how many main questions asked
    startedAt: number;
    endedAt?: number;
}

// ── Feedback / Grading ──

export interface BehavioralChecklistItem {
    passed: boolean;
    evidence: string | null; // verbatim quote, or null if failed
}

export interface BehavioralChecklists {
    // Per-answer quality
    answerQuality: {
        gaveSpecificExamples: BehavioralChecklistItem;
        usedSTARStructure: BehavioralChecklistItem;
        quantifiedImpact: BehavioralChecklistItem;
        showedOwnership: BehavioralChecklistItem;
        addressedFollowUps: BehavioralChecklistItem;
    };
    // Resume-specific (only graded in resume_grill / mixed modes)
    resumeDepth: {
        technicalAccuracy: BehavioralChecklistItem;
        depthOfUnderstanding: BehavioralChecklistItem;
    };
}

export interface BehavioralScores {
    communication: number;     // 1-5
    storytelling: number;      // 1-5
    technicalDepth: number;    // 1-5
    selfAwareness: number;     // 1-5
    leadershipTeamwork: number; // 1-5
}

export type BehavioralDecision = 'No Hire' | 'Hire' | 'Strong Hire';

export interface BehavioralFeedback {
    sessionId: string;
    checklists: BehavioralChecklists;
    scores: BehavioralScores;
    overallScore: number;       // out of 10
    decision: BehavioralDecision;
    report: string;             // detailed written report
}
