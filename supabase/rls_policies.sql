-- ============================================================
--  EEE FACE-ID — Supabase Row Level Security Policies
--  Run this entire file in the Supabase SQL Editor.
--  Tables: students, face_descriptors, attendance,
--          absence_requests, reenroll_requests,
--          student_email_otps, master_list, courses,
--          users (lecturer/admin profiles)
-- ============================================================

-- ── Helper: check if the caller is a lecturer or admin ──────────
-- (Avoids repeating EXISTS subqueries in every policy)
CREATE OR REPLACE FUNCTION auth_is_staff()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id   = auth.uid()
    AND   role IN ('lecturer', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id   = auth.uid()
    AND   role = 'admin'
  )
$$;

-- ── Helper: get the matric from the current JWT ─────────────────
-- Students sign in anonymously; their matric is stored in
-- user_metadata by the client after login.
CREATE OR REPLACE FUNCTION auth_student_matric()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'matric')::text
$$;


-- ==============================================================
--  1. STUDENTS TABLE
-- ==============================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Students can read their own record
CREATE POLICY "students: student reads own"
  ON students FOR SELECT
  USING (matric = auth_student_matric() OR auth_is_staff());

-- Staff can update student records (enrolment, photo, pin, email)
CREATE POLICY "students: staff updates"
  ON students FOR UPDATE
  USING (auth_is_staff() OR matric = auth_student_matric());

-- Only admin can insert or delete student rows
CREATE POLICY "students: admin insert"
  ON students FOR INSERT
  WITH CHECK (auth_is_admin());

CREATE POLICY "students: admin delete"
  ON students FOR DELETE
  USING (auth_is_admin());


-- ==============================================================
--  2. FACE_DESCRIPTORS TABLE
-- ==============================================================
ALTER TABLE face_descriptors ENABLE ROW LEVEL SECURITY;

-- Lecturers and admins can read all descriptors (needed for scanning)
CREATE POLICY "face_descriptors: staff reads all"
  ON face_descriptors FOR SELECT
  USING (auth_is_staff());

-- Students can read their own descriptors
CREATE POLICY "face_descriptors: student reads own"
  ON face_descriptors FOR SELECT
  USING (matric = auth_student_matric());

-- Insert/delete only during enrollment (student owns their own rows)
CREATE POLICY "face_descriptors: student inserts own"
  ON face_descriptors FOR INSERT
  WITH CHECK (matric = auth_student_matric() OR auth_is_staff());

CREATE POLICY "face_descriptors: student deletes own"
  ON face_descriptors FOR DELETE
  USING (matric = auth_student_matric() OR auth_is_admin());


-- ==============================================================
--  3. ATTENDANCE TABLE
-- ==============================================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Students can read their own records
CREATE POLICY "attendance: student reads own"
  ON attendance FOR SELECT
  USING (matric = auth_student_matric() OR auth_is_staff());

-- Only lecturers/admins can insert attendance (face scan or manual)
CREATE POLICY "attendance: staff inserts"
  ON attendance FOR INSERT
  WITH CHECK (auth_is_staff());

-- Only lecturers/admins can update (corrections, status changes)
CREATE POLICY "attendance: staff updates"
  ON attendance FOR UPDATE
  USING (auth_is_staff());

-- Only admins can delete attendance records
CREATE POLICY "attendance: admin deletes"
  ON attendance FOR DELETE
  USING (auth_is_admin());


-- ==============================================================
--  4. ABSENCE_REQUESTS TABLE
-- ==============================================================
ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;

-- Students can view their own requests
CREATE POLICY "absence_requests: student reads own"
  ON absence_requests FOR SELECT
  USING (matric = auth_student_matric() OR auth_is_staff());

-- Students can submit their own requests
CREATE POLICY "absence_requests: student inserts own"
  ON absence_requests FOR INSERT
  WITH CHECK (matric = auth_student_matric());

-- Only admins/lecturers can update status (approve/reject)
CREATE POLICY "absence_requests: staff updates"
  ON absence_requests FOR UPDATE
  USING (auth_is_staff());

CREATE POLICY "absence_requests: admin deletes"
  ON absence_requests FOR DELETE
  USING (auth_is_admin());


-- ==============================================================
--  5. REENROLL_REQUESTS TABLE
-- ==============================================================
ALTER TABLE reenroll_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reenroll_requests: student reads own"
  ON reenroll_requests FOR SELECT
  USING (matric = auth_student_matric() OR auth_is_staff());

CREATE POLICY "reenroll_requests: student inserts own"
  ON reenroll_requests FOR INSERT
  WITH CHECK (matric = auth_student_matric());

CREATE POLICY "reenroll_requests: staff updates"
  ON reenroll_requests FOR UPDATE
  USING (auth_is_staff());

CREATE POLICY "reenroll_requests: admin deletes"
  ON reenroll_requests FOR DELETE
  USING (auth_is_admin());


-- ==============================================================
--  6. STUDENT_EMAIL_OTPS TABLE
-- ==============================================================
ALTER TABLE student_email_otps ENABLE ROW LEVEL SECURITY;

-- Students can read/insert/delete their own OTP rows
CREATE POLICY "otps: student reads own"
  ON student_email_otps FOR SELECT
  USING (matric = auth_student_matric());

CREATE POLICY "otps: student inserts own"
  ON student_email_otps FOR INSERT
  WITH CHECK (matric = auth_student_matric());

CREATE POLICY "otps: student deletes own"
  ON student_email_otps FOR DELETE
  USING (matric = auth_student_matric());


-- ==============================================================
--  7. MASTER_LIST TABLE
-- ==============================================================
ALTER TABLE master_list ENABLE ROW LEVEL SECURITY;

-- Any authenticated user (student, lecturer, admin) can read
CREATE POLICY "master_list: authenticated reads"
  ON master_list FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admin can modify the master list
CREATE POLICY "master_list: admin inserts"
  ON master_list FOR INSERT
  WITH CHECK (auth_is_admin());

CREATE POLICY "master_list: admin updates"
  ON master_list FOR UPDATE
  USING (auth_is_admin());

CREATE POLICY "master_list: admin deletes"
  ON master_list FOR DELETE
  USING (auth_is_admin());


-- ==============================================================
--  8. COURSES TABLE
-- ==============================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses: staff reads all"
  ON courses FOR SELECT
  USING (auth_is_staff());

CREATE POLICY "courses: admin inserts"
  ON courses FOR INSERT
  WITH CHECK (auth_is_admin());

CREATE POLICY "courses: admin updates"
  ON courses FOR UPDATE
  USING (auth_is_admin());

CREATE POLICY "courses: admin deletes"
  ON courses FOR DELETE
  USING (auth_is_admin());


-- ==============================================================
--  9. USERS TABLE (lecturer/admin profiles)
-- ==============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile; admins can read all
CREATE POLICY "users: read own or admin"
  ON users FOR SELECT
  USING (id = auth.uid() OR auth_is_admin());

-- Admins can insert and update users (approve/reject lecturers)
CREATE POLICY "users: admin manages"
  ON users FOR INSERT
  WITH CHECK (auth_is_admin());

CREATE POLICY "users: admin updates"
  ON users FOR UPDATE
  USING (id = auth.uid() OR auth_is_admin());

CREATE POLICY "users: admin deletes"
  ON users FOR DELETE
  USING (auth_is_admin());


-- ==============================================================
--  10. ATTENDANCE_NOTIFICATIONS_QUEUE (if exists)
-- ==============================================================
-- Only staff can insert; service role handles processing
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_notifications_queue') THEN
    ALTER TABLE attendance_notifications_queue ENABLE ROW LEVEL SECURITY;
    EXECUTE $p$
      CREATE POLICY "notif_queue: staff inserts"
        ON attendance_notifications_queue FOR INSERT
        WITH CHECK (auth_is_staff());
      CREATE POLICY "notif_queue: staff reads"
        ON attendance_notifications_queue FOR SELECT
        USING (auth_is_staff());
    $p$;
  END IF;
END $$;


-- ==============================================================
--  NOTE ON STUDENT MATRIC BINDING
-- ==============================================================
-- The auth_student_matric() function reads from user_metadata,
-- which is currently set client-side via supabase.auth.updateUser().
-- This blocks unauthenticated (anon-key) attacks but a logged-in
-- student CAN change their own metadata.
--
-- For full server-side enforcement, deploy a Supabase Edge Function
-- that verifies the PIN server-side using the service_role key,
-- then sets user_metadata via auth.admin.updateUserById().
-- This prevents any client from spoofing a different matric.
-- ==============================================================
