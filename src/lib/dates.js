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

export function formatWeekday(dateValue) {
  const formatted = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(dateValue))
  return formatted
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-')
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

export function getSuggestedNextSide(doses) {
  const latestDose = doses
    .slice()
    .sort((first, second) => new Date(second.dataHora) - new Date(first.dataHora))[0]

  const lastSide = latestDose?.side === 'Esquerdo' ? 'Esquerdo' : 'Direito'
  return lastSide === 'Direito' ? 'Esquerdo' : 'Direito'
}