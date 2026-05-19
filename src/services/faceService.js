// Face recognition service
// Detection:  face-api.js in browser (liveness only)
// Embeddings: Python ArcFace server (512D, 99.4% accuracy, SSD detector)
// Matching:   Supabase pgvector RPC via React

const FACE_SERVER = import.meta.env.VITE_FACE_SERVER_URL || 'http://localhost:8000'

let modelsLoaded = false
const MODEL_URL  = '/models'

// ── Load face-api.js models (liveness detection only) ─────────────
export async function loadFaceModels() {
  if (modelsLoaded) return true
  try {
    const faceapi = await import('face-api.js')
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
    modelsLoaded = true
    return true
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Face models not loaded:', err.message)
    return false
  }
}

// ── Check if Python server is online ─────────────────────────────
export async function checkFaceServer() {
  try {
    const res = await fetch(`${FACE_SERVER}/health`, {
      signal: AbortSignal.timeout(3000)
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Detect face (for liveness) ────────────────────────────────────
export async function detectFace(videoEl) {
  try {
    const faceapi = await import('face-api.js')
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224, scoreThreshold: 0.4,
    })
    return await faceapi
      .detectSingleFace(videoEl, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor()
  } catch { return null }
}

// ── Capture frame as base64 — high resolution ─────────────────────
// Higher resolution = better face detection on the Python server
// SSD detector works much better with larger images
export function captureFrameAsBase64(videoEl) {
  const canvas = document.createElement('canvas')
  // Use full camera resolution — do NOT downscale
  canvas.width  = videoEl.videoWidth  || 1280
  canvas.height = videoEl.videoHeight || 720
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height)
  // Use higher quality JPEG for better detection
  return canvas.toDataURL('image/jpeg', 0.95)
}

// ── Capture multiple frames ───────────────────────────────────────
export async function captureFrames(videoEl, count = 1) {
  const frames = []
  for (let i = 0; i < count; i++) {
    frames.push(captureFrameAsBase64(videoEl))
    if (i < count - 1) await new Promise(r => setTimeout(r, 300))
  }
  return frames
}

// ── Get ArcFace embeddings from Python server ─────────────────────
export async function getEmbeddingsFromServer(frames) {
  const res = await fetch(`${FACE_SERVER}/embed/batch`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ images: frames }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Server error' }))
    throw new Error(err.detail || 'Failed to get embeddings from server')
  }

  const data = await res.json()
  return data.embeddings
}

// ── Verify two images are same person ────────────────────────────
export async function verifyFaces(image1, image2) {
  const res = await fetch(`${FACE_SERVER}/verify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ image1, image2 }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Server error' }))
    throw new Error(err.detail || 'Verification failed')
  }

  return await res.json()
}

// ── Quality check — Python server is the gate ─────────────────────
export async function checkImageQuality(videoEl) {
  return { ok: true, reason: '' }
}

// ── Liveness helpers ──────────────────────────────────────────────
function getEAR(eye) {
  const [p1,p2,p3,p4,p5,p6] = eye
  const A = Math.hypot(p2.x-p6.x, p2.y-p6.y)
  const B = Math.hypot(p3.x-p5.x, p3.y-p5.y)
  const C = Math.hypot(p1.x-p4.x, p1.y-p4.y)
  return (A+B)/(2*C)
}

export function getEyeAspectRatio(landmarks) {
  try {
    const pts = landmarks.positions
    return (getEAR(pts.slice(36,42)) + getEAR(pts.slice(42,48))) / 2
  } catch { return 0.3 }
}

export function getHeadTurnRatio(landmarks) {
  try {
    const pts  = landmarks.positions
    const nose = pts[30], le = pts[36], re = pts[45]
    const fw   = Math.abs(re.x - le.x)
    const fc   = (le.x + re.x) / 2
    return (nose.x - fc) / fw
  } catch { return 0 }
}

export function getNoseTipY(landmarks) {
  try { return landmarks.positions[30].y }
  catch { return 0 }
}

// ── Client-side fallback matching ─────────────────────────────────
export function matchDescriptor(detected, students) {
  const MATCH = 0.45, FLAG = 0.55
  let best = null, bestDist = Infinity
  for (const s of students) {
    if (!s.descriptors?.length) continue
    for (const d of s.descriptors) {
      const arr  = Array.isArray(d) ? d : (d.values || d)
      const dist = euclidean(detected, arr)
      if (dist < bestDist) { bestDist = dist; best = s }
    }
  }
  if (!best || bestDist > FLAG) return null
  return {
    student:    best,
    distance:   bestDist,
    confidence: Math.round((1-bestDist)*100),
    isMatch:    bestDist <= MATCH,
  }
}

function euclidean(a, b) {
  if (a.length !== b.length) return Infinity
  let s = 0
  for (let i = 0; i < a.length; i++) { const d = a[i]-b[i]; s += d*d }
  return Math.sqrt(s)
}

export const LIVENESS_STEPS = [
  { id:'normal', label:'Normal Face',            instruction:'Look straight at the camera' },
  { id:'blink',  label:'Blink Eyes',             instruction:'Slowly blink your eyes' },
  { id:'turn',   label:'Turn Head Left & Right', instruction:'Turn your head left, then right' },
  { id:'nod',    label:'Nod Head',               instruction:'Nod your head up and down' },
]

// ── Legacy ────────────────────────────────────────────────────────
export async function captureDescriptors(videoEl, count = 3) {
  const descriptors = []
  for (let i = 0; i < count; i++) {
    const det = await detectFace(videoEl)
    if (det) descriptors.push(Array.from(det.descriptor))
    if (i < count - 1) await new Promise(r => setTimeout(r, 150))
  }
  return descriptors
}