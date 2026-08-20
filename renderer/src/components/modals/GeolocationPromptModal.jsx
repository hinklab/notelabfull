import React, { useState } from 'react'
import { MapPin, X, Navigation } from 'lucide-react'
import { requestBrowserGeolocation, detectLocationByIP, setGeoPromptDismissed } from '../../services/geo.js'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function GeolocationPromptModal({ onClose, onLocationSet }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  const handleGrant = async () => {
    setLoading(true)
    try {
      const geo = await requestBrowserGeolocation()
      if (onLocationSet) onLocationSet(geo)
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    try {
      setGeoPromptDismissed(true)
      const geo = await detectLocationByIP()
      if (onLocationSet) onLocationSet(geo)
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        width: 'min(440px, 94vw)',
        padding: '24px 22px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
      }}>
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(167, 139, 250, 0.1))',
          border: '1px solid rgba(167, 139, 250, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a78bfa',
          marginBottom: 16
        }}>
          <Navigation size={24} />
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
          {t('geo.promptTitle', null, 'Joylashuvni aniqlash')}
        </h3>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
          {t('geo.promptDesc', null, "Sizning mamlakatingizdagi rasmiy manbalar (ITV, Netflix) va 50km gacha bo'lgan kinoteatrlarni aniqlash uchun joylashuvingizdan foydalanishga ruxsat bering.")}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <button
            onClick={handleGrant}
            disabled={loading}
            style={{
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
            onMouseLeave={e => e.currentTarget.style.background = '#7c3aed'}
          >
            <MapPin size={16} />
            <span>{loading ? t('common.loading', null, 'Aniqlanmoqda...') : t('geo.grantBtn', null, 'Ruxsat berish')}</span>
          </button>

          <button
            onClick={handleSkip}
            disabled={loading}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {t('geo.skipBtn', null, 'Keyinroq / IP orqali')}
          </button>
        </div>
      </div>
    </div>
  )
}
