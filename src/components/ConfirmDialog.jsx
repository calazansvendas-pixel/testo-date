import { useEffect } from 'react'

export default function ConfirmDialog({ title, message, onConfirm, onClose, busy }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="dialog-panel confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">AÇÃO PERMANENTE</p>
            <h2 id="confirm-title">{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Fechar confirmação">×</button>
        </div>
        <p className="dialog-copy">{message}</p>
        <div className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose} disabled={busy}>Manter registro</button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Excluindo…' : 'Excluir definitivamente'}
          </button>
        </div>
      </section>
    </div>
  )
}