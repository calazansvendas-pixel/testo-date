import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebaseConfig.js'

function doseCollection(userId) {
  return collection(db, 'users', userId, 'doses')
}

export function subscribeToDoses(userId, onDoses, onError) {
  const dosesQuery = query(doseCollection(userId), orderBy('dataHora', 'desc'))

  return onSnapshot(dosesQuery, { includeMetadataChanges: true }, (snapshot) => {
    onDoses(
      snapshot.docs.map((dose) => ({ id: dose.id, ...dose.data() })),
      { fromCache: snapshot.metadata.fromCache },
    )
  }, onError)
}

export async function createDose(userId, dose) {
  const doseRef = doc(doseCollection(userId))
  return setDoc(doseRef, {
    ...dose,
    id: doseRef.id,
    dataCriacao: serverTimestamp(),
  })
}

export function updateDose(userId, doseId, changes) {
  return updateDoc(doc(db, 'users', userId, 'doses', doseId), changes)
}

export function deleteDose(userId, doseId) {
  return deleteDoc(doc(db, 'users', userId, 'doses', doseId))
}