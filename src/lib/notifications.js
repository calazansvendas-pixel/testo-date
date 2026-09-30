let audioContext

export async function playAlertTone() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) throw new Error('Este navegador não oferece áudio Web Audio.')

  audioContext ??= new AudioContextClass()
  if (audioContext.state === 'suspended') await audioContext.resume()

  const startAt = audioContext.currentTime
  ;[660, 880, 660].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const noteStart = startAt + index * 0.2

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.16)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + 0.17)
  })
}

export async function showDoseNotification(title, body, tag) {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, { body, icon: '/assets/logo-calazans.png', tag })
}