-- ============================================================
-- InterviewerAI — Supabase Auth Schema Migration
-- Run in Supabase > SQL Editor > New Query
-- (Run AFTER the initial schema.sql)
-- ============================================================

-- Add user_id to sessions (nullable so old rows don't break)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Sessions: users can only see their own sessions
CREATE POLICY "Users can view own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Messages: visible if user owns the parent session
CREATE POLICY "Users can view own messages"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = messages.session_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = messages.session_id
            AND sessions.user_id = auth.uid()
        )
    );

-- Feedback: visible if user owns the parent session
CREATE POLICY "Users can view own feedback"
    ON feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = feedback.session_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own feedback"
    ON feedback FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = feedback.session_id
            AND sessions.user_id = auth.uid()
        )
    );
