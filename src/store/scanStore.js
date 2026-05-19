import { create } from 'zustand'

export const useScanStore = create((set, get) => ({
  // Session
  activeCourse:  null,
  activeWeek:    null,
  session:       null,
  semester:      null,

  // Scan state
  scanning:       false,
  scanMode:       'single', // 'single' | 'multiple'
  lastDetection:  null,    // { student, confidence, descriptor }
  pendingApproval: null,

  // Session records
  presentList:  [],
  absentList:   [],
  scannedToday: new Set(),

  // Camera
  cameraActive:  false,
  cameraFacing:  'user',

  setActiveCourse:  (course)  => set({ activeCourse: course }),
  setActiveWeek:    (week)    => set({ activeWeek: week }),
  setSession:       (s)       => set({ session: s }),
  setSemester:      (s)       => set({ semester: s }),
  setScanning:      (v)       => set({ scanning: v }),
  setScanMode:      (mode)    => set({ scanMode: mode }),
  setLastDetection: (d)       => set({ lastDetection: d }),
  setPendingApproval: (p)     => set({ pendingApproval: p }),
  setCameraActive:  (v)       => set({ cameraActive: v }),
  toggleCameraFacing: () => set(s => ({ cameraFacing: s.cameraFacing === 'user' ? 'environment' : 'user' })),

  markPresent: (student) => set(s => ({
    presentList:  [...s.presentList.filter(x => x.matric !== student.matric), student],
    scannedToday: new Set([...s.scannedToday, student.matric]),
  })),

  markAbsent: (student) => set(s => ({
    absentList: [...s.absentList.filter(x => x.matric !== student.matric), student],
  })),

  isAlreadyScanned: (matric) => get().scannedToday.has(matric),

  resetSession: () => set({
    scanning: false, lastDetection: null, pendingApproval: null,
    presentList: [], absentList: [], scannedToday: new Set(),
    cameraActive: false,
  }),
}))
