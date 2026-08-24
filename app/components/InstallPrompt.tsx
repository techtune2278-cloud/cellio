'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) return

    const wasDismissed = localStorage.getItem('cellio_install_dismissed')
    if (wasDismissed) return

    setDismissed(false)

    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    if (isIos) {
      setShowIosInstructions(true)
      return
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    handleDismiss()
  }

  const handleDismiss = () => {
    localStorage.setItem('cellio_install_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed) return null
  if (!deferredPrompt && !showIosInstructions) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-white border border-slate-200 shadow-lg rounded-2xl p-4 flex items-start gap-3">
      <img src="/icon-192.png" alt="CELLIO" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1">
        {showIosInstructions ? (
          <>
            <p className="text-sm font-bold text-slate-800">Installer CELLIO</p>
            <p className="text-xs text-slate-500 mt-1">
              Appuie sur <span className="font-semibold">Partager</span> (icône carrée avec flèche) puis
              <span className="font-semibold"> « Sur l'écran d'accueil »</span>.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-slate-800">Installer CELLIO</p>
            <p className="text-xs text-slate-500 mt-1">Accède à ta cave en un tap depuis ton écran d'accueil.</p>
            <button
              onClick={handleInstallClick}
              className="mt-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
            >
              Installer
            </button>
          </>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="text-slate-300 hover:text-slate-500 text-lg leading-none px-1"
        title="Fermer"
      >
        ✕
      </button>
    </div>
  )
}