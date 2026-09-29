export function addCalendarDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function toDateTimeLocalValue(date) {
  const value = new Date(date)
  const pad = (part) => String(part).padStart(2, '0')

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export function getSuggestedDoseDate(doses, now = new Date()) {
  const latestCompleted = doses
    .filter((dose) => dose.status === 'Concluído')
    .reduce((latest, dose) => {
      if (!latest || new Date(dose.dataHora) > new Date(latest.dataHora)) return dose
      return latest
    }, null)

  return addCalendarDays(latestCompleted ? latestCompleted.dataHora : now, 10).toISOString()
}