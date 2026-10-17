import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export async function saveScore(name, score) {
  await addDoc(collection(db, 'scores'), {
    name: name.trim().slice(0, 20),
    score: Math.round(score),
    createdAt: serverTimestamp(),
  })
}

export async function getTopScores(n = 10) {
  const scoresQuery = query(collection(db, 'scores'), orderBy('score', 'desc'), limit(n))
  const snapshot = await getDocs(scoresQuery)
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
}
