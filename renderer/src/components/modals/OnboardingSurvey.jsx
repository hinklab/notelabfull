import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { Check, ArrowRight, ArrowLeft, Film } from 'lucide-react'

const STEP1_GENRES = [
  'Jangari',
  'Komediya',
  'Drama',
  'Ilmiy-fantastik',
  'Qo\'rqinchli',
  'Romantik',
  'Triller',
  'Animatsiya',
  'Hujjatli'
]

const STEP2_PRIORITY = [
  'Qiziqarli syujet/voqea',
  'Vizual effektlar va rejissyorlik',
  'Aktyorlar o\'yini',
  'Kulgili/yengil kayfiyat'
]

const STEP3_MOOD = [
  'Chuqur o\'ylantiruvchi (drama, psixologik)',
  'Hayajonli va zavqli (action, triller)',
  'Yengil va kulgili (komediya)',
  'Romantik va his-tuyg\'uli'
]

const STEP4_LENGTH = [
  'Qisqa (90 daqiqadan kam)',
  'Uzun (2 soatdan ko\'p)',
  'Farqi yo\'q'
]

const STEP5_ERA = [
  'Yangi chiqqanlar',
  'Eski klassiklar',
  'Ikkalasi ham'
]

export default function OnboardingSurvey({ userId, onComplete }) {
  const [step, setStep] = useState(1)
  const [selectedGenres, setSelectedGenres] = useState([])
  const [priorityFactor, setPriorityFactor] = useState(STEP2_PRIORITY[0])
  const [moodPref, setMoodPref] = useState(STEP3_MOOD[0])
  const [movieLength, setMovieLength] = useState(STEP4_LENGTH[2])
  const [eraPref, setEraPref] = useState(STEP5_ERA[2])
  const [submitting, setSubmitting] = useState(false)

  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    const payload = {
      user_id: userId,
      favorite_genres: selectedGenres,
      priority_factor: priorityFactor,
      mood_preference: moodPref,
      movie_length_preference: movieLength,
      era_preference: eraPref,
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
      await fetch(`${API_BASE}/user-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('Failed to save user preferences:', err)
    } finally {
      setSubmitting(false)
      onComplete?.()
    }
  }

  const stepTitles = {
    1: "Qaysi janrlarni yoqtirasiz?",
    2: "Kino ko'rishda sizga ko'proq nima muhim?",
    3: "Qanday kayfiyatda kino tanlashni yoqtirasiz?",
    4: "Qisqa yoki uzun filmlarni yoqtirasiz?",
    5: "Yangi chiqqan yoki eski klassik filmlarni ko'proq yoqtirasiz?"
  }

  const stepDescriptions = {
    1: "Mos va aniq tavsiyalar olish uchun bir nechta janr tanlang (ko'p tanlash mumkin).",
    2: "Filmni baxolashdagi asosiy e'tiboringizni ko'rsating.",
    3: "Bugungi yoki umumiy kayfiyatingizga mos yo'nalishni tanlang.",
    4: "Film davomiyligi bo'yicha afzalligingizni belgilang.",
    5: "Davr bo'yicha afzalligingizni belgilang."
  }

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(5, 5, 8, 0.88)',
      backdropFilter: 'blur(18px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: 'min(620px, 94vw)',
        maxHeight: '90vh',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 30px 90px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Top Accent / Progress Bar */}
        <div style={{ height: 4, width: '100%', background: 'var(--border)', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${(step / 5) * 100}%`,
            background: 'var(--accent)',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Modal Header */}
        <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              background: 'rgba(124, 58, 237, 0.15)',
              color: 'var(--accent)',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
            }}>
              {step} / 5
            </span>
            <div style={{ flex: 1 }} />
            <Film size={18} color="var(--accent)" />
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
            {stepTitles[step]}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
            {stepDescriptions[step]}
          </p>
        </div>

        {/* Modal Body (One Question Per Screen) */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '10px 0' }}>
              {STEP1_GENRES.map(g => {
                const active = selectedGenres.includes(g)
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    style={{
                      background: active ? 'var(--accent)' : 'var(--bg-card)',
                      color: active ? '#fff' : 'var(--text-primary)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 30,
                      padding: '10px 18px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease',
                      boxShadow: active ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
                    }}
                  >
                    {active && <Check size={14} />}
                    {g}
                  </button>
                )
              })}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
              {STEP2_PRIORITY.map(opt => {
                const active = priorityFactor === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setPriorityFactor(opt)}
                    style={{
                      background: active ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-card)',
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{opt}</span>
                    {active && <Check size={16} color="var(--accent)" />}
                  </button>
                )
              })}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
              {STEP3_MOOD.map(opt => {
                const active = moodPref === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setMoodPref(opt)}
                    style={{
                      background: active ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-card)',
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{opt}</span>
                    {active && <Check size={16} color="var(--accent)" />}
                  </button>
                )
              })}
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
              {STEP4_LENGTH.map(opt => {
                const active = movieLength === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setMovieLength(opt)}
                    style={{
                      background: active ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-card)',
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{opt}</span>
                    {active && <Check size={16} color="var(--accent)" />}
                  </button>
                )
              })}
            </div>
          )}

          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
              {STEP5_ERA.map(opt => {
                const active = eraPref === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setEraPref(opt)}
                    style={{
                      background: active ? 'rgba(124, 58, 237, 0.15)' : 'var(--bg-card)',
                      color: active ? 'var(--accent)' : 'var(--text-primary)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: '14px 18px',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{opt}</span>
                    {active && <Check size={16} color="var(--accent)" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              style={{
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 18px', color: 'var(--text-muted)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <ArrowLeft size={14} /> Orqaga
            </button>
          ) : <div />}

          {step < 5 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 22px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
              }}
            >
              Keyingisi <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                background: 'var(--accent)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 26px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saqlanmoqda...' : 'Tugatish'} <Check size={14} />
            </button>
          )}
        </div>

      </div>
    </div>,
    document.body
  )
}
