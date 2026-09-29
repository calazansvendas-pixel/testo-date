import { useState } from 'react'
import { toDateTimeLocalValue } from '../lib/dates.js'

export default function DoseForm({ dose, suggestedDate, onSave, onClose, saving }) {
  const [dataHora, setDataHora] = useState(toDateTimeLocalValue(dose?.dataHora ?? suggestedDate))
  const [status, setStatus] = useState(dose?.status ?? 'Pendente')
  const [observacao, setObservacao] = useState(dose?.observacao ?? '')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const selectedDate = new Date(dataHora)

    if (!dataHora || Number.isNaN(selectedDate.getTime())) {
      setError('Informe uma data e um horário válidos.')
      return
    }

    setError('')
    onSave({
      dataHora: selectedDate.toISOString(),
      status,
      observacao: observacao.trim(),
    })
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="dose-form-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">REGISTRO</p>
            <h2 id="dose-form-title">{dose ? 'Editar aplicação' : 'Nova aplicação'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar formulário">×</button>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <label className="field-label" htmlFor="dose-date">Data e horário</label>
          <input
            autoFocus
            id="dose-date"
            className="text-input"
            type="datetime-local"
            value={dataHora}
            onChange={(event) => setDataHora(event.target.value)}
            required
          />
          <p className="field-hint">A sugestão pode ser alterada antes de salvar.</p>

          {dose && (
            <>
              <label className="field-label" htmlFor="dose-status">Status</label>
              <select id="dose-status" className="text-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="Pendente">Pendente</option>
                <option value="Concluído">Concluído</option>
              </select>
            </>
          )}

          <label className="field-label" htmlFor="dose-note">Observação</label>
          <textarea
            id="dose-note"
            className="text-input text-area"
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            maxLength={4000}
            placeholder="Anotações opcionais"
            rows={4}
          />

          {error && <p className="inline-error" role="alert">{error}</p>}

          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar aplicação'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}