import React, { useState, useEffect, useCallback, useRef } from 'react'
import GroupBoard from './components/layout/NoteBoard.jsx'
import Topbar from './components/layout/Topbar.jsx'
import Agelab from './components/agelab/Agelab.jsx'
import SettingsModal from './components/modals/SettingsModal.jsx'
import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

import OnboardingSurvey from './components/modals/OnboardingSurvey.jsx'
import { Check, AlertCircle } from 'lucide-react'

function normalizeNoteIcon(icon, fallback = '🎬') {
  if (typeof icon === 'string' && icon.trim()) return icon
  if (icon && typeof icon === 'object' && typeof icon.icon === 'string' && icon.icon.trim()) return icon.icon
  return fallback
}

function sanitizeNote(note) {
  if (!note || typeof note !== 'object') return note
  return { ...note, icon: normalizeNoteIcon(note.icon, '🎬'), is_movie: true }
}

export default function App() {
  const { user, loading: authLoading, isNewRegistration, setIsNewRegistration, logout } = useAuth()
  const [authPage, setAuthPage] = useState('login') // 'login' | 'register'
  const [showSurvey, setShowSurvey] = useState(false)
  const [checkingSurvey, setCheckingSurvey] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  useEffect(() => {
    if (!user) {
      setCheckingSurvey(false)
      setShowSurvey(false)
      return
    }

    // Only show survey automatically if it's a brand new registration in this session
    if (isNewRegistration) {
      setShowSurvey(true)
      setCheckingSurvey(false)
      return
    }

    // Existing users: default to NOT showing survey on refresh
    setShowSurvey(false)
    setCheckingSurvey(false)
  }, [user, isNewRegistration])

  // Auth loading spinner
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Yuklanmoqda...</div>
      </div>
    )
  }

  // Auth guard — kirish/ro'yxat sahifalari
  if (!user) {
    return authPage === 'login'
      ? <LoginPage onSwitch={() => setAuthPage('register')} />
      : <RegisterPage onSwitch={() => setAuthPage('login')} />
  }

  return (
    <>
      <MainApp user={user} onLogout={logout} onOpenSurvey={() => setShowSurvey(true)} />
      {showSurvey && (
        <OnboardingSurvey
          userId={user.id}
          onComplete={() => {
            setIsNewRegistration(false)
            setShowSurvey(false)
            if (user.id) {
              localStorage.setItem('notelab_survey_completed_' + user.id, 'true')
              localStorage.setItem('notelab_survey_dismissed_' + user.id, 'true')
            }
          }}
        />
      )}
    </>
  )
}

function MainApp({ user, onLogout, onOpenSurvey }) {
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [activeNote, setActiveNote] = useState(null)
  const activeNoteRef = useRef(null)
  const [boardKey, setBoardKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshToast, setRefreshToast] = useState(null)
  const [loadingNote, setLoadingNote] = useState(true)

  const initMoviesNote = useCallback(async () => {
    setLoadingNote(true)
    try {
      const data = await window.api.getNotes()
      const notesList = Array.isArray(data) ? data : []
      let movieNote = notesList.find(n => n.is_movie || n.type === 'movie')
      
      if (!movieNote) {
        movieNote = await window.api.createNote({ name: 'Movies', icon: '🎬', type: 'movie' })
      }
      
      const safeNote = sanitizeNote(movieNote)
      activeNoteRef.current = safeNote
      setActiveNote(safeNote)
    } catch (err) {
      console.error('Failed to load Movies note:', err)
    } finally {
      setLoadingNote(false)
    }
  }, [])

  useEffect(() => {
    initMoviesNote()
  }, [initMoviesNote])

  const handleRefreshMovies = async () => {
    if (refreshing) return
    setRefreshing(true)
    setRefreshToast(null)
    try {
      const result = await window.api.refreshAllMovies()
      setBoardKey(k => k + 1)
      const toastMsg = `${result.updated} ta yangilandi` + (result.mismatchesCorrected ? `, ${result.mismatchesCorrected} ta mos kelmaslik tuzatildi` : '') + (result.failedTitles && result.failedTitles.length ? `; Muvaffaqiyatsiz: ${result.failedTitles.join(', ')}` : '')
      setRefreshToast(result.success ? { success: true, text: toastMsg } : { success: false, text: result.message || 'Yangilanmadi' })
    } catch { setRefreshToast({ success: false, text: 'Xato yuz berdi' }) }
    finally { setRefreshing(false); setTimeout(() => setRefreshToast(null), 3000) }
  }

  if (loadingNote || !activeNote) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Movies note yuklanmoqda...</div>
      </div>
    )
  }

  const noteLabel = `${normalizeNoteIcon(activeNote.icon, '🎬')} ${activeNote.name}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar
        search={search}
        onSearch={setSearch}
        onSettings={() => setShowSettings(true)}
        onOpenSurvey={onOpenSurvey}
        noteLabel={noteLabel}
        onRefresh={handleRefreshMovies}
        refreshing={refreshing}
        user={user}
        onLogout={onLogout}
        onAddMovieSuccess={() => setBoardKey(k => k + 1)}
      />

      {refreshToast && (
        <div style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--text-primary)', zIndex: 9998, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {refreshToast.success ? <Check size={15} color="#10b981" /> : <AlertCircle size={15} color="#ef4444" />}
          <span>{refreshToast.text}</span>
        </div>
      )}

      <GroupBoard note={activeNote} refreshTrigger={boardKey} search={search} />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onOpenSurvey={onOpenSurvey} />}
    </div>
  )
}
