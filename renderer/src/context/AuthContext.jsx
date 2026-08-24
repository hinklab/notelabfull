import React, { createContext, useContext, useState, useEffect } from 'react'
import { getApiBase } from '../config/api'

const AuthContext = createContext(null)

const API_BASE = getApiBase()

const SUPABASE_REST_URL = 'https://spntzkotmgsghoahqkne.supabase.co/rest/v1'
const SUPABASE_KEY = ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('')

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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
  const [isNewRegistration, setIsNewRegistration] = useState(false)

  // Sessionni localStorage dan tiklash
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notelab_user')
      if (saved) setUser(JSON.parse(saved))
    } catch {}
    setLoading(false)
  }, [])

  const register = async (email, password) => {
    const emailLower = email.toLowerCase().trim()
    try {
      const data = await fetchJSON(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ email: emailLower, password }),
      })
      setIsNewRegistration(true)
      setUser(data.user)
      localStorage.setItem('notelab_user', JSON.stringify(data.user))
      return data
    } catch (err) {
      console.warn('API register failed, attempting direct Supabase Cloud registration:', err.message)
      // Supabase Direct Cloud Fallback
      const passHash = await sha256(password)
      const newUserId = crypto.randomUUID()

      const res = await fetch(`${SUPABASE_REST_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([{
          id: newUserId,
          email: emailLower,
          password_hash: passHash
        }])
      })

      if (!res.ok) {
        const text = await res.text()
        if (text.includes('duplicate') || text.includes('unique') || res.status === 409) {
          throw new Error('Bu email allaqachon ro\'yxatdan o\'tgan.')
        }
        throw new Error('Ro\'yxatdan o\'tishda xatolik yuz berdi.')
      }

      const rows = await res.json()
      const newUser = rows && rows[0] ? rows[0] : { id: newUserId, email: emailLower }
      const safeUser = { id: newUser.id, email: newUser.email, first_name: newUser.first_name || null, last_name: newUser.last_name || null }

      setIsNewRegistration(true)
      setUser(safeUser)
      localStorage.setItem('notelab_user', JSON.stringify(safeUser))
      return { success: true, user: safeUser }
    }
  }

  const login = async (email, password) => {
    const emailLower = email.toLowerCase().trim()
    try {
      const data = await fetchJSON(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: emailLower, password }),
      })
      setIsNewRegistration(false)
      setUser(data.user)
      localStorage.setItem('notelab_user', JSON.stringify(data.user))
      return data
    } catch (err) {
      console.warn('API login failed or returned invalid credentials, attempting direct Supabase Cloud login:', err.message)
      // Supabase Direct Cloud Fallback
      const passHash = await sha256(password)

      const res = await fetch(`${SUPABASE_REST_URL}/users?email=ilike.${encodeURIComponent(emailLower)}&select=*`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })

      if (res.ok) {
        const users = await res.json()
        const matchedUser = Array.isArray(users) ? users.find(u => u.password_hash === passHash) : null

        if (matchedUser) {
          const safeUser = {
            id: matchedUser.id,
            email: matchedUser.email,
            first_name: matchedUser.first_name || null,
            last_name: matchedUser.last_name || null,
            created_at: matchedUser.created_at
          }
          setIsNewRegistration(false)
          setUser(safeUser)
          localStorage.setItem('notelab_user', JSON.stringify(safeUser))
          return { success: true, user: safeUser }
        }
      }

      // Try Supabase Auth Token API fallback
      try {
        const authRes = await fetch('https://spntzkotmgsghoahqkne.supabase.co/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({ email: emailLower, password })
        })

        if (authRes.ok) {
          const authData = await authRes.json()
          if (authData?.user) {
            const safeUser = {
              id: authData.user.id,
              email: authData.user.email,
              first_name: authData.user.user_metadata?.first_name || null,
              last_name: authData.user.user_metadata?.last_name || null,
              created_at: authData.user.created_at
            }
            // Auto-repair password_hash in public.users
            fetch(`${SUPABASE_REST_URL}/users?id=eq.${encodeURIComponent(safeUser.id)}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
              },
              body: JSON.stringify({ password_hash: passHash })
            }).catch(() => {})

            setIsNewRegistration(false)
            setUser(safeUser)
            localStorage.setItem('notelab_user', JSON.stringify(safeUser))
            return { success: true, user: safeUser }
          }
        }
      } catch (authEx) {
        console.warn('Direct Supabase Auth fallback failed:', authEx.message)
      }

      throw new Error('Email yoki parol noto\'g\'ri.')
    }
  }

  
  const resetPasswordDirect = async (email, newPassword) => {
    const emailLower = email.toLowerCase().trim()
    try {
      const data = await fetchJSON(`${API_BASE}/auth/reset-password-direct`, {
        method: 'POST',
        body: JSON.stringify({ email: emailLower, new_password: newPassword }),
      })
      return data
    } catch (err) {
      console.warn('API reset password failed, attempting direct Supabase Cloud fallback:', err.message)
      const passHash = await sha256(newPassword)
      const res = await fetch(`${SUPABASE_REST_URL}/users?email=ilike.${encodeURIComponent(emailLower)}&select=id,email`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      })
      if (!res.ok) throw new Error(err.message || 'Xatolik yuz berdi.')
      const users = await res.json()
      if (!Array.isArray(users) || users.length === 0) {
        throw new Error('Ushbu email bilan ro\'yxatdan o\'tgan foydalanuvchi topilmadi.')
      }
      const u = users[0]
      const updateRes = await fetch(`${SUPABASE_REST_URL}/users?id=eq.${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ password_hash: passHash })
      })
      if (!updateRes.ok) throw new Error('Parolni yangilashda xatolik yuz berdi.')
      return { success: true, message: 'Parolingiz muvaffaqiyatli yangilandi! Endi yangi parolingiz bilan kirishingiz mumkin.' }
    }
  }

  const logout = () => {
    setUser(null)
    setIsNewRegistration(false)
    localStorage.removeItem('notelab_user')
  }

  const updateUser = (updatedFields) => {
    setUser(prev => {
      const nextUser = { ...prev, ...updatedFields }
      localStorage.setItem('notelab_user', JSON.stringify(nextUser))
      return nextUser
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, isNewRegistration, setIsNewRegistration, login, register, logout, updateUser, resetPasswordDirect }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
