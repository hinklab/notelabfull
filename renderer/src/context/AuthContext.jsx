import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sessionni localStorage dan tiklash
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notelab_user')
      if (saved) setUser(JSON.parse(saved))
    } catch {}
    setLoading(false)
  }, [])

  const register = async (email, password) => {
    const data = await fetchJSON(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setUser(data.user)
    localStorage.setItem('notelab_user', JSON.stringify(data.user))
    return data
  }

  const login = async (email, password) => {
    const data = await fetchJSON(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setUser(data.user)
    localStorage.setItem('notelab_user', JSON.stringify(data.user))
    return data
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('notelab_user')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
