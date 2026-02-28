-- ============================================================
-- InterviewerAI — Supabase Schema
-- Run this entire file in Supabase > SQL Editor > New Query
-- ============================================================

-- Sessions table (covers both technical and behavioral)
CREATE TABLE IF NOT EXISTS sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          TEXT NOT NULL CHECK (type IN ('technical', 'behavioral')),
    config        JSONB NOT NULL,              -- InterviewConfig or BehavioralConfig
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at      TIMESTAMPTZ,
    duration_secs INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('interviewer', 'candidate')),
    content     TEXT NOT NULL,
    type        TEXT NOT NULL,
    timestamp   BIGINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback table (one row per session)
CREATE TABLE IF NOT EXISTS feedback (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    checklists    JSONB NOT NULL,
    scores        JSONB NOT NULL,
    overall_score NUMERIC(3,1) NOT NULL,
    decision      TEXT NOT NULL,
    report        TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_type       ON sessions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session_id ON feedback(session_id);
