// uploadMasterList.js — No extra packages needed
// Run: node uploadMasterList.js

import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { config } from 'dotenv'

config({ path: '.env.local' })

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db  = getFirestore(app)

const students = JSON.parse(readFileSync('./students.json', 'utf8'))

console.log(`Uploading ${students.length} students...`)

let count = 0
for (const student of students) {
  const matric = String(student.matric).trim()
  await setDoc(doc(db, 'masterList', matric), {
    matric:  matric,
    name:    String(student.name).trim(),
    level:   String(student.level).trim(),
    option:  String(student.option).trim(),
  })
  count++
  console.log(`✓ [${count}/${students.length}] ${matric} — ${student.name}`)
}

console.log(`\n✅ Done! All ${count} students uploaded.`)
