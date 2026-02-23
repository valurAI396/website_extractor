'use client'

import { useState, useEffect } from 'react'
import Login from '@/components/Login'
import Extractor from '@/components/Extractor'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem('we_auth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = () => {
    localStorage.setItem('we_auth', 'true')
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('we_auth')
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">A carregar...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {isAuthenticated ? (
        <Extractor onLogout={handleLogout} />
      ) : (
        <Login onSuccess={handleLogin} />
      )}
    </main>
  )
}
