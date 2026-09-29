import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'
import { createLocalDose, deleteLocalDose, readLocalDoses, updateLocalDose } from './localDoseStore.js'

const values = new Map()
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}

beforeEach(() => values.clear())

test('stores fallback doses under the authenticated user key', () => {
  const created = createLocalDose('user-1', {
    dataHora: '2026-06-09T08:07:00.000Z',
    status: 'Pendente',
    observacao: 'Anotação local',
  })

  assert.equal(created.localOnly, true)
  assert.equal(readLocalDoses('user-1')[0].id, created.id)
  assert.deepEqual(readLocalDoses('user-2'), [])
})

test('updates and deletes a local dose', () => {
  const created = createLocalDose('user-1', {
    dataHora: '2026-06-09T08:07:00.000Z',
    status: 'Pendente',
    observacao: '',
  })

  const updated = updateLocalDose('user-1', created.id, { status: 'Concluído' })
  assert.equal(updated.status, 'Concluído')
  assert.equal(updated.localOnly, true)

  deleteLocalDose('user-1', created.id)
  assert.deepEqual(readLocalDoses('user-1'), [])
})