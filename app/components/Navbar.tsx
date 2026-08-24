'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; congelo_username=`)
    
    if (parts.length === 2) {
      const rawName = parts.pop()?.split(';').shift() || ''
      setUserName(decodeURIComponent(rawName))
    } else {
      const idParts = value.split(`; congelo_user_id=`)
      if (idParts.length === 2) {
        setUserName(idParts.pop()?.split(';').shift() || 'Inconnu')
      }
    }
  }, [pathname])

  if (pathname === '/login') return null

  const links = [
    { href: '/', label: 'Caves', icon: '🍷' },
    { href: '/alerts', label: 'Alertes', icon: '⚠️' },
    { href: '/search', label: 'Recherche', icon: '🔍' },
  ]

  const handleLogout = () => {
    document.cookie = 'congelo_user_id=; path=/; max-age=0'
    document.cookie = 'congelo_username=; path=/; max-age=0'
    localStorage.removeItem('congelo_user_id')
    localStorage.removeItem('congelo_username')
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 flex justify-between items-center h-16">
        
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <img src="/logo.png" alt="CELLIO Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shadow-sm" />
          <div>
            <span className="font-bold text-lg sm:text-xl text-slate-800 tracking-tight">CELLIO</span>
            <span className="block text-[9px] sm:text-[10px] text-rose-800 font-bold -mt-1 truncate max-w-[100px] sm:max-w-[150px]">
              👤 {userName}
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-1 sm:space-x-3">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-rose-50 text-rose-800' : 'text-slate-600 hover:bg-slate-50'
                }`}
                title={link.label}
              >
                <span className="hidden sm:inline mr-1.5">{link.label}</span>
                <span className="text-base sm:text-sm">{link.icon}</span>
              </Link>
            )
          })}

          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="flex items-center ml-1 sm:ml-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <span className="hidden sm:inline mr-1.5">Déconnexion</span>
            <span className="text-base sm:text-sm">🚪</span>
          </button>
        </div>
        
      </div>
    </nav>
  )
}