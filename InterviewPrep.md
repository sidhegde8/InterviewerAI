# InterviewerAI: Technical Architecture & Implementation Guide

This document is designed to help you prepare for technical interviews by detailing the architecture, technical decisions, and implementation details of the InterviewerAI application. Use this to structure your responses when asked "Tell me about a challenging project you've worked on."

## 1. Project Overview

**InterviewerAI** is a comprehensive mock interview platform that simulates real-world technical and behavioral interviews. It leverages large language models (GPT-4o) to act as a dynamic interviewer, capable of asking questions, probing for deeper understanding, and evaluating candidate responses in real-time.

**Core Value Proposition:** Transitioning from static question banks (like LeetCode) to an interactive, adaptive interview experience that tests communication, problem-solving, and coding under pressure.

---

## 2. Tech Stack

*   **Frontend Framework:** Next.js (App Router), React 19
*   **Language:** TypeScript (strict mode for type safety)
*   **Styling:** Tailwind CSS V4, Custom Glassmorphism UI
*   **State Management:** Zustand (for complex, cross-component active interview session state)
*   **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Supabase Auth)
*   **AI / LLM Data:** OpenAI API (GPT-4o)
*   **Resume Parsing:** `pdfjs-dist` (Client-side PDF text extraction)

---

## 3. Architecture & Data Flow

The application follows a modern serverless architecture, heavily utilizing Next.js React Server Components (RSC) and API routes.

### 3.1 Authentication & Security (Supabase)
*   **Implementation:** Supabase Auth with SSR (Server-Side Rendering) support.
*   **Middleware:** `src/middleware.ts` intercepts every request. It checks the Supabase session token. If the user is unauthenticated and tries to access a protected route (anything other than `/` or `/login`), they are redirected to `/login`.
*   **Row Level Security (RLS):** All database tables (`sessions`, `messages`, `feedback`) have RLS policies enabled. The database strictly enforces that a query (e.g., `SELECT * FROM sessions`) only returns rows where `user_id == auth.uid()`, preventing data leakage even if an API endpoint is misconfigured.

### 3.2 State Management (Zustand)
Given the complexity of an active interview (timer, current transcript, accumulated code, AI loading states), React Context would cause too many unnecessary re-renders.
*   **Solution:** Two Zustand stores (`useInterviewStore` and `useBehavioralStore`).
*   **Why Zustand?** It allows components to subscribe *only* to the specific slices of state they need (e.g., the timer component only subscribes to `timeLeft`, ignoring transcript updates), ensuring smooth UI performance during rapid text streaming.

### 3.3 Database Schema
*   **`sessions` table:** Master record for an interview.
    *   Columns: `id` (UUID), `user_id`, `type` ('technical' | 'behavioral'), `config` (JSONB storing role, difficulty, etc.), `duration_secs`, `created_at`.
*   **`messages` table:** The transcript. Linked to a session via `session_id`.
    *   Columns: `role` ('interviewer' | 'candidate' | 'system'), `content` (TEXT).
*   **`feedback` table:** The final evaluation. Linked 1:1 with `session_id`.
    *   Columns: `overall_score`, `decision` (Hire / No Hire), `report` (JSONB containing detailed rubrics, strengths, weaknesses, and evidence).

---

## 4. Core Features & Technical Complexity

### 4.1 The Core Interview Loop (Event-Driven Architecture)
The hardest part of the app is managing the asynchronous flow between the user speaking/typing and the AI responding.

1.  **User Input:** The user submits a response via text or code.
2.  **State Update:** The message is instantly added to the local Zustand store (Optimistic UI) and the "AI is typing" state is set to true.
3.  **API Coordination:** An asynchronous call is made to a Next.js Serverless Function (`/api/interview/chat`).
4.  **Prompt Engineering:** The server compiles the *entire conversation history* (from the DB or client state) and injects strictly defined system instructions. It forces the AI to reply in a structured format (e.g., separating the spoken dialogue from hidden thought processes).
5.  **Streaming Response:** *[Future optimization note: currently it waits for the full response, but the architecture supports migrating to Next.js Edge streams for real-time character-by-character typing.]*
6.  **Resolution:** The AI's response is parsed, added to the Zustand store, and the UI updates.

### 4.2 Robust JSON Parsing & AI Evaluation
When the interview ends, the AI must act as a grader. Relying on an LLM to output consistent, parseable data is notoriously difficult.
*   **The Problem:** The LLM might wrap JSON in markdown (````json ... ````) or include conversational filler ("Here is your rubric:").
*   **The Solution (`src/lib/json-parser.ts`):** I implemented a resilient regex-based parser that scans the LLM's raw text, identifies the outermost JSON brackets (`{` and `}` or `[` and `]`), extracts only that substring, and attempts `JSON.parse()`. This guarantees the app doesn't crash even if the AI misbehaves slightly.
*   **Strict Typing:** The parsed JSON is immediately validated against TypeScript interfaces to ensure all required fields (decision, overall_score, strengths) exist before saving to Supabase.

### 4.3 Client-Side PDF Parsing (`pdfjs-dist`)
For the "Resume Grill" behavioral mode, user resumes must be parsed.
*   **Design Decision:** Parsing PDFs on the server costs bandwidth and compute. Parsing them on the client saves server costs and is faster for the user.
*   **Implementation:** Used Mozilla's `pdfjs-dist`. We load the PDF file generated from the HTML `<input type="file">`, extract the text layer from each page, concatenate it, and store the raw text string in the Zustand state to be sent in the initial setup prompt to the AI.

### 4.4 Continuous Speech Input (Web Speech API)
*   **Implementation:** Leveraged the browser's native `SpeechRecognition` interface.
*   **Complexity:** Speech recognition often stops automatically when the user pauses for breath. I implemented logic in a custom React hook to continuously restart the recognition engine upon `'end'` events *unless* the user explicitly clicked the "Stop" button, ensuring a seamless transcription experience.

---

## 5. Key Talking Points for Interviews

If an interviewer asks you about this project, focus on these themes:

### "Tell me about a technical challenge you faced."
**Talk about managing AI Hallucinations & Structured Data.**
*   *Situation:* The AI grader occasionally returned invalid JSON or wrapped it in markdown, breaking the frontend rendering of the feedback report.
*   *Action:* I built a resilient extraction utility (`extractJsonFromText`) using Regex to strip out markdown blocks and conversational filler, isolating the raw JSON before parsing it.
*   *Result:* Zero UI crashes due to malformed LLM outputs, resulting in a 100% reliable feedback viewing experience.

### "Why did you choose your state management approach?"
**Talk about Zustand vs. React Context.**
*   *Situation:* The interview session page has a stopwatch ticking every second, a live code editor, and a chat transcript.
*   *Action:* I avoided React Context because updating a shared context every second would trigger a re-render of the *entire* page, including the heavy code editor and chat components. Instead, I used Zustand, allowing the `Timer` component to subscribe *only* to the `duration` state independent of the `transcript` state.
*   *Result:* Maintained a buttery smooth 60fps UI even when typing rapidly in the code editor alongside a ticking timer.

### "How did you handle security?"
**Talk about Supabase Auth + RLS + Middleware.**
*   *Situation:* Users need to only see their own interview transcripts and scores.
*   *Action:* Implemented defense-in-depth. First, Next.js Middleware blocks unauthorized page loads. Second, and most importantly, I configured PostgreSQL Row Level Security (RLS) policies.
*   *Result:* Even if an API endpoint was accidentally exposed or poorly written, the database itself mathematically guarantees that a query cannot read rows belonging to another `user_id`.

---

## 6. Future Scalability Considerations (To bring up in interviews)

*   **Streaming Responses:** Migrating the standard REST API endpoints to edge functions that utilize streaming (Server-Sent Events) to reduce perceived latency ("Time to First Byte") when the AI responds.
*   **WebSockets for Code Execution:** Currently, code is just text. To execute Code natively, I would implement a dedicated microservice (using Docker or a service like Piston) communicating via WebSockets for secure, isolated code execution.
*   **Vector Database (RAG):** If expanding to specific company questions, I would integrate a vector database (like Pinecone or pgvector in Supabase) to perform Retrieval-Augmented Generation, fetching real recent interview questions to inject into the AI's prompt.
