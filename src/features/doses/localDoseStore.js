function storageKey(userId) {
  return `testo-date-doses-${userId}`
}

export function readLocalDoses(userId) {
  try {
    const value = localStorage.getItem(storageKey(userId))
    const doses = value ? JSON.parse(value) : []
    return Array.isArray(doses) ? doses : []
  } catch (error) {
    console.error('[testo-date] Não foi possível ler os registros locais.', error)
    return []
  }
}

export function writeLocalDoses(userId, doses) {
  localStorage.setItem(storageKey(userId), JSON.stringify(doses))
}

export function createLocalDose(userId, changes) {
  const dose = {
    ...changes,
    id: crypto.randomUUID(),
    dataCriacao: new Date().toISOString(),
    localOnly: true,
  }

  writeLocalDoses(userId, [dose, ...readLocalDoses(userId)])
  return dose
}

export function updateLocalDose(userId, doseId, changes) {
  const doses = readLocalDoses(userId)
  let updatedDose
  const nextDoses = doses.map((dose) => {
    if (dose.id !== doseId) return dose
    updatedDose = { ...dose, ...changes, localOnly: true }
    return updatedDose
  })

  if (updatedDose) writeLocalDoses(userId, nextDoses)
  return updatedDose
}

export function deleteLocalDose(userId, doseId) {
  writeLocalDoses(userId, readLocalDoses(userId).filter((dose) => dose.id !== doseId))
}