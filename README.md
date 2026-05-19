# GAPOSA EEE Face Recognition Attendance System

React + Vite + Tailwind CSS + Firebase + face-api.js

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Copy `.env.example` to `.env.local` and fill in your Firebase config:
```bash
cp .env.example .env.local
```

Get values from: Firebase Console → Project Settings → Your apps

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Set up Firebase
In Firebase Console:
- Enable **Authentication** → Email/Password
- Enable **Firestore Database**
- Deploy Firestore rules: `firebase deploy --only firestore:rules`

### 4. Create admin account
In Firebase Console → Authentication → Add user:
- Email: `admin@gaposa.edu.ng`
- Password: (your choice)

Then in Firestore → `users` collection → Add document with ID = admin UID:
```json
{
  "uid": "<admin-uid>",
  "name": "Admin User",
  "email": "admin@gaposa.edu.ng",
  "role": "admin",
  "status": "approved"
}
```

### 5. Add system settings
In Firestore → `settings` collection → Document ID: `system`:
```json
{
  "session": "2024/2025",
  "semester": "Second Semester",
  "totalWeeks": 15,
  "autoLogout": "off",
  "offlineScanQueue": false,
  "lecturerSecretCode": "EEE2025"
}
```

### 6. Add face-api models (for face recognition)
Download models from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

Place these files in `/public/models/`:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_tiny_model-weights_manifest.json`
- `face_landmark_68_tiny_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

### 7. Run development server
```bash
npm run dev
```
Open http://localhost:5173

### 8. Build for production
```bash
npm run build
```

---

## File Structure

```
src/
  components/
    ui/           # Reusable UI: Button, Modal, Badge, Toast, StatCard, Spinner
    layout/       # AdminLayout, LecturerLayout, StudentLayout
    scanner/      # Camera components
  pages/
    auth/         # LandingPage, LecturerAuth, AdminAuth, StudentAuth
    student/      # EnrollFlow, StudentAttendance
    lecturer/     # ScanPage, AttendancePage
    admin/        # AdminDashboard, StudentsPage, MasterListPage, LecturersPage, SettingsPage
  hooks/          # useAuth, useCamera
  store/          # authStore (Zustand), scanStore (Zustand)
  services/       # authService, studentService, courseService, faceService
  utils/          # helpers, formatters, constants
  lib/            # firebase.js
```

---

## Role System

| Role     | Login method          | Access |
|----------|-----------------------|--------|
| Admin    | Email + password      | Full system management |
| Lecturer | Email + password      | Scan, attendance, students |
| Student  | Matric number (no pw) | Enroll face, view attendance |

---

## Face Recognition

Face models are loaded from `/public/models/` at runtime.
The system uses `face-api.js` with `TinyFaceDetector` for performance.
Match threshold: 0.45 (stricter = better accuracy, slower)

---

## Deployment

### Vercel (recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Add all `VITE_*` environment variables
4. Deploy

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```
