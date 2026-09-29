import assert from 'node:assert/strict'
import test from 'node:test'
import { addCalendarDays, getSuggestedDoseDate, toDateTimeLocalValue } from './dates.js'

test('adds ten calendar days and preserves the local time', () => {
  const base = new Date(2026, 0, 25, 14, 35)
  const suggested = addCalendarDays(base, 10)

  assert.equal(suggested.getFullYear(), 2026)
  assert.equal(suggested.getMonth(), 1)
  assert.equal(suggested.getDate(), 4)
  assert.equal(suggested.getHours(), 14)
  assert.equal(suggested.getMinutes(), 35)
})

test('uses the most recent completed dose and ignores pending doses', () => {
  const doses = [
    { dataHora: '2026-03-01T12:00:00.000Z', status: 'Concluído' },
    { dataHora: '2026-03-20T12:00:00.000Z', status: 'Pendente' },
    { dataHora: '2026-03-05T12:00:00.000Z', status: 'Concluído' },
  ]

  const suggested = new Date(getSuggestedDoseDate(doses))
  const latest = new Date('2026-03-05T12:00:00.000Z')
  latest.setDate(latest.getDate() + 10)

  assert.equal(suggested.getTime(), latest.getTime())
})

test('formats a date for the editable local date and time field', () => {
  const value = toDateTimeLocalValue(new Date(2026, 5, 9, 8, 7))

  assert.equal(value, '2026-06-09T08:07')
})