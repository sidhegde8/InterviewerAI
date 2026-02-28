# InterviewerAI - Developer Context & AI Handoff

This file acts as the ultimate truth for the current state of the InterviewerAI MVP. **When starting a new session or handing off to another AI, READ THIS FIRST.** It contains critical architectural decisions, environment setup, and specific bugs/pitfalls we've already solved so we don't repeat them.

## 1. Core Stack
*   **Next.js 16.1 (App Router):** Using React 19 features where applicable.
*   **Styling:** Tailwind CSS V4 + custom global variables for the dark glassmorphism theme (`oklch` colors).
*   **Auth & Database:** Supabase (`@supabase/ssr` only).
*   **LLM Integration:** OpenAI API (`gpt-4o`) via Next.js Serverless Functions (`/api/interview/*`).
*   **State Management:** Zustand (Strictly used for active sessions. Avoid React Context for performance.)

## 2. Directory Structure Conventions
*   `src/app/api/...`: Next.js Serverless API routes.
*   `src/app/(auth)/...` or direct paths (`/login`, `/dashboard`): Page routes.
*   `src/components/...`: Reusable UI.
*   `src/lib/...`: Utilities (Supabase clients, JSON parsers, PDF extractors).
*   `src/types/...`: Strict TypeScript interfaces for the database and LLM outputs.
*   `src/stores/...`: Zustand slices.

## 3. High-Priority "Gotchas" & Past Mistakes (DO NOT REPEAT)

### **A. Supabase Data Fetching (Arrays vs. Single Objects)**
*   **The Mistake:** Trying to access `session.feedback[0]` when fetching data.
*   **The Reality:** If a Supabase table has a `UNIQUE` constraint on a foreign key (e.g., `feedback.session_id` is unique), Supabase's PostgREST API is smart enough to return that join as a **single object**, NOT an array.
*   **The Fix:** When joining the `feedback` table onto `sessions`, type it correctly and access it as `session.feedback`, not `session.feedback[0]`.

### **B. Middleware Authentication Loop**
*   **The Mistake:** Using an `AUTH_ROUTES` / `PROTECTED_ROUTES` whitelist that accidentally trapped users in a redirect loop or exposed setup wizards.
*   **The Reality:** We switched to a default-deny pattern.
*   **The Fix:** In `src/middleware.ts`, **ALL paths are protected by default** except an explicit `PUBLIC_ROUTES` list (`['/login', '/auth']`) and an exact match list for the landing page (`['/']`). Do not revert to the old whitelist pattern.

### **C. OpenAI Structured JSON Parsing**
*   **The Mistake:** Trusting OpenAI to return raw, parsable JSON.
*   **The Reality:** GPT-4o often wraps JSON in markdown blocks (````json ... ````) or prepends conversational filler.
*   **The Fix:** ALWAYS use `src/lib/json-parser.ts` (`extractJsonFromText`) when processing AI responses intended for the database. Do not rely on native `JSON.parse()` on raw LLM output.

### **D. Rate Limiting in Development**
*   **The Mistake:** Repeatedly hitting Supabase's "Rate Limit Exceeded" during email signup testing.
*   **The Reality:** Supabase's free tier heavily restricts SMTP emails (3 per hour per IP).
*   **The Fix:** When developing auth flows, either use the pre-configured test users, rely on Google OAuth (which bypasses SMTP limits), or manually adjust rate limits in the Supabase Dashboard.

### **E. D-ID Avatar Service (Deprecated)**
*   **The Mistake:** Attempting to force WebRTCPeerConnections in React 19 strict mode for the older D-ID streaming API.
*   **The Reality:** D-ID's older implementation didn't play nicely with our aggressive re-rendering loop.
*   **The Fix:** We stripped out D-ID and replaced it with a custom UI Avatar + ElevenLabs TTS over AudioContext. Do not try to re-integrate D-ID without a completely isolated iframe or Web Worker.

### **F. Zustand vs. React Context**
*   **The Decision:** We explicitly chose Zustand over React Context for the core interview session.
*   **The Reason:** The `Timer` ticks every second, and the `Transcript` updates every ~50ms when streaming. React Context forces a re-render of the entire Consumer tree. Zustand allows atomic subscriptions (e.g., `const duration = useInterviewStore(s => s.durationMinutes)`). Avoid putting rapidly changing data into generic React Contexts.

### **G. Next.js Build Crashes on `useSearchParams()`**
*   **The Mistake:** Using `useSearchParams()` in a page component (e.g., `/login`) without wrapping the hook usage in a React `<Suspense>` boundary.
*   **The Reality:** During `npm run build`, Next.js attempts to statically prerender pages. If a component uses `useSearchParams()` outside of a Suspense boundary, Next.js forces a client-side rendering bailout which throws a build error (`missing-suspense-with-csr-bailout`).
*   **The Fix:** Always isolate components using `useSearchParams()` into their own component (e.g., `<LoginContent />`) and export a default page component that wraps it: `return <Suspense fallback={...}><LoginContent /></Suspense>;`.

### **H. Manually Splitting Server/Client Components**
*   **The Mistake:** Accidentally leaving orphaned closing JSX tags (like `</div>` or `</main>`) when moving code from a combined component into separate `page.tsx` (server) and `session-client.tsx` (client) files.
*   **The Reality:** The TypeScript compiler `tsc` will fail with "JSX element 'div' has no corresponding closing tag", which halts the build process.
*   **The Fix:** When refactoring, meticulously trace the DOM tree and ensure all parent wrappers in `page.tsx` correctly envelop the children in `session-client.tsx`. Check `npm run build` or `npx tsc --noEmit` locally after file splitting.

### **I. Git Reversions Overwriting Core Setup**
*   **The Mistake:** Running blanket `git checkout` or `git reset` commands to undo recent feature work, which accidentally pulled down the default `create-next-app` templates for `src/app/layout.tsx` and `src/app/globals.css`.
*   **The Reality:** This completely wiped out the application's global dark theme variables (`oklch`), the Tailwind `@layer` custom classes (`.btn-primary`, `.glass-panel`), and removed the `<AppShell>` wrapper from the root layout, resulting in a seemingly unstyled, broken site.
*   **The Fix:** Always verify `git status` and specifically checkout individual files if restoring state manually. If the UI suddenly defaults to black text on a white background, check `globals.css` and `layout.tsx` first.

## 4. Environment Variables Checklist
If the app fails to start, verify these exist in `.env.local`:
*   `NEXT_PUBLIC_SUPABASE_URL`
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
*   `OPENAI_API_KEY`
*   `ELEVENLABS_API_KEY` (if TTS is enabled)

## 5. Next Steps / Current Feature Pipeline
*   **Phase 1-8:** Complete (Auth, Dashboard, Tech Interview, Behavioral, PDF Parsing).
*   **Phase 9:** Navigation overhaul (Sidebar UI, Smart Landing Page) is complete.
*   **Upcoming Focus:** Data Visualization (charts on the dashboard) and fine-tuning the AI prompts to be slightly harsher/more realistic in Behavioral modes.
