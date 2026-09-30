import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { auth, authorizedEmail, firebaseReady } from './firebaseConfig.js'
import { createDose, deleteDose, subscribeToDoses, updateDose } from './features/doses/doseService.js'
import { createLocalDose, deleteLocalDose, readLocalDoses, updateLocalDose, writeLocalDoses } from './features/doses/localDoseStore.js'
import ConfirmDialog from './components/ConfirmDialog.jsx'
import DoseForm from './components/DoseForm.jsx'
import { getSuggestedDoseDate, getSuggestedNextSide, toDateTimeLocalValue } from './lib/dates.js'
import { playAlertTone, showDoseNotification } from './lib/notifications.js'
import './App.css'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function formatFullDate(date) {
  const formatted = dateFormatter.format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatCountdown(date, now) {
  const remaining = new Date(date).getTime() - now.getTime()
  if (remaining <= 0) return 'Data prevista alcançada'

  const totalMinutes = Math.floor(remaining / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `Em ${days} dia${days === 1 ? '' : 's'} e ${hours}h`
  if (hours > 0) return `Em ${hours}h e ${minutes}min`
  return `Em ${Math.max(minutes, 1)} min`
}

function authErrorMessage(error) {
  switch (error?.code) {
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no Firebase Authentication. Adicione localhost ou o domínio atual em Configurações > Domínios autorizados.'
    case 'auth/operation-not-allowed':
      return 'O provedor Google não está ativado em Firebase Authentication > Método de login.'
    case 'auth/network-request-failed':
      return 'Não foi possível contatar o Firebase Authentication. Verifique a conexão e tente novamente.'
    case 'auth/popup-closed-by-user':
      return 'A janela do Google foi fechada antes de concluir o login. Tente novamente.'
    default:
      return 'Não foi possível concluir o login Google. Confira o provedor Google e os domínios autorizados no Firebase Console.'
  }
}

function firestoreErrorMessage(error) {
  switch (error?.code) {
    case 'permission-denied':
      return 'O login foi concluído, mas o Firestore negou o acesso. Publique firestore.rules e confirme o e-mail autorizado e o UID do usuário.'
    case 'not-found':
      return 'O Firebase não encontrou o banco Firestore. Crie o banco Cloud Firestore no projeto Firebase antes de usar a nuvem.'
    case 'unavailable':
    case 'deadline-exceeded':
      return 'O Firestore está indisponível ou sem conexão. Os dados existentes foram mantidos e novos registros serão salvos neste dispositivo.'
    case 'failed-precondition':
      return 'O Firestore ainda não está pronto. Verifique se o banco foi criado e se as regras foram publicadas.'
    default:
      return 'Não foi possível carregar ou salvar os dados no Firestore. O app manterá os registros localmente neste dispositivo.'
  }
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status === 'Concluído' ? 'status-complete' : 'status-pending'}`}>{status}</span>
}

function SideBadge({ side }) {
  const colorClass = side === 'Direito' ? 'side-right' : 'side-left'
  return <span className={`side-badge ${colorClass}`}>{side === 'Direito' ? 'Direito' : 'Esquerdo'}</span>
}

function DoseRow({ dose, onEdit, onDelete, onToggleStatus }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(dose.dataHora)

  return (
    <article className={`dose-row ${expanded ? 'dose-row-expanded' : ''}`}>
      <button className="dose-row-main" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="dose-date-marker" aria-hidden="true"><span /></span>
        <span className="dose-row-date">
          <strong>{formatFullDate(date)}</strong>
          <small>às {timeFormatter.format(date)}</small>
          <small className="dose-meta-row"><SideBadge side={dose.side || 'Direito'} /> {dose.localOnly && <span className="local-storage-note">Somente neste dispositivo</span>}</small>
        </span>
        <StatusBadge status={dose.status} />
        <span className={`chevron ${expanded ? 'chevron-open' : ''}`} aria-hidden="true">⌄</span>
      </button>
      {expanded && (
        <div className="dose-row-details">
          <p className="dose-note">{dose.observacao || 'Sem observações.'}</p>
          <div className="dose-row-actions">
            <button className="text-action" type="button" onClick={() => onToggleStatus(dose)}>
              Marcar como {dose.status === 'Pendente' ? 'concluído' : 'pendente'}
            </button>
            <button className="text-action" type="button" onClick={() => onEdit(dose)}>Editar</button>
            <button className="text-action text-action-danger" type="button" onClick={() => onDelete(dose)}>Excluir</button>
          </div>
        </div>
      )}
    </article>
  )
}

function LoginScreen({ error, errorDetails, onLogin, busy, googleAvailable }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand-wrap">
          <img className="login-logo" src="/assets/logo-calazans.png" alt="Calazans Vendas" />
        </div>

        <div className="login-heading-block">
          <p className="eyebrow">REGISTRO PESSOAL</p>
          <h1>Controle de Aplicações</h1>
        </div>

        {error && <p className="inline-error" role="alert">{error}</p>}
        {errorDetails && <details className="error-details"><summary>Detalhes técnicos</summary><code>{errorDetails}</code></details>}

        <div className="login-options">
          <button className="button button-primary login-button" type="button" onClick={onLogin} disabled={busy || !googleAvailable}>
            <GoogleMark />
            {busy ? 'Abrindo acesso…' : 'Continuar com Google'}
          </button>
          {!googleAvailable && <p className="field-hint">Configure o Firebase para ativar o acesso Google.</p>}
        </div>
      </section>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.2-1.8 13.6-4.9L31 34a12.2 12.2 0 0 1-18.2-6.4H6v5.3A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.6a12 12 0 0 1 0-7.2v-5.3H6a20 20 0 0 0 0 17.8l6.8-5.3Z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 6 15.1l6.8 5.3A12 12 0 0 1 24 12.1Z" />
    </svg>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [doses, setDoses] = useState([])
  const [loadingDoses, setLoadingDoses] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState('')
  const [notice, setNotice] = useState('')
  const [storageMode, setStorageMode] = useState('connecting')
  const [formDose, setFormDose] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('testo-date-theme') === 'dark')
  const [now, setNow] = useState(() => new Date())
  const [notificationPermission, setNotificationPermission] = useState(() => (
    'Notification' in window ? Notification.permission : 'unsupported'
  ))
  const [installPrompt, setInstallPrompt] = useState(null)

  function reportFailure(stage, failure, userMessage) {
    const code = failure?.code || failure?.name || 'unknown'
    const message = failure?.message || String(failure)
    const details = `${stage} · ${code}: ${message}`

    console.error(`[testo-date] ${stage}`, { code, message, stack: failure?.stack }, failure)
    setError(userMessage || 'Ocorreu um erro inesperado. Consulte os detalhes técnicos e tente novamente.')
    setErrorDetails(details)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('testo-date-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    if (localStorage.getItem('testo-date-local-mode') === 'true') {
      setUser({ uid: 'local-calazans', displayName: 'Calazans', localMode: true })
      setAuthLoading(false)
      return undefined
    }

    if (!firebaseReady || !auth) {
      setAuthLoading(false)
      return undefined
    }

    let active = true
    const redirectPending = sessionStorage.getItem('testo-date-auth-pending') === 'google'

    setPersistence(auth, browserLocalPersistence).catch((persistenceError) => {
      console.warn('[testo-date] Firebase Auth / persistence local falhou', persistenceError)
    })

    getRedirectResult(auth)
      .then((result) => {
        if (!active) return
        console.info('[testo-date] Firebase Auth / resultado do redirect', {
          returnedUser: Boolean(result?.user),
          currentUser: Boolean(auth.currentUser),
        })

        if (result?.user) {
          const userEmail = result.user.email?.toLowerCase()
          if (userEmail !== authorizedEmail) {
            sessionStorage.removeItem('testo-date-auth-pending')
            setUser(null)
            reportFailure(
              'Firebase Auth / conta não autorizada',
              new Error('A conta autenticada difere de VITE_AUTHORIZED_EMAIL.'),
              'Esta conta Google não está autorizada. Entre com o e-mail configurado para este app.',
            )
            signOut(auth).catch((signOutError) => reportFailure('Firebase Auth / encerrar conta não autorizada', signOutError))
            return
          }

          sessionStorage.removeItem('testo-date-auth-pending')
          setError('')
          setErrorDetails('')
          setUser(result.user)
          setAuthLoading(false)
          return
        }

        if (auth.currentUser) {
          sessionStorage.removeItem('testo-date-auth-pending')
          setError('')
          setErrorDetails('')
          setUser(auth.currentUser)
          setAuthLoading(false)
          return
        }

        if (redirectPending) {
          sessionStorage.removeItem('testo-date-auth-pending')
        }
      })
      .catch((authError) => {
        if (!active) return
        if (auth.currentUser) {
          sessionStorage.removeItem('testo-date-auth-pending')
          setError('')
          setErrorDetails('')
          setUser(auth.currentUser)
          setAuthLoading(false)
          return
        }
        if (authError?.code || authError?.message) {
          sessionStorage.removeItem('testo-date-auth-pending')
          reportFailure('Firebase Auth / retorno Google', authError, authErrorMessage(authError))
        }
      })

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return
      console.info('[testo-date] Firebase Auth / estado observado', {
        signedIn: Boolean(nextUser),
        emailVerified: nextUser?.emailVerified ?? false,
      })

      if (nextUser && nextUser.email?.toLowerCase() !== authorizedEmail) {
        setUser(null)
        sessionStorage.removeItem('testo-date-auth-pending')
        reportFailure(
          'Firebase Auth / conta não autorizada',
          new Error('A conta autenticada difere de VITE_AUTHORIZED_EMAIL.'),
          'Esta conta Google não está autorizada. Entre com o e-mail configurado para este app.',
        )
        await signOut(auth).catch((signOutError) => reportFailure('Firebase Auth / encerrar conta não autorizada', signOutError))
        setAuthLoading(false)
        return
      }

      if (nextUser) {
        sessionStorage.removeItem('testo-date-auth-pending')
        setError('')
        setErrorDetails('')
        setUser(nextUser)
        setAuthLoading(false)
        return
      }

      if (!redirectPending) {
        setAuthLoading(false)
      }
    }, (authError) => {
      if (!active) return
      reportFailure('Firebase Auth / observar sessão', authError, authErrorMessage(authError))
      setAuthLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setDoses([])
      setStorageMode('connecting')
      return undefined
    }

    if (user.localMode) {
      setDoses(readLocalDoses(user.uid))
      setStorageMode('local')
      setLoadingDoses(false)
      return undefined
    }

    const cachedDoses = readLocalDoses(user.uid)
    setDoses(cachedDoses)
    setStorageMode('connecting')
    setLoadingDoses(true)
    try {
      return subscribeToDoses(user.uid, (records, metadata) => {
        const localOnly = readLocalDoses(user.uid).filter((dose) => dose.localOnly)
        const recordIds = new Set(records.map((dose) => dose.id))
        const mergedRecords = [
          ...records.map((dose) => ({ ...dose, localOnly: false })),
          ...localOnly.filter((dose) => !recordIds.has(dose.id)),
        ].sort((first, second) => new Date(second.dataHora) - new Date(first.dataHora))

        setDoses(mergedRecords)
        setStorageMode(metadata.fromCache ? 'offline' : 'cloud')
        setLoadingDoses(false)
        try {
          writeLocalDoses(user.uid, mergedRecords)
        } catch (cacheError) {
          reportFailure('Armazenamento local / atualizar cache', cacheError, 'O Firestore respondeu, mas o cache deste dispositivo não pôde ser atualizado.')
        }
      }, (firestoreError) => {
        reportFailure('Firestore / carregar histórico', firestoreError, firestoreErrorMessage(firestoreError))
        setStorageMode('local')
        setDoses(readLocalDoses(user.uid))
        setLoadingDoses(false)
      })
    } catch (firestoreError) {
      reportFailure('Firestore / iniciar consulta', firestoreError, firestoreErrorMessage(firestoreError))
      setStorageMode('local')
      setLoadingDoses(false)
      return undefined
    }
  }, [user])

  useEffect(() => {
    function handleWindowError(event) {
      reportFailure('JavaScript / erro não tratado', event.error || new Error(event.message))
    }

    function handleUnhandledRejection(event) {
      reportFailure('JavaScript / Promise rejeitada sem tratamento', event.reason)
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    function captureInstallPrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
  }, [])

  useEffect(() => {
    if (!user || !doses.length) return undefined

    async function alertForDueDoses() {
      if (document.visibilityState !== 'visible') return
      const dueDoses = doses.filter((dose) => dose.status === 'Pendente' && new Date(dose.dataHora) <= new Date())

      for (const dose of dueDoses) {
        const alertKey = `testo-date-alerted-${dose.id}`
        if (sessionStorage.getItem(alertKey)) continue
        sessionStorage.setItem(alertKey, 'true')
        playAlertTone().catch(() => {})
        showDoseNotification('Aplicação pendente', 'Há uma data de aplicação pendente no seu histórico.', dose.id).catch(() => {})
      }
    }

    alertForDueDoses()
    const timer = window.setInterval(alertForDueDoses, 60000)
    document.addEventListener('visibilitychange', alertForDueDoses)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', alertForDueDoses)
    }
  }, [doses, user])

  const completedDoses = doses.filter((dose) => dose.status === 'Concluído')
  const pendingDoses = doses
    .filter((dose) => dose.status === 'Pendente')
    .sort((first, second) => new Date(first.dataHora) - new Date(second.dataHora))
  const latestCompleted = completedDoses.reduce((latest, dose) => (
    !latest || new Date(dose.dataHora) > new Date(latest.dataHora) ? dose : latest
  ), null)
  const forecast = !pendingDoses.length && latestCompleted
    ? { dataHora: getSuggestedDoseDate(doses), status: 'Pendente', forecast: true, side: getSuggestedNextSide(doses) }
    : null
  const nextDose = pendingDoses[0] ?? forecast
  const suggestedNextSide = nextDose?.side || getSuggestedNextSide(doses)

  async function handleLogin() {
    if (!firebaseReady || !auth) return
    setAuthBusy(true)
    setAuthLoading(true)
    setError('')
    setErrorDetails('')
    try {
      await setPersistence(auth, browserLocalPersistence)
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        || window.matchMedia('(max-width: 768px)').matches
        || window.matchMedia('(display-mode: standalone)').matches
      const shouldUsePopup = window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || !isMobile

      if (shouldUsePopup) {
        const result = await signInWithPopup(auth, provider)
        if (result?.user?.email?.toLowerCase() !== authorizedEmail) {
          throw new Error('A conta autenticada não está autorizada para este app.')
        }
        setUser(result.user)
        setError('')
        setErrorDetails('')
        setAuthLoading(false)
        return
      }

      try {
        const result = await signInWithPopup(auth, provider)
        if (result?.user?.email?.toLowerCase() !== authorizedEmail) {
          throw new Error('A conta autenticada não está autorizada para este app.')
        }
        setUser(result.user)
        setError('')
        setErrorDetails('')
        setAuthLoading(false)
      } catch (popupError) {
        if (popupError?.code === 'auth/popup-blocked' || popupError?.code === 'auth/popup-closed-by-user' || popupError?.message?.includes('popup')) {
          sessionStorage.setItem('testo-date-auth-pending', 'google')
          console.info('[testo-date] Firebase Auth / popup bloqueado, usando redirect', {
            code: popupError?.code,
            message: popupError?.message,
            isMobile,
            hostname: window.location.hostname,
          })
          await signInWithRedirect(auth, provider)
          return
        }
        throw popupError
      }
    } catch (authError) {
      sessionStorage.removeItem('testo-date-auth-pending')
      reportFailure('Firebase Auth / iniciar login Google', authError, authErrorMessage(authError))
      setAuthLoading(false)
    } finally {
      setAuthBusy(false)
    }
  }

  function handleLocalLogin() {
    try {
      localStorage.setItem('testo-date-local-mode', 'true')
      sessionStorage.removeItem('testo-date-auth-pending')
      setError('')
      setErrorDetails('')
      setUser({ uid: 'local-calazans', displayName: 'Calazans', localMode: true })
      setStorageMode('local')
      setNotice('Sessão local iniciada. Seus registros ficam neste dispositivo.')
    } catch (storageError) {
      reportFailure('localStorage / iniciar modo local', storageError, 'O navegador bloqueou o armazenamento local. Ative o armazenamento deste site e tente novamente.')
    }
  }

  async function handleSignOut() {
    if (user?.localMode) {
      localStorage.removeItem('testo-date-local-mode')
      setUser(null)
      setStorageMode('connecting')
      setError('')
      setErrorDetails('')
      setNotice('Sessão local encerrada.')
      return
    }

    try {
      sessionStorage.removeItem('testo-date-auth-pending')
      if (auth) await signOut(auth)
      setUser(null)
      setError('')
      setErrorDetails('')
      setNotice('Sessão encerrada.')
    } catch (authError) {
      setError(authError.message)
    }
  }

  async function handleSaveDose(changes) {
    if (!user) return
    setSaving(true)
    setError('')
    setErrorDetails('')
    try {
      if (storageMode === 'local' || formDose?.localOnly) {
        persistLocalDose(changes, formDose?.id)
        setNotice('Registro salvo somente neste dispositivo.')
      } else if (formDose?.id) {
        await updateDose(user.uid, formDose.id, changes)
        setNotice('Aplicação atualizada.')
      } else {
        await createDose(user.uid, changes)
        setNotice('Aplicação registrada.')
      }
      setFormOpen(false)
    } catch (saveError) {
      reportFailure('Firestore / salvar aplicação', saveError, `${firestoreErrorMessage(saveError)} Salvando a alteração localmente.`)
      setStorageMode('local')
      try {
        persistLocalDose(changes, formDose?.id)
        setFormOpen(false)
        setNotice('Registro salvo somente neste dispositivo.')
      } catch (localError) {
        reportFailure('localStorage / salvar aplicação', localError, 'O Firestore falhou e o navegador também não conseguiu gravar localmente. Exporte ou copie os dados antes de fechar esta página.')
      }
    } finally {
      setSaving(false)
    }
  }

  function persistLocalDose(changes, doseId) {
    let dose
    if (doseId) {
      dose = updateLocalDose(user.uid, doseId, changes)
      if (!dose) {
        const currentDose = doses.find((record) => record.id === doseId)
        if (!currentDose) throw new Error(`Registro ${doseId} não existe no cache local.`)
        dose = { ...currentDose, ...changes, localOnly: true }
        writeLocalDoses(user.uid, [dose, ...readLocalDoses(user.uid).filter((record) => record.id !== doseId)])
      }
    } else {
      dose = createLocalDose(user.uid, changes)
    }

    setDoses(readLocalDoses(user.uid).sort((first, second) => new Date(second.dataHora) - new Date(first.dataHora)))
    setStorageMode('local')
    return dose
  }

  async function handleToggleStatus(dose) {
    const changes = { status: dose.status === 'Pendente' ? 'Concluído' : 'Pendente' }
    try {
      if (storageMode === 'local' || dose.localOnly) {
        persistLocalDose(changes, dose.id)
        setNotice('Status atualizado somente neste dispositivo.')
      } else {
        await updateDose(user.uid, dose.id, changes)
        setNotice(`Status alterado para ${changes.status}.`)
      }
    } catch (updateError) {
      reportFailure('Firestore / alterar status', updateError, `${firestoreErrorMessage(updateError)} Salvando a alteração localmente.`)
      setStorageMode('local')
      try {
        persistLocalDose(changes, dose.id)
        setNotice('Status atualizado somente neste dispositivo.')
      } catch (localError) {
        reportFailure('localStorage / alterar status', localError, 'Não foi possível salvar a alteração localmente.')
      }
    }
  }

  async function handleDeleteDose() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      if (storageMode === 'local' || deleteTarget.localOnly) {
        deleteLocalDose(user.uid, deleteTarget.id)
        setDoses(readLocalDoses(user.uid))
        setNotice('Registro removido somente deste dispositivo.')
      } else {
        await deleteDose(user.uid, deleteTarget.id)
        setNotice('Aplicação excluída.')
      }
      setDeleteTarget(null)
    } catch (deleteError) {
      reportFailure('Firestore / excluir aplicação', deleteError, `${firestoreErrorMessage(deleteError)} Removendo o registro apenas deste dispositivo.`)
      setStorageMode('local')
      try {
        deleteLocalDose(user.uid, deleteTarget.id)
        setDoses(readLocalDoses(user.uid))
        setDeleteTarget(null)
      } catch (localError) {
        reportFailure('localStorage / excluir aplicação', localError, 'Não foi possível remover o registro localmente.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleNotificationTest() {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      setNotice('Este navegador não oferece notificações.')
      return
    }

    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    setNotificationPermission(permission)
    if (permission === 'granted') {
      try {
        await showDoseNotification('testo-date', 'Notificação de teste recebida.', 'testo-date-test')
        setNotice('Notificação de teste enviada.')
      } catch {
        setNotice('Não foi possível exibir a notificação neste dispositivo.')
      }
    } else {
      setNotice(permission === 'denied' ? 'Permissão bloqueada nas configurações do navegador.' : 'Permissão não concedida.')
    }
  }

  async function handleSoundTest() {
    try {
      await playAlertTone()
      setNotice('Som de teste reproduzido.')
    } catch {
      setNotice('Não foi possível reproduzir o som neste navegador.')
    }
  }

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  function openNewDose() {
    setFormDose(null)
    setFormOpen(true)
  }

  function openEditDose(dose) {
    setFormDose(dose)
    setFormOpen(true)
  }

  if (authLoading) {
    const isRedirectProcessing = sessionStorage.getItem('testo-date-auth-pending') === 'google'
    return (
      <main className="loading-screen">
        <span className="loading-mark" />
        <p>{isRedirectProcessing ? 'Autenticando sessão...' : 'Carregando seus registros'}</p>
        {error && <p className="inline-error" role="alert">{error}</p>}
        {errorDetails && <details className="error-details"><summary>Detalhes técnicos</summary><code>{errorDetails}</code></details>}
      </main>
    )
  }

  if (!user) return (
    <LoginScreen
      error={error}
      errorDetails={errorDetails}
      onLogin={handleLogin}
      busy={authBusy}
      googleAvailable={firebaseReady}
    />
  )

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#inicio" aria-label="testo-date início">
          <img className="brand-symbol" src="/assets/logo-calazans.png" alt="" aria-hidden="true" />
          <span>testo<span className="brand-dot">.</span>date</span>
        </a>
        <div className="topbar-actions">
          {installPrompt && <button className="button button-secondary install-button" type="button" onClick={handleInstall}>Instalar app</button>}
          <button className="icon-button theme-button" type="button" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'} title={darkMode ? 'Modo claro' : 'Modo escuro'}>
            {darkMode ? '☼' : '☾'}
          </button>
          <div className="account-menu">
            <button className="account-button" type="button" title="Perfil da conta">
              <span className="account-avatar">{user.displayName?.charAt(0) ?? 'U'}</span>
              <span className="account-name">{user.displayName?.split(' ')[0] ?? 'Conta'}</span>
              <span className="signout-icon" aria-hidden="true">▾</span>
            </button>
            <button className="account-menu-action" type="button" onClick={handleSignOut}>Sair</button>
          </div>
        </div>
      </header>

      <div className="content-wrap" id="inicio">
        <section className="page-heading">
          <div>
            <p className="eyebrow">ACOMPANHAMENTO PESSOAL</p>
            <h1>Aplicações</h1>
            <p className="page-subtitle">Seu calendário, claro e sob seu controle.</p>
          </div>
          <button className="button button-primary add-button" type="button" onClick={openNewDose}>
            <span aria-hidden="true">＋</span> Registrar aplicação
          </button>
        </section>

        {storageMode === 'connecting' && (
          <div className="storage-banner storage-connecting" role="status">
            Verificando o Firestore. O cache deste dispositivo será mantido enquanto a conexão é avaliada.
          </div>
        )}
        {storageMode === 'offline' && (
          <div className="storage-banner storage-offline" role="status">
            Sem conexão com a nuvem. Exibindo o cache local do Firestore; alterações pendentes podem sincronizar quando a conexão voltar.
          </div>
        )}
        {storageMode === 'local' && (
          <div className="storage-banner storage-local" role="status">
            Modo local ativo. Registros novos ou alterados ficam apenas neste navegador e não são sincronizados automaticamente.
          </div>
        )}

        {(error || notice) && (
          <div className={error ? 'feedback feedback-error' : 'feedback feedback-success'} role={error ? 'alert' : 'status'}>
            <div className="feedback-copy">
              <span>{error || notice}</span>
              {errorDetails && <details className="error-details"><summary>Detalhes técnicos</summary><code>{errorDetails}</code></details>}
            </div>
            <button className="feedback-close" type="button" onClick={() => { setError(''); setErrorDetails(''); setNotice('') }} aria-label="Fechar aviso">×</button>
          </div>
        )}

        <section className="overview-grid" aria-label="Resumo e alertas">
          <article className="next-card">
            <div className="next-card-topline">
              <div className="next-icon" aria-hidden="true"><span /></div>
              <span className="next-label">{nextDose?.forecast ? 'PRÓXIMA ESTIMADA' : 'PRÓXIMA APLICAÇÃO'}</span>
              {nextDose && <StatusBadge status={nextDose.status} />}
            </div>
            {nextDose ? (
              <>
                <p className="countdown">{formatCountdown(nextDose.dataHora, now)}</p>
                <h2>{formatFullDate(new Date(nextDose.dataHora))}</h2>
                <p className="next-time">às {timeFormatter.format(new Date(nextDose.dataHora))}</p>
                <p className="next-side-suggestion">Próximo lado sugerido: {suggestedNextSide === 'Direito' ? 'Lado Direito' : 'Lado Esquerdo'}</p>
                {nextDose.forecast && <p className="forecast-note">Previsão calculada a partir da última aplicação concluída + 10 dias.</p>}
                {!nextDose.forecast && nextDose.observacao && <p className="next-note">{nextDose.observacao}</p>}
                <button className="next-edit" type="button" onClick={() => nextDose.forecast ? openNewDose() : openEditDose(nextDose)}>
                  {nextDose.forecast ? 'Criar registro para esta data' : 'Editar aplicação'} <span aria-hidden="true">↗</span>
                </button>
              </>
            ) : (
              <div className="empty-next">
                <h2>Nenhuma aplicação registrada</h2>
                <p>Registre uma aplicação para iniciar seu histórico.</p>
                <button className="next-edit" type="button" onClick={openNewDose}>Registrar primeira dose <span aria-hidden="true">↗</span></button>
              </div>
            )}
          </article>

          <aside className="tools-panel">
            <div>
              <p className="eyebrow">LEMBRETES</p>
              <h2>Testar alertas</h2>
              <p className="tools-copy">Alertas automáticos funcionam quando o app está aberto. Em segundo plano, o sistema pode suspender a execução.</p>
            </div>
            <button className="tool-row" type="button" onClick={handleSoundTest}>
              <span className="tool-symbol sound-symbol" aria-hidden="true">♪</span>
              <span><strong>Som de alerta</strong><small>Reproduzir teste</small></span>
              <span className="tool-arrow" aria-hidden="true">↗</span>
            </button>
            <button className="tool-row" type="button" onClick={handleNotificationTest}>
              <span className="tool-symbol notification-symbol" aria-hidden="true">◉</span>
              <span><strong>Notificação</strong><small>{notificationPermissionLabel(notificationPermission)}</small></span>
              <span className="tool-arrow" aria-hidden="true">↗</span>
            </button>
          </aside>
        </section>

        <section className="history-section" id="historico">
          <div className="section-heading">
            <div>
              <p className="eyebrow">REGISTROS</p>
              <h2>Histórico</h2>
            </div>
            <span className="record-count">{doses.length} {doses.length === 1 ? 'registro' : 'registros'}</span>
          </div>

          {loadingDoses ? (
            <div className="history-empty"><span className="loading-mark" /><p>Carregando histórico…</p></div>
          ) : doses.length ? (
            <div className="history-list">
              {doses.map((dose) => (
                <DoseRow key={dose.id} dose={dose} onEdit={openEditDose} onDelete={setDeleteTarget} onToggleStatus={handleToggleStatus} />
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <span className="empty-mark" aria-hidden="true">＋</span>
              <h3>Seu histórico começa aqui</h3>
              <p>Os registros salvos aparecerão nesta lista.</p>
              <button className="button button-secondary" type="button" onClick={openNewDose}>Adicionar aplicação</button>
            </div>
          )}
        </section>

        <footer className="app-footer">
          <span>testo.date</span>
          <span>Intervalo sugerido: 10 dias corridos. Datas sempre editáveis.</span>
        </footer>
      </div>

      {formOpen && (
        <DoseForm
          dose={formDose}
          suggestedDate={getSuggestedDoseDate(doses)}
          onSave={handleSaveDose}
          onClose={() => setFormOpen(false)}
          saving={saving}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Excluir aplicação?"
          message="Este registro será removido permanentemente do seu histórico. Esta ação não pode ser desfeita."
          onConfirm={handleDeleteDose}
          onClose={() => setDeleteTarget(null)}
          busy={saving}
        />
      )}
    </main>
  )
}

function notificationPermissionLabel(permission) {
  if (permission === 'granted') return 'Permissão ativada · testar'
  if (permission === 'denied') return 'Bloqueada nas configurações'
  if (permission === 'unsupported') return 'Não disponível neste navegador'
  return 'Permissão não solicitada · testar'
}

export default App