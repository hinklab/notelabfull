import React, { useState, useEffect } from 'react'
import { Settings, X, Check } from 'lucide-react'

export default function SettingsModal({ onClose }) {
  const [geminiKey, setGeminiKey] = useState('')
  const [omdbKey,  setOmdbKey]  = useState('')
  const [tmdbKey,  setTmdbKey]  = useState('')
  const [rawgKey,  setRawgKey]  = useState('')
  const [saved,    setSaved]    = useState(false)
  const [hasGemini, setHasGemini] = useState(false)
  const [hasOmdb,  setHasOmdb]  = useState(false)
  const [hasTmdb,  setHasTmdb]  = useState(false)
  const [hasRawg,  setHasRawg]  = useState(false)

  useEffect(() => {
    window.api.getSettings().then(s => {
      setGeminiKey(s.gemini_key || '')
      setOmdbKey(s.omdb_key  || '')
      setTmdbKey(s.tmdb_key  || '')
      setRawgKey(s.rawg_key  || '')
      setHasGemini(!!(s.gemini_key))
      setHasOmdb(!!(s.omdb_key))
      setHasTmdb(!!(s.tmdb_key))
      setHasRawg(!!(s.rawg_key))
    })
  }, [])

  const save = async () => {
    const payload = {}
    if (geminiKey.trim()) payload.gemini_key = geminiKey.trim()
    if (omdbKey.trim()) payload.omdb_key  = omdbKey.trim()
    if (tmdbKey.trim()) payload.tmdb_key  = tmdbKey.trim()
    if (rawgKey.trim()) payload.rawg_key  = rawgKey.trim()
    await window.api.saveSettings(payload)
    setHasGemini(!!(payload.gemini_key || geminiKey))
    setHasOmdb(!!(payload.omdb_key || omdbKey))
    setHasTmdb(!!(payload.tmdb_key || tmdbKey))
    setHasRawg(!!(payload.rawg_key || rawgKey))
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <Modal title="Sozlamalar" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Field
          label="Gemini API kaliti (agent uchun)"
          hint={<>aistudio.google.com/apikey {hasGemini && <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} /> saqlangan</span>}</>}
          value={geminiKey}
          onChange={setGeminiKey}
          placeholder="AIza..."
        />
        <Field
          label="OMDB API kaliti (IMDb — chiqib bo'lgan filmlar, bepul)"
          hint={<>omdbapi.com/apikey.aspx {hasOmdb && <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} /> saqlangan</span>}</>}
          value={omdbKey}
          onChange={setOmdbKey}
          placeholder="OMDB kaliti..."
        />
        <Field
          label="TMDB API kaliti (kelajakdagi filmlar — Futured bo'limi, bepul)"
          hint={<>themoviedb.org/settings/api {hasTmdb && <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} /> saqlangan</span>}</>}
          value={tmdbKey}
          onChange={setTmdbKey}
          placeholder="TMDB kaliti..."
        />
        <Field
          label="RAWG API kaliti (o'yinlar note uchun, bepul)"
          hint={<>rawg.io/apidocs — bepul ro'yxatdan o'ting {hasRawg && <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} /> saqlangan</span>}</>}
          value={rawgKey}
          onChange={setRawgKey}
          placeholder="RAWG kaliti..."
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={btnStyle('#222', '#888')}>Bekor</button>
          <button onClick={save} style={btnStyle('#7c3aed', 'white')}>
            {saved ? 'Saqlandi' : 'Saqlash'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, hint, value, onChange, placeholder }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#ddd', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>{hint}</div>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a',
          borderRadius: 7, padding: '8px 12px', color: '#efefef', fontSize: 13,
          outline: 'none', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={onClose}>
      <div style={{
        background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12,
        padding: '22px 24px', width: 440, maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#efefef', display: 'flex', alignItems: 'center', gap: 8 }}>{title}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function btnStyle(bg, color) {
  return {
    background: bg, color, border: 'none', borderRadius: 7,
    padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit',
  }
}
