import React, { useState, useRef, useEffect } from 'react'
import { List, Trash2, X, Send, Loader2, Sparkles } from 'lucide-react'

const UI_SNAPSHOT_KEY = 'agelab_ui_snapshot'

function storageKey(noteId) {
  return noteId ? `agelab_chat_note_${noteId}` : 'agelab_chat_home'
}

const TYPE_EXAMPLES = {
  movies: [
    "Inception filmini Ko'rmoqchiga qo'sh",
    "Inception ko'rib bo'ldim",
    "Oppenheimer filmini Futuredga qo'sh",
    "To Do guruhini yarat",
  ],
  games: [
    "Red Dead Redemption 2 ni Playingga qo'sh",
    "Elden Ring ni Played guruhiga ko'chir",
    "Witcher 3 ni To Do ga qo'sh",
    "Backlog degan yangi guruh yarat",
  ],
  books: [
    "Qo'zichoqlar sukunati kitobini O'qimoqchiga qo'sh",
    "Dune kitobini O'qib bo'ldim guruhiga ko'chir",
    "Sapiens kitobini qo'sh",
    "O'qilyapti degan guruh yarat",
  ],
  travel: [
    "Parijga borishni Rejalashtirilganga qo'sh",
    "Tokio sayohatini Borilganga ko'chir",
    "Istanbul ni Wishlistga qo'sh",
    "Borilgan joylar degan guruh yarat",
  ],
}

function getGenericExamples(note) {
  const n = note?.name || 'element'
  return [
    `${n} ga yangi narsa qo'sh`,
    `Biror narsani boshqa guruhga ko'chir`,
    `Yangi guruh yarat`,
    `Hamma narsani ro'yxatla`,
  ]
}

function getDefaultMessages(note) {
  const type = note?.is_movie ? 'movies' : (note?.type || null)
  const name = note?.name || null
  const examples = TYPE_EXAMPLES[type] || getGenericExamples(note)
  const lines = examples.map(e => `• "${e}"`).join('\n')
  const greeting = name
    ? `Salom! Men agelab — ${name} bo'limingiz uchun yordamchiman.\n\nMisol:\n${lines}`
    : `Salom! Men agelab.\n\nMisol:\n${lines}`
  return [{ role: 'agent', text: greeting }]
}

function loadMessages(noteId, note) {
  try {
    const saved = localStorage.getItem(storageKey(noteId))
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return getDefaultMessages(note)
}

function loadUiSnapshot() {
  try {
    const saved = localStorage.getItem(UI_SNAPSHOT_KEY)
    if (saved) return JSON.parse(saved)
  } catch (e) {}
  return null
}

function saveMessages(noteId, msgs) {
  try {
    localStorage.setItem(storageKey(noteId), JSON.stringify(msgs.slice(-50)))
  } catch (e) {}
}

function saveUiSnapshot(snapshot) {
  try {
    if (snapshot) localStorage.setItem(UI_SNAPSHOT_KEY, JSON.stringify(snapshot))
    else localStorage.removeItem(UI_SNAPSHOT_KEY)
  } catch (e) {}
}

function headerBtnStyle(active) {
  return {
    background: active ? 'rgba(124,58,237,0.2)' : 'transparent',
    border: active ? '1px solid rgba(124,58,237,0.45)' : '1px solid transparent',
    color: active ? '#c4b5fd' : '#555',
    cursor: 'pointer',
    fontSize: 12,
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'color 0.15s, background 0.15s, border-color 0.15s',
    lineHeight: 1,
    flexShrink: 0,
  }
}

export default function Agelab({ onAction, getUiMovies, activeNote }) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() => loadMessages(activeNote?.id, activeNote))
  const [loading, setLoading] = useState(false)
  const [uiSnapshot, setUiSnapshot] = useState(loadUiSnapshot)
  const bottomRef = useRef()
  const inputRef = useRef()
  const prevNoteId = useRef(activeNote?.id)
  const wasOpenRef = useRef(false)
  const openRef = useRef(false)
  const hasNote = !!activeNote

  const openPanel = () => {
    openRef.current = true
    setVisible(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true))
    })
  }

  const closePanel = () => {
    openRef.current = false
    setOpen(false)
    setTimeout(() => setVisible(false), 340)
  }

  const togglePanel = () => {
    if (open) closePanel()
    else openPanel()
  }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 340)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  useEffect(() => {
    const noteId = activeNote?.id
    if (noteId !== prevNoteId.current) {
      prevNoteId.current = noteId
      setMessages(loadMessages(noteId, activeNote))
      setInput('')
    }
  }, [activeNote?.id])

  // activeNote null bo'lganda panel yopilsin; qayta kelganda avvalgi holat tiklansin
  useEffect(() => {
    if (!activeNote) {
      if (openRef.current) {
        wasOpenRef.current = true
        openRef.current = false
        setOpen(false)
        setTimeout(() => setVisible(false), 340)
      }
    } else {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        openRef.current = true
        setVisible(true)
        requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
      }
    }
  }, [!!activeNote])

  useEffect(() => { saveMessages(activeNote?.id, messages) }, [messages])
  useEffect(() => { saveUiSnapshot(uiSnapshot) }, [uiSnapshot])

  const syncUiList = () => {
    if (!getUiMovies) return
    const movies = getUiMovies()
    setUiSnapshot({
      syncedAt: new Date().toISOString(),
      count: movies.length,
      movies,
    })
  }

  const clearChat = () => {
    setMessages(getDefaultMessages(activeNote))
    localStorage.removeItem(storageKey(activeNote?.id))
  }

  const resizeInput = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  useEffect(() => {
    resizeInput()
  }, [input, open])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    requestAnimationFrame(resizeInput)
    const newMessages = [...messages, { role: 'user', text: msg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const history = newMessages.slice(-16).map(m => ({ role: m.role, text: m.text }))
      const uiMovies = uiSnapshot?.movies ?? null
      const noteCtx = activeNote ? { note_id: activeNote.id, note_name: activeNote.name, note_type: activeNote.type || 'custom' } : null
      const result = await window.api.agentChat(msg, history, uiMovies, noteCtx)
      setMessages(prev => [...prev, { role: 'agent', text: result.reply || 'Tushunmadim.' }])
      onAction(result)
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', text: `Xato: ${e.message}` }])
    }
    setLoading(false)
  }

  const panelStyle = {
    position: 'fixed',
    right: 24,
    bottom: 88,
    width: 350,
    height: 560,
    maxHeight: 'calc(100vh - 110px)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 39,
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    transform: open ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(24px)',
    opacity: open ? 1 : 0,
    transition: 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
    willChange: 'transform, opacity',
  }

  return (
    <>
      <button
        onClick={togglePanel}
        title={open ? 'Yopish' : 'Sizning shaxsiy yordamchingiz (Agelab)'}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 40,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: open ? '#6d28d9' : '#7c3aed',
          opacity: hasNote ? 1 : 0,
          pointerEvents: hasNote ? 'auto' : 'none',
          transition: 'background 0.15s, opacity 0.25s, transform 0.15s',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(124,58,237,0.5)',
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.transform = 'scale(1.06)' }}
        onMouseLeave={e => { e.currentTarget.style.background = open ? '#6d28d9' : '#7c3aed'; e.currentTarget.style.transform = 'scale(1)' }}
      >
        {open ? <X size={22} color="#fff" /> : <Sparkles size={22} color="#fff" />}
      </button>

      {visible && (
        <div style={panelStyle}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.2 }}>agelab</div>
              <div style={{ fontSize: 10, color: uiSnapshot ? '#a78bfa' : 'var(--text-muted)' }}>
                {uiSnapshot
                  ? `UI ro'yxati: ${uiSnapshot.count} ta film`
                  : 'AI assistant'}
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={syncUiList}
              title="Ekrandagi kinolar ro'yxatini agentga ulash (chat tozalangandan keyin ham)"
              style={headerBtnStyle(!!uiSnapshot)}
              onMouseEnter={e => { if (!uiSnapshot) e.currentTarget.style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { if (!uiSnapshot) e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <List size={14} />
            </button>
            <button
              onClick={clearChat}
              title="Chatni tozalash"
              style={headerBtnStyle(false)}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            ><Trash2 size={14} /></button>
            <button
              onClick={closePanel}
              style={headerBtnStyle(false)}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            ><X size={14} /></button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                maxWidth: '90%',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#7c3aed' : 'var(--bg-input)',
                color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                padding: '8px 12px',
                fontSize: 12.5,
                lineHeight: 1.55,
                border: m.role === 'agent' ? '1px solid var(--border)' : 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#1a1a1a',
                border: '1px solid #252525',
                borderRadius: '14px 14px 14px 3px',
                padding: '8px 14px',
                color: '#555',
                fontSize: 12,
              }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #1e1e1e',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: '#0f0f0f',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                requestAnimationFrame(resizeInput)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Buyruq yozing..."
              disabled={loading}
              style={{
                flex: 1,
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 10,
                padding: '8px 12px',
                color: '#efefef',
                fontSize: 13,
                lineHeight: 1.45,
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
                resize: 'none',
                overflow: 'hidden',
                minHeight: 38,
                maxHeight: 120,
              }}
              onFocus={e => { e.target.style.borderColor = '#7c3aed' }}
              onBlur={e => { e.target.style.borderColor = '#2a2a2a' }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                background: '#7c3aed',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                flexShrink: 0,
                opacity: loading || !input.trim() ? 0.4 : 1,
                transition: 'opacity 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { if (!loading && input.trim()) e.currentTarget.style.background = '#6d28d9' }}
              onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
            ><Send size={14} /></button>
          </div>
        </div>
      )}
    </>
  )
}

function ToggleBars() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: i === 1 ? 16 : 20, height: 2, background: '#fff', borderRadius: 2, opacity: i === 1 ? 0.7 : 1 }} />
      ))}
    </div>
  )
}

function GripDots() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 5px)', gap: 3 }}>
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.75)' }} />
      ))}
    </div>
  )
}
