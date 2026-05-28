-- ── Step 1: Add Telegram column to students ───────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- ── Step 2: Create link codes table ───────────────────────────────
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matric     TEXT        NOT NULL,
  code       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     DEFAULT FALSE
);

ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Students can insert codes for their own matric
CREATE POLICY "telegram_link_codes: student inserts own"
  ON telegram_link_codes FOR INSERT
  WITH CHECK (matric = auth_student_matric());

-- Students can read their own codes (for status check)
CREATE POLICY "telegram_link_codes: student reads own"
  ON telegram_link_codes FOR SELECT
  USING (matric = auth_student_matric());
-- Service role (webhook) updates (mark used) bypass RLS automatically
