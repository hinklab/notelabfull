import React, { useState, useEffect } from 'react'
import { Film, MapPin, ExternalLink, Ticket, X, Navigation, Search } from 'lucide-react'
import { api } from '../../config/api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { getStoredUserLocation } from '../../services/geo.js'

export default function CinemasModal({ movie, onClose }) {
  const { t } = useLanguage()
  const [cinemas, setCinemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [ticketUrl, setTicketUrl] = useState('')
  const [afishaUrl, setAfishaUrl] = useState(null)
  const geo = getStoredUserLocation()

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const title = movie.title || movie.name || ''
        const data = await api.getNearbyCinemas(geo.lat, geo.lon, title, geo.city, geo.countryCode)
        if (active && data) {
          setCinemas(data.cinemas || [])
          setTicketUrl(data.ticket_url || '')
          setAfishaUrl(data.afisha_url || null)
        }
      } catch (err) {
        console.warn('Failed loading nearby cinemas:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [movie, geo.lat, geo.lon, geo.city, geo.countryCode])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          width: 'min(520px, 94vw)',
          maxHeight: '85vh',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <Ticket size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('cinema.nearbyCinemas', null, 'Yaqin kinoteatrlar')} (50km)
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} />
                <span>{geo.city ? `${geo.city}, ${geo.countryName || geo.countryCode}` : (geo.countryName || 'O\'zbekiston')}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Ticket Banner */}
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(249, 115, 22, 0.08))',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
              {movie.title || 'Film'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {t('cinema.ticketNotice', null, 'Chiptalar va seanslar jadvalini to\'g\'ridan-to\'g\'ri tekshiring')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {afishaUrl && (
              <a
                href={afishaUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#f97316',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>Afisha.uz</span>
                <ExternalLink size={11} />
              </a>
            )}
            {ticketUrl && (
              <a
                href={ticketUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                }}
              >
                <Ticket size={12} />
                <span>{t('cinema.buyTickets', null, 'Chipta olish')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Cinemas List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('common.loading', null, '50km radiusdagi kinoteatrlar qidirilmoqda...')}
            </div>
          ) : cinemas.length > 0 ? (
            cinemas.map((cinema, idx) => (
              <div
                key={cinema.id || idx}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'border-color 0.15s, transform 0.15s'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {cinema.name}
                    </span>
                    <span style={{
                      background: 'rgba(167, 139, 250, 0.15)',
                      color: '#a78bfa',
                      borderRadius: 6,
                      padding: '2px 6px',
                      fontSize: 10.5,
                      fontWeight: 600
                    }}>
                      {cinema.distance_km} km
                    </span>
                  </div>
                  {cinema.address && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cinema.address}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {cinema.website && (
                    <a
                      href={cinema.website}
                      target="_blank"
                      rel="noreferrer"
                      title={cinema.name}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        padding: '6px 10px',
                        borderRadius: 8,
                        fontSize: 11,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Film size={11} />
                      <span>{t('cinema.website', null, 'Sayt')}</span>
                    </a>
                  )}

                  <a
                    href={cinema.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Xaritada ko'rish"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      color: '#60a5fa',
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Navigation size={11} />
                    <span>{t('cinema.map', null, 'Xarita')}</span>
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <Film size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {t('cinema.noCinemasFound', null, '50km radiusda kinoteatrlar topilmadi')}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                {t('cinema.onlineHint', null, 'Filmni yuqoridagi onlayn manbalar orqali tomosha qilishingiz mumkin.')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
