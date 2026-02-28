import OpenAI from 'openai';
import type {
    InterviewConfig,
    Message,
    Problem,
    InterviewFeedback,
} from '@/types/interview';

// Server-side only — never import in client components
// Lazy initialization to avoid build-time failures when API key is absent
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(
                'OPENAI_API_KEY is not set. Copy .env.example to .env.local and add your key.'
            );
        }
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

const SYSTEM_PROMPT = `You are a senior technical interviewer at a top-tier tech company.
You conduct interviews that feel like natural, supportive conversations — not interrogations.

Your core behaviors:

1. LISTEN FIRST — Identify what the candidate is actually doing before deciding how to respond.

2. CLARIFICATION REQUESTS — Highest priority. If the candidate asks a question about the problem
   (constraints, edge cases, input format, expected output, assumptions), answer it DIRECTLY and
   concisely. Do NOT skip it or pivot to a follow-up. Reference constraints/examples when useful.
   Example: Candidate: "What if the list is empty?" -> You: "Good question — assume the input
   will always have at least one element, but handling the empty case shows good discipline."

3. THINKING ALOUD — Encourage it briefly. Say "Good instinct" or "That's interesting — keep going."
   Do NOT interrupt with follow-up questions while they're mid-thought.

4. HINTS — Give directional nudges, never complete solutions. One hint at a time. Ask guiding
   questions rather than giving answers ("What data structure gives you O(1) lookup?").

5. FOLLOW-UPS — Only ask when the candidate has completed a thought. Ask ONE question at a time.
   Probe complexity, edge cases, trade-offs. Be specific to what THEY said, not generic.

6. TONE — Warm, professional, human. Acknowledge their work before challenging it.
   Use phrases like: "Solid approach.", "Good thinking.", "Interesting — let me ask you this..."

Always respond in valid JSON matching the requested format.`;

export interface GeneratedQuestion {
    question: string;
    problemId?: string;
    hints: string[];
    expectedTopics: string[];
}

export interface FollowUpResponse {
    message: string;
    type: 'clarification_response' | 'encouragement' | 'follow_up' | 'hint' | 'feedback' | 'next_question';
    shouldMoveTo?: 'next_question' | 'debrief';
}

/**
 * Generate an interview question based on config
 */
export async function generateQuestion(
    config: InterviewConfig,
    previousMessages: Message[]
): Promise<GeneratedQuestion> {
    const messagesContext = previousMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

    const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `Generate a ${config.difficulty} ${config.type} interview question for a ${config.role} position.
${config.company ? `Target company: ${config.company}` : ''}
${config.language ? `Preferred language: ${config.language}` : ''}

Previous conversation:
${messagesContext || 'None — this is the first question.'}

Respond in JSON format:
{
  "question": "The full question text",
  "hints": ["hint1", "hint2"],
  "expectedTopics": ["topic1", "topic2"]
}`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from LLM');
    return JSON.parse(content) as GeneratedQuestion;
}


// ── LeetCode-style topic pools per difficulty ───────────────────────────
const PROBLEM_TOPICS: Record<string, string[]> = {
    easy: [
        'Two-pointer technique on a sorted array',
        'Sliding window — fixed size',
        'Hash map frequency counting',
        'Stack-based bracket / parentheses matching',
        'Prefix sum on an integer array',
        'Binary search on a sorted array',
        'String manipulation: anagram, palindrome check, or Caesar cipher',
        'Array in-place rotation or shift',
        'Linked list reversal',
        'Simple recursion (Fibonacci variant, power function)',
        'BFS level-order traversal of binary tree',
        'Greedy: best time to buy/sell stock (one transaction)',
        'Bit manipulation: single number, count set bits',
        'Matrix diagonal or spiral traversal',
        'Math: reverse integer, is palindrome number',
    ],
    medium: [
        'Backtracking: permutations or combination sum',
        'Dynamic programming 1-D: coin change or jump game',
        'Dynamic programming 2-D: unique paths or LCS',
        'Graph BFS/DFS: number of islands or word ladder',
        'Topological sort: course schedule or task ordering',
        'Binary search on answer: capacity to ship, peak element',
        'Trie: prefix matching or word search',
        'Heap / priority queue: K closest points or top-K frequent',
        'Monotonic stack: next greater element or daily temperatures',
        'Interval merging and insertion',
        'Two-pass hashing: group anagrams or LRU-cache simulation',
        'Tree path problems: path sum II or lowest common ancestor',
        'Dutch National Flag 3-way partitioning',
        'Linked list: reverse a sub-list or detect cycle with entry point',
        'Sliding window variable size: longest substring without repeat',
    ],
    hard: [
        'Interval DP: burst balloons or strange printer',
        'Advanced graph: Dijkstra shortest path or critical connections',
        'Range query: segment tree or Fenwick tree',
        'Union-Find: redundant connection or accounts merge',
        'Sliding window hard: minimum window substring',
        'Backtracking with pruning: N-queens or Sudoku solver',
        'String DP: edit distance or wildcard / regex matching',
        'Monotonic stack hard: largest rectangle in histogram',
        'Median from data stream: dual-heap design',
        'Tree hard: serialize/deserialize binary tree',
        'Matrix DP: maximal square or maximal rectangle',
        'Hard two-pointer: trapping rain water or container with most water',
        'Divide and conquer: count of smaller numbers after self',
        'Bit manipulation hard: maximum XOR of two numbers in array',
        'Greedy hard: jump game II or minimum number of arrows',
    ],
};

function pickRandomTopic(difficulty: string): string {
    const pool = PROBLEM_TOPICS[difficulty] ?? PROBLEM_TOPICS['medium'];
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generate a coding problem with starter code
 */
export async function generateCodingProblem(
    config: InterviewConfig
): Promise<Problem> {
    const topic = pickRandomTopic(config.difficulty);
    const seed = Math.floor(Math.random() * 9000) + 1000; // uniqueness seed

    const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `Generate a ${config.difficulty} LeetCode-style coding problem for a ${config.role} interview.
${config.company ? `Style it after problems commonly asked at ${config.company}.` : ''}
Language: ${config.language}

REQUIRED topic/pattern: "${topic}"
Uniqueness seed: ${seed}

Rules:
- Use the "${topic}" pattern but invent a FRESH scenario (do not just copy Two Sum, Reverse Linked List, etc.)
- The "description" should sound like a human interviewer verbally introducing the problem. It MUST explain the core task clearly and define the exact input/output formats (e.g., "You're given an array of comma-separated strings...").
- You MAY include a single, simple inline example in the "description" to illustrate the input format (e.g., "For example, 'alice,50,sf'"). Do NOT give away edge cases or strict constraints in the description.
- Create 2 detailed, concrete examples with input/output/explanation and put them in the "examples" array.
- Create realistic constraints (e.g. 1 <= n <= 10^5) and put them in the "constraints" array.
- The candidate will have to discover the examples and constraints by asking you clarifying questions during the interview.
- starterCode must be valid ${config.language} with the correct function signature

Respond ONLY in valid JSON:
{
  "title": "Descriptive Problem Title",
  "description": "Full clear problem description",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["1 <= n <= 10^5", "..."],
  "difficulty": "${config.difficulty}",
  "starterCode": {"${config.language}": "// valid starter here"},
  "followUps": ["What is the time complexity?", "Can you optimize space?"],
  "tags": ["${topic.split(' ')[0].toLowerCase()}", "algorithms"],
  "companies": ["${config.company || 'general'}"]
}`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 1.0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from LLM');

    const parsed = JSON.parse(content);
    return {
        id: crypto.randomUUID(),
        type: 'technical',
        difficulty: config.difficulty,
        ...parsed,
    } as Problem;
}


/**
 * Evaluate candidate's response and decide next action
 */
export async function evaluateResponse(
    config: InterviewConfig,
    problem: Problem | null,
    messages: Message[],
    candidateCode?: string
): Promise<FollowUpResponse> {
    const messagesContext = messages
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n');

    // Pull the last candidate message for focused intent analysis
    const lastCandidateMsg = [...messages]
        .reverse()
        .find((m) => m.role === 'candidate')?.content ?? '';

    const constraintsText = problem?.constraints?.length
        ? problem.constraints.map((c) => `• ${c}`).join('\n')
        : 'Not specified';

    const examplesText = problem?.examples?.length
        ? problem.examples
            .map((e, i) => `Example ${i + 1}: Input = ${e.input} → Output = ${e.output}`)
            .join('\n')
        : 'None provided';

    const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `You are interviewing a candidate for a ${config.role} position.

== PROBLEM ==
Title: ${problem?.title || 'General discussion'}
Description: ${problem?.description || 'N/A'}
Constraints:
${constraintsText}
Examples:
${examplesText}

== CONVERSATION ==
${messagesContext}

${candidateCode ? `== CANDIDATE'S CODE (${config.language}) ==\n\`\`\`${config.language}\n${candidateCode}\n\`\`\`` : '(No code submitted yet)'}

== CANDIDATE'S LAST MESSAGE ==
"${lastCandidateMsg}"

---
STEP 1 — Classify the candidate's last message into ONE intent:
• clarification_request — asking about constraints, input format, edge cases, assumptions, expected output
• thinking_aloud — narrating their thoughts, not asking for anything specific
• approach_proposed — proposing a specific algorithm or data structure to solve the problem
• partial_answer — describing an incomplete approach
• complete_answer — presented a full solution or finished explanation
• needs_hint — clearly stuck, says they don't know or asks for help
• off_topic — unrelated to the problem

STEP 2 — Formulate your response:
• If clarification_request → Answer the question DIRECTLY using the problem info above. Be concise and helpful. Do NOT pivot to a follow-up question yet.
• If thinking_aloud → Encourage briefly (1-2 sentences). Let them keep going. Do NOT ask a follow-up.
• If approach_proposed → EVALUATE the pre-coding checklist by reading the ENTIRE conversation history. Have they completed ALL 4 of the following: 1) restated the problem, 2) asked about edge cases/constraints, 3) discussed AT LEAST 2 different approaches (or trade-offs), and 4) stated time & space complexity of their chosen approach? 
  - If NO (missing any step): Acknowledge their approach, but ask them to complete ONE missing step (e.g. "That approach makes sense. Before we code, can you think of any alternative approaches?" or "What are the time/space complexities?").
  - If YES to all 4: Explicitly give them the go-ahead to start coding. Do NOT ask endless follow-up questions if the approach is sound.
• If partial_answer → Ask ONE targeted follow-up about their specific approach, a complexity concern, or an edge case they haven't mentioned.
• If complete_answer → Give brief feedback. Then, check the ENTIRE conversation history. Have they discussed time/space complexity? Have they discussed edge cases? Ask ONE question about a topic they have NOT YET discussed. If they have already discussed BOTH complexity AND edge cases in the past, do NOT ask about them again. Instead, consider moving on.
• If needs_hint → Give ONE small directional hint using a guiding question. Never reveal the solution.
• If off_topic → Gently redirect to the problem.

CRITICAL RULES:
- MENTAL CHECKLIST: Before allowing the candidate to code, you MUST mentally verify they have done ALL 4: 1. Restated problem, 2. Asked about edge cases, 3. Discussed >1 approach, 4. Stated time/space complexity. Do not blindly say "go ahead" if they skipped even one of these.
- AVOID REPETITION: Never ask a question about time complexity, space complexity, or edge cases if the candidate has ALREADY answered it previously in the conversation. Read the history carefully!
- Never ignore a clarification question. Always answer it first.
- Ask at most ONE question per turn.
- Keep responses concise — 2-4 sentences max unless the candidate needs a detailed explanation.
- Sound like a human, not a chatbot. Use natural language.

Respond ONLY in valid JSON:
{
  "intent": "<classified intent>",
  "message": "<your natural response as the interviewer>",
  "type": "clarification_response" | "encouragement" | "follow_up" | "hint" | "feedback" | "next_question",
  "shouldMoveTo": null | "next_question" | "debrief"
}`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from LLM');
    return JSON.parse(content) as FollowUpResponse;
}


/**
 * Generate a greeting for the interview
 */
export async function generateGreeting(
    config: InterviewConfig
): Promise<string> {
    const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `Generate a friendly, professional greeting to start a ${config.type} interview for a ${config.role} position. 
${config.company ? `You're interviewing on behalf of ${config.company}.` : ''}
Keep it natural and conversational — 2-3 sentences max. Don't use JSON, just plain text.`,
            },
        ],
        temperature: 0.8,
        max_tokens: 200,
    });

    return response.choices[0]?.message?.content ||
        "Hi there! Thanks for joining today. Let's get started with the interview.";
}

/**
 * Generate post-interview feedback
 */
export async function generateFeedback(
    config: InterviewConfig,
    messages: Message[],
    codeSubmissions: { language: string; code: string }[]
): Promise<Omit<InterviewFeedback, 'sessionId'>> {
    const messagesContext = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const codeContext = codeSubmissions
        .map((s) => `\`\`\`${s.language}\n${s.code}\n\`\`\``)
        .join('\n');

    const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `You are a STRICT technical interviewer evaluating a ${config.role} candidate. You are tough, fair, and evidence-based.

IMPORTANT RULES:
- You MUST find verbatim evidence in the CANDIDATE's messages for every item you mark passed=true.
- If the candidate did not EXPLICITLY do something, mark passed=false and evidence=null. Do NOT infer or assume.
- "discussedApproaches": requires the candidate to have explicitly described AT LEAST TWO different algorithmic approaches. Proposing ONE solution and noting its complexity does NOT count.
- "statedComplexity": requires an EXPLICIT Big-O statement for both time AND space (e.g. "O(n) time and O(1) space").
- "walkedThroughExample": requires the candidate to manually trace their code with a concrete example AFTER coding.
- "testedEdgeCasesManually": requires explicitly tracing through edge cases AFTER coding.

Interview transcript:
${messagesContext}

${codeContext ? `Code submissions:\n${codeContext}` : '(No code submitted)'}

Respond ONLY in valid JSON matching this EXACT structure. Each checklist field is an object:
{
  "checklists": {
    "beforeCoding": {
      "restatedProblem": { "passed": boolean, "evidence": "short verbatim candidate quote or null" },
      "askedClarifyingQuestions": { "passed": boolean, "evidence": "short verbatim candidate quote or null" },
      "discussedApproaches": { "passed": boolean, "evidence": "verbatim quote covering TWO distinct approaches or null" },
      "statedComplexity": { "passed": boolean, "evidence": "verbatim Big-O quote or null" },
      "gotGoAhead": { "passed": boolean, "evidence": "short verbatim quote or null" }
    },
    "duringCoding": {
      "talkedThroughCode": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "meaningfulVariableNames": { "passed": boolean, "evidence": "example variable name from code or null" },
      "cleanModularCode": { "passed": boolean, "evidence": "brief code structure observation or null" },
      "handledEdgeCases": { "passed": boolean, "evidence": "short verbatim quote or null" }
    },
    "afterCoding": {
      "walkedThroughExample": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "testedEdgeCasesManually": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "identifiedFixedBugs": { "passed": boolean, "evidence": "short verbatim quote or null" },
      "discussedOptimizations": { "passed": boolean, "evidence": "short verbatim quote or null" }
    }
  },
  "scores": {
    "problemSolving": number,
    "dsa": number,
    "communication": number,
    "coding": number,
    "speed": number
  },
  "overallScore": number,
  "decision": "No Hire" | "Hire" | "Strong Hire",
  "report": "string"
}`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from LLM');
    return JSON.parse(content);
}
