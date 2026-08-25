import React, { useState, useEffect, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { Film, MapPin, ExternalLink, Ticket, X, Navigation, Search, Calendar, Globe, Sparkles } from 'lucide-react'
import { api } from '../../config/api.js'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { getStoredUserLocation } from '../../services/geo.js'

const UZ_FALLBACK_CINEMAS = [
  {
    id: 'uz_magic',
    name: 'Magic Cinema',
    mall: 'Magic City',
    city: 'Tashkent',
    address: "Bobur ko'chasi, Magic City bog'i",
    distance_km: 0.8,
    website: 'https://magiccinema.uz',
    afisha_url: 'https://www.afisha.uz/uz/cinema/magic-cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Magic+Cinema+Tashkent'
  },
  {
    id: 'uz_riviera',
    name: 'Cinema City / iMax',
    mall: 'Riviera Mall',
    city: 'Tashkent',
    address: "Nurafshon ko'chasi, 5, Riviera Mall 3-qavat",
    distance_km: 1.1,
    website: 'https://cinemacity.uz',
    afisha_url: 'https://www.afisha.uz/uz/cinema/riviera-cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Cinema+City+Riviera+Mall+Tashkent'
  },
  {
    id: 'uz_next',
    name: 'Next Cinema',
    mall: 'Next Mall',
    city: 'Tashkent',
    address: "Bobur ko'chasi, 6, Next Mall 3-qavat",
    distance_km: 1.5,
    website: 'https://next.uz',
    afisha_url: 'https://www.afisha.uz/uz/cinema/next-cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Next+Cinema+Tashkent'
  },
  {
    id: 'uz_drive',
    name: 'Drive Cinema',
    mall: 'Tashkent City Mall',
    city: 'Tashkent',
    address: 'Tashkent City Mall 4-qavat',
    distance_km: 1.6,
    website: 'https://tashkentcitymall.uz',
    afisha_url: 'https://www.afisha.uz/uz/cinema/drive-cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Drive+Cinema+Tashkent+City+Mall'
  },
  {
    id: 'uz_panorama',
    name: 'Alisher Navoiy (Panorama)',
    mall: 'Kino Saroyi',
    city: 'Tashkent',
    address: "Navoiy shoh ko'chasi, 15",
    distance_km: 1.8,
    website: 'https://www.afisha.uz/uz/cinema/panoramnyy/',
    afisha_url: 'https://www.afisha.uz/uz/cinema/panoramnyy/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Panorama+Alisher+Navoiy+Tashkent'
  },
  {
    id: 'uz_parus',
    name: 'Parus Cinema',
    mall: 'Parus Mall',
    city: 'Tashkent',
    address: "Qatortol ko'chasi, 60, Parus Mall 4-qavat",
    distance_km: 2.3,
    website: 'https://www.afisha.uz/uz/cinema/parus-cinema/',
    afisha_url: 'https://www.afisha.uz/uz/cinema/parus-cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Parus+Cinema+Tashkent'
  },
  {
    id: 'uz_premier',
    name: 'Premier Hall Cinema',
    mall: 'Premier Hall',
    city: 'Tashkent',
    address: "Shota Rustaveli ko'chasi, 22",
    distance_km: 2.8,
    website: 'https://www.afisha.uz/uz/cinema/premier-hall/',
    afisha_url: 'https://www.afisha.uz/uz/cinema/premier-hall/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Premier+Hall+Tashkent'
  },
  {
    id: 'uz_compass',
    name: 'Compass Cinema',
    mall: 'Compass Mall',
    city: 'Tashkent',
    address: "Toshkent halqa avtomobil yo'li, 17, Compass Mall",
    distance_km: 9.5,
    website: 'https://compassmall.uz',
    afisha_url: 'https://www.afisha.uz/uz/cinema/compass-cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Compass+Cinema+Tashkent'
  },
  {
    id: 'uz_salom',
    name: 'Salom Cinema',
    mall: 'Salom',
    city: 'Tashkent',
    address: "Buyuk Ipak Yo'li ko'chasi, 158",
    distance_km: 6.2,
    website: 'https://www.afisha.uz/uz/cinema/salom-cinema/',
    afisha_url: 'https://www.afisha.uz/uz/cinema/salom-cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Salom+Cinema+Tashkent'
  },
  {
    id: 'uz_asia',
    name: 'Asia Cinema',
    mall: 'Samarqand Darvoza',
    city: 'Tashkent',
    address: "Qoratosh ko'chasi, 5A, Samarqand Darvoza 4-qavat",
    distance_km: 2.5,
    website: 'https://www.afisha.uz/uz/cinema/samarqand-darvoza/',
    afisha_url: 'https://www.afisha.uz/uz/cinema/samarqand-darvoza/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Asia+Cinema+Samarqand+Darvoza'
  },
  {
    id: 'uz_family_samarkand',
    name: 'Yulduz Cinema',
    mall: 'Family Park',
    city: 'Samarqand',
    address: "Narpay ko'chasi, Family Park Mall",
    distance_km: 4.0,
    website: 'https://www.afisha.uz/uz/cinema/',
    afisha_url: 'https://www.afisha.uz/uz/cinema/',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Family+Park+Cinema+Samarkand'
  }
];

export default function CinemasModal({ movie, onClose }) {
  const { t } = useLanguage()
  const [cinemas, setCinemas] = useState(UZ_FALLBACK_CINEMAS)
  const [loading, setLoading] = useState(true)
  const [ticketUrl, setTicketUrl] = useState('')
  const [afishaUrl, setAfishaUrl] = useState('')
  const [iticketUrl, setIticketUrl] = useState('')
  const [googleShowtimesUrl, setGoogleShowtimesUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('ALL')
  const geo = getStoredUserLocation()

  const movieTitle = movie?.title || movie?.name || 'Film'

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const title = movie.title || movie.name || ''
        const data = await api.getNearbyCinemas(geo.lat, geo.lon, title, geo.city, geo.countryCode)
        if (active && data) {
          if (Array.isArray(data.cinemas) && data.cinemas.length > 0) {
            setCinemas(data.cinemas)
          } else if (geo.countryCode === 'UZ') {
            setCinemas(UZ_FALLBACK_CINEMAS)
          }
          setTicketUrl(data.ticket_url || '')
          setAfishaUrl(data.afisha_url || `https://www.afisha.uz/uz/search/?query=${encodeURIComponent(title)}`)
          setIticketUrl(data.iticket_url || 'https://iticket.uz/uz/events/cinema')
          setGoogleShowtimesUrl(data.google_showtimes_url || `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + (geo.city || '') + ' kinoteatr seanslar')}`)
        }
      } catch (err) {
        console.warn('Failed loading nearby cinemas:', err)
        if (active && geo.countryCode === 'UZ') {
          setCinemas(UZ_FALLBACK_CINEMAS)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [movie, geo.lat, geo.lon, geo.city, geo.countryCode])

  const targetAfishaUrl = afishaUrl || `https://www.afisha.uz/uz/search/?query=${encodeURIComponent(movieTitle)}`
  const targetIticketUrl = iticketUrl || 'https://iticket.uz/uz/events/cinema'
  const targetGoogleUrl = googleShowtimesUrl || `https://www.google.com/search?q=${encodeURIComponent(movieTitle + ' kinoteatr seanslar')}`

  const filteredCinemas = useMemo(() => {
    return cinemas.filter(cinema => {
      const matchesSearch = !searchQuery.trim() ||
        cinema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cinema.address && cinema.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cinema.mall && cinema.mall.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCity = selectedCity === 'ALL' ||
        (selectedCity === 'Tashkent' && (!cinema.city || cinema.city.toLowerCase().includes('tashkent') || cinema.city.toLowerCase().includes('toshkent'))) ||
        (selectedCity === 'Samarqand' && cinema.city && (cinema.city.toLowerCase().includes('samarqand') || cinema.city.toLowerCase().includes('samarkand')))

      return matchesSearch && matchesCity
    })
  }, [cinemas, searchQuery, selectedCity])

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px 12px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface, #161616)',
          border: '1px solid var(--border, #2a2a2a)',
          borderRadius: 20,
          width: 'min(680px, 96vw)',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--text-primary, #efefef)',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border, #2a2a2a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.15))',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <Ticket size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <span>{t('cinema.nearbyCinemas', null, 'Kinoteatrlar & Seanslar')}</span>
                <span style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 8,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  UZ
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={12} color="#f87171" />
                <span>{geo.city ? `${geo.city}, ${geo.countryName || "O'zbekiston"}` : (geo.countryName || "O'zbekiston")}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border, #2a2a2a)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 7,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            boxSizing: 'border-box'
          }}
        >
          {/* ═══════════════════════════════════════════════ */}
          {/* 1. AFISHA.UZ & ITICKET CHIPTALAR HUB            */}
          {/* ═══════════════════════════════════════════════ */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color="#f87171" />
              <span>{t('cinema.onlineTicketsTitle', null, 'Chiptalar va Onlayn Seanslar')}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {/* Afisha.uz Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(249, 115, 22, 0.08))',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                boxShadow: '0 4px 18px rgba(239, 68, 68, 0.08)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 900 }}>
                        AFISHA.UZ
                      </span>
                      <span>Kino Seanslari</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.45 }}>
                    <strong style={{ color: '#f87171' }}>{movieTitle}</strong> filmining Toshkent va O'zbekiston kinoteatrlaridagi bugungi seanslari va narxlari.
                  </div>
                </div>

                <a
                  href={targetAfishaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.4)' }}
                >
                  <Ticket size={16} />
                  <span>Afisha.uz da ko'rish</span>
                  <ExternalLink size={13} style={{ opacity: 0.85 }} />
                </a>
              </div>

              {/* iTicket.uz Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(124, 58, 237, 0.08))',
                border: '1.5px solid rgba(56, 189, 248, 0.28)',
                borderRadius: 14,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12,
                boxShadow: '0 4px 18px rgba(56, 189, 248, 0.06)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 900 }}>
                        iTICKET
                      </span>
                      <span>Elektron Chipta</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.45 }}>
                    Kino zallaridagi qator va o'rindiqlarni tanlab, to'g'ridan-to'g'ri onlayn chipta sotib olish.
                  </div>
                </div>

                <a
                  href={targetIticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(2, 132, 199, 0.55)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 132, 199, 0.35)' }}
                >
                  <Ticket size={16} />
                  <span>iTicket'da ochish</span>
                  <ExternalLink size={13} style={{ opacity: 0.85 }} />
                </a>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* 2. KINOTEATRLAR RO'YXATI                        */}
          {/* ═══════════════════════════════════════════════ */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
                {t('cinema.cinemasList', null, "Kinoteatrlar Ro'yxati")} ({filteredCinemas.length})
              </div>

              {/* City Selector */}
              <div style={{ display: 'inline-flex', background: 'var(--bg-input, #1e1e1e)', border: '1px solid var(--border, #2a2a2a)', borderRadius: 8, padding: 2, gap: 2 }}>
                {[
                  { id: 'ALL', label: 'Barchasi' },
                  { id: 'Tashkent', label: 'Toshkent' },
                  { id: 'Samarqand', label: 'Samarqand' }
                ].map(cityTab => (
                  <button
                    key={cityTab.id}
                    type="button"
                    onClick={() => setSelectedCity(cityTab.id)}
                    style={{
                      background: selectedCity === cityTab.id ? 'var(--accent, #7c3aed)' : 'transparent',
                      color: selectedCity === cityTab.id ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {cityTab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search filter input */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Kinoteatr yoki manzil bo'yicha qidirish..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, #1e1e1e)',
                  border: '1px solid var(--border, #2a2a2a)',
                  borderRadius: 10,
                  padding: '9px 12px 9px 36px',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: 12.5,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredCinemas.length > 0 ? (
                filteredCinemas.map((cinema, idx) => (
                  <div
                    key={cinema.id || idx}
                    style={{
                      background: 'var(--bg-input, #1e1e1e)',
                      border: '1px solid var(--border, #2a2a2a)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      transition: 'border-color 0.15s ease, transform 0.15s ease'
                    }}
                  >
                    {/* Left: Info */}
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                          {cinema.name}
                        </span>
                        {cinema.mall && (
                          <span style={{
                            background: 'rgba(124, 58, 237, 0.15)',
                            color: '#a78bfa',
                            border: '1px solid rgba(124, 58, 237, 0.3)',
                            borderRadius: 6,
                            padding: '1px 6px',
                            fontSize: 10.5,
                            fontWeight: 700
                          }}>
                            {cinema.mall}
                          </span>
                        )}
                        {cinema.distance_km && (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.07)',
                            color: 'var(--text-muted, #94a3b8)',
                            borderRadius: 6,
                            padding: '1px 6px',
                            fontSize: 10.5,
                            fontWeight: 600
                          }}>
                            ~{cinema.distance_km} km
                          </span>
                        )}
                      </div>

                      {cinema.address && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted, #94a3b8)', marginTop: 4, lineHeight: 1.4 }}>
                          {cinema.address}
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                      {/* Afisha link for specific cinema */}
                      <a
                        href={cinema.afisha_url || `https://www.afisha.uz/uz/search/?query=${encodeURIComponent(cinema.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          padding: '7px 12px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)' }}
                      >
                        <Calendar size={13} />
                        <span>Seanslar</span>
                      </a>

                      {/* Map Link */}
                      <a
                        href={cinema.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cinema.name + ' Toshkent')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          padding: '7px 12px',
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.22)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)' }}
                      >
                        <Navigation size={13} />
                        <span>Xarita</span>
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Film size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Kinoteatr topilmadi
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>
                    Qidiruv so'zini o'zgartirib ko'ring yoki yuqoridagi Afisha.uz havolasidan foydalaning.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
