import React, { useState, useEffect, useCallback, useRef } from 'react'
import GroupBoard from './components/layout/NoteBoard.jsx'
import Topbar from './components/layout/Topbar.jsx'
import Agelab from './components/agelab/Agelab.jsx'
import SettingsModal from './components/modals/SettingsModal.jsx'
import { Modal } from './components/modals/SettingsModal.jsx'
import { useAuth } from './context/AuthContext.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import { Pencil, X, Scissors, Copy, Clipboard, Plus, ArrowRight, BookOpen, Gamepad2, BookMarked, Plane, Lightbulb, Music, Dumbbell, Target, Moon, Star } from 'lucide-react'

export default function App() {
  const { user, loading: authLoading, logout } = useAuth()
  const [authPage, setAuthPage] = useState('login') // 'login' | 'register'

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

  return <MainApp user={user} onLogout={logout} />
}

function MainApp({ user, onLogout }) {
  const [notes, setNotes] = useState([])
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateNote, setShowCreateNote] = useState(false)
  const [noteCtxMenu, setNoteCtxMenu] = useState(null)
  const [noteClipboard, setNoteClipboard] = useState(null)
  const [editNote, setEditNote] = useState(null)
  const [activeNote, setActiveNote] = useState(null)
  const activeNoteRef = useRef(null)
  const [boardKey, setBoardKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshToast, setRefreshToast] = useState(null)

  const loadNotes = useCallback(async () => {
    const data = await window.api.getNotes()
    setNotes(data)
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  useEffect(() => {
    const close = () => { setNoteCtxMenu(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const openNote = (note) => {
    activeNoteRef.current = note
    setActiveNote(note)
  }

  const goHome = () => {
    activeNoteRef.current = null
    setActiveNote(null)
    setSearch('')
    loadNotes()
  }

  const handleCreateNote = async ({ name, icon, type }) => {
    const note = await window.api.createNote({ name, icon, type: type || 'custom' })
    await loadNotes()
    setShowCreateNote(false)
    openNote(note)
  }

  const handleDeleteNote = async (note) => {
    const res = await window.api.deleteNote(note.id)
    if (res?.error) { alert(res.error); return }
    await loadNotes()
  }

  const handleNoteContextMenu = (e, note) => {
    if (note.is_movie) return
    e.preventDefault()
    e.stopPropagation()
    setNoteCtxMenu({ x: e.clientX, y: e.clientY, note })
  }

  const handleNoteCut = (note) => { setNoteClipboard({ ...note, _cut: true }); setNoteCtxMenu(null) }
  const handleNoteCopy = (note) => { setNoteClipboard({ ...note, _cut: false }); setNoteCtxMenu(null) }

  const handleNotePaste = async () => {
    if (!noteClipboard) return
    await window.api.createNote({ name: noteClipboard.name, icon: noteClipboard.icon })
    if (noteClipboard._cut) await window.api.deleteNote(noteClipboard.id)
    setNoteClipboard(null)
    setNoteCtxMenu(null)
    await loadNotes()
  }

  const TYPE_META = {
    movie:  { label: 'Kinolar',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    books:  { label: 'Kitoblar',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    travel: { label: 'Sayohat',   color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    games:  { label: "O'yinlar",  color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
    custom: { label: 'Erkin',     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  }

  const renderHome = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '40px 20px', gap: 16 }}>
      <div style={{ width: 'min(720px, 100%)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {notes.length === 0 ? (
          <HomeCard onClick={() => setShowCreateNote(true)} dashed>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '32px 0' }}>
              <span style={{ fontSize: 28, color: 'var(--text-muted)' }}><Plus size={22} color="var(--text-muted)" /></span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>Create New Note Group</span>
            </div>
          </HomeCard>
        ) : (
          <>
            {notes.map(note => {
              const tm = TYPE_META[note.type] || TYPE_META.custom
              return (
                <HomeCard
                  key={note.id}
                  onClick={() => openNote(note)}
                  onContextMenu={(e) => handleNoteContextMenu(e, note)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {note.icon || '📝'} {note.name}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: tm.color, background: tm.bg, border: `1px solid ${tm.color}33`, borderRadius: 20, padding: '2px 10px' }}>
                        {tm.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 36, color: 'var(--text-muted)', lineHeight: 1, flexShrink: 0 }}><ArrowRight size={22} color="var(--text-muted)" /></div>
                  </div>
                  <div style={{ marginTop: 16, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                    <span>Jami: <strong style={{ color: 'var(--text-primary)' }}>{note.item_count ?? 0}</strong></span>
                    {(note.groups_summary || []).map(g => (
                      <span key={g.id} style={{ color: g.color || 'var(--text-primary)' }}>
                        {g.name}: <strong>{g.count}</strong>
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                    {note.is_movie ? 'TMDB · OMDB integratsiyasi' : note.created_at
                      ? new Date(note.created_at).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
                      : ''}
                  </div>
                </HomeCard>
              )
            })}
            <HomeCard onClick={() => setShowCreateNote(true)} dashed>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0' }}>
                <span style={{ fontSize: 22, color: 'var(--text-muted)' }}><Plus size={18} color="var(--text-muted)" /></span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>Create New Note</span>
              </div>
            </HomeCard>
          </>
        )}

      </div>
    </div>
  )

  const handleRefreshMovies = async () => {
    if (refreshing) return
    setRefreshing(true)
    setRefreshToast(null)
    try {
      const result = await window.api.refreshAllMovies()
      setBoardKey(k => k + 1)
      setRefreshToast(result.success ? `✓ ${result.updated} ta yangilandi` : `⚠ ${result.message || 'Yangilanmadi'}`)
    } catch { setRefreshToast('⚠ Xato yuz berdi') }
    finally { setRefreshing(false); setTimeout(() => setRefreshToast(null), 3000) }
  }

  const noteLabel = activeNote ? `${activeNote.icon || '📝'} ${activeNote.name}` : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Topbar
        search={search}
        onSearch={setSearch}
        onSettings={() => setShowSettings(true)}
        onBack={activeNote ? goHome : undefined}
        noteLabel={activeNote ? noteLabel : undefined}
        onRefresh={activeNote?.is_movie ? handleRefreshMovies : undefined}
        refreshing={activeNote?.is_movie ? refreshing : false}
        user={user}
        onLogout={onLogout}
      />

      {refreshToast && (
        <div style={{ position: 'fixed', top: 64, left: '50%', transform: 'translateX(-50%)', background: '#1e1e1e', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--text-primary)', zIndex: 9998, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {refreshToast}
        </div>
      )}

      {activeNote ? (
        <GroupBoard note={activeNote} refreshTrigger={boardKey} />
      ) : (
        renderHome()
      )}

      <Agelab
        onAction={() => {
          if (activeNoteRef.current) setBoardKey(k => k + 1)
          else loadNotes()
        }}
        activeNote={activeNote}
        getUiMovies={() => []}
      />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {noteCtxMenu && (
        <NoteCtxMenu
          x={noteCtxMenu.x} y={noteCtxMenu.y}
          note={noteCtxMenu.note}
          clipboard={noteClipboard}
          onEdit={() => { setEditNote(noteCtxMenu.note); setNoteCtxMenu(null) }}
          onDelete={() => { handleDeleteNote(noteCtxMenu.note); setNoteCtxMenu(null) }}
          onCut={() => handleNoteCut(noteCtxMenu.note)}
          onCopy={() => handleNoteCopy(noteCtxMenu.note)}
          onPaste={noteClipboard ? handleNotePaste : null}
          onClose={() => setNoteCtxMenu(null)}
        />
      )}

      {editNote && (
        <EditNoteModal
          note={editNote}
          onClose={() => setEditNote(null)}
          onSave={async ({ name, icon }) => {
            await window.api.updateNote(editNote.id, { name, icon })
            setEditNote(null)
            await loadNotes()
          }}
        />
      )}

      {showCreateNote && (
        <CreateNoteModal
          onClose={() => setShowCreateNote(false)}
          onCreate={handleCreateNote}
        />
      )}
    </div>
  )
}

function HomeCard({ onClick, onContextMenu, children, dashed }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        cursor: 'pointer',
        borderRadius: 24,
        border: dashed ? '1.5px dashed var(--border-hover)' : '1px solid var(--border)',
        background: dashed ? 'transparent' : 'var(--bg-card)',
        padding: '28px 32px',
        boxShadow: dashed ? 'none' : '0 20px 60px rgba(0,0,0,0.12)',
        transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        borderColor: hovered ? 'var(--border-hover)' : undefined,
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  )
}

function NoteCtxMenu({ x, y, note, clipboard, onEdit, onDelete, onCut, onCopy, onPaste, onClose }) {
  const items = [
    { label: 'Tahrirlash', icon: <Pencil size={12} />, action: onEdit },
    { label: 'Kesib olish', icon: <Scissors size={12} />, action: onCut },
    { label: 'Nusxa olish', icon: <Copy size={12} />, action: onCopy },
    onPaste && { label: 'Joylashtirish', icon: <Clipboard size={12} />, action: onPaste },
    { label: "O'chirish", icon: <X size={12} />, action: onDelete, color: '#ef4444' },
  ].filter(Boolean)

  return (
    <div
      style={{
        position: 'fixed',
        left: Math.min(x, window.innerWidth - 185),
        top: Math.min(y, window.innerHeight - 230),
        zIndex: 9999, background: '#1e1e1e',
        border: '1px solid #333', borderRadius: 8,
        padding: '4px 0', minWidth: 175,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{ padding: '7px 16px', cursor: 'pointer', color: item.color || 'var(--text-primary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
          onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          onClick={() => { item.action(); onClose() }}
        >
          <span style={{ opacity: 0.6, display: 'flex', alignItems: 'center' }}>{item.icon}</span>
          {item.label}
        </div>
      ))}
    </div>
  )
}

function EditNoteModal({ note, onClose, onSave }) {
  const [name, setName] = useState(note.name || '')
  const [icon, setIcon] = useState(note.icon || '📝')
  const ICONS = ['📝', '📚', '🎮', '🎵', '✈️', '💡', '🏋️', '🎯', '🌙', '⭐']

  return (
    <Modal title="Noteni tahrirlash" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Nomi</div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSave({ name, icon })}
            style={{
              width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a',
              borderRadius: 7, padding: '8px 12px', color: '#efefef', fontSize: 13,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Icon</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                background: icon === ic ? 'rgba(124,58,237,0.25)' : '#1e1e1e',
                border: icon === ic ? '1.5px solid #7c3aed' : '1px solid #2a2a2a',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                fontSize: 18, lineHeight: 1, transition: 'all 0.12s',
              }}>{ic}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={btnStyle('#222', '#888')}>Bekor</button>
          <button onClick={() => name.trim() && onSave({ name, icon })} style={btnStyle('#7c3aed', 'white', !name.trim())}>
            Saqlash
          </button>
        </div>
      </div>
    </Modal>
  )
}

const NOTE_TYPES = [
  { type: 'books',  lucideIcon: <BookMarked size={20} color="#60a5fa" />, icon: '📚', label: 'Kitoblar',  desc: 'Google Books API' },
  { type: 'travel', lucideIcon: <Plane size={20} color="#34d399" />,      icon: '✈️', label: 'Sayohat',   desc: 'Wikipedia rasmlari' },
  { type: 'games',  lucideIcon: <Gamepad2 size={20} color="#f472b6" />,   icon: '🎮', label: "O'yinlar",  desc: 'RAWG API (key kerak)' },
  { type: 'custom', lucideIcon: <Pencil size={20} color="#a78bfa" />,     icon: '📝', label: 'Erkin',     desc: "Qo'lda to'ldirish" },
]

function CreateNoteModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('custom')

  const selected = NOTE_TYPES.find(t => t.type === type)

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate({ name: name.trim(), icon: selected.icon, type })
  }

  return (
    <Modal title="+ Create New Note" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Nomi *</div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Masalan: My Books, Japan Trip, Steam Library..."
            style={{
              width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a',
              borderRadius: 7, padding: '8px 12px', color: '#efefef', fontSize: 13,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Note turi (qidiruv API si)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {NOTE_TYPES.map(t => (
              <button
                key={t.type}
                onClick={() => setType(t.type)}
                style={{
                  background: type === t.type ? 'rgba(124,58,237,0.18)' : '#1a1a1a',
                  border: type === t.type ? '1.5px solid #7c3aed' : '1px solid #2a2a2a',
                  borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.12s', fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{t.lucideIcon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: type === t.type ? '#a78bfa' : '#efefef' }}>{t.label}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={btnStyle('#222', '#888')}>Bekor</button>
          <button onClick={handleCreate} disabled={!name.trim()} style={btnStyle('#7c3aed', 'white', !name.trim())}>
            Yaratish
          </button>
        </div>
      </div>
    </Modal>
  )
}

function btnStyle(bg, color, disabled) {
  return {
    background: bg, color, border: 'none', borderRadius: 7,
    padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
    opacity: disabled ? 0.4 : 1,
  }
}
