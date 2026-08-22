import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Plus, Minus, RotateCcw, Sparkles, CheckCircle, Clock, Film, Star, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, Search, ListFilter, AlertCircle, ExternalLink, X, Calendar, PlusCircle, Check, Loader2, Trash2, Volume2, VolumeX, Maximize2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { api } from '../../config/api.js'
import { prefetchTrailer } from '../cards/MovieCard.jsx'

function formatVotes(n) {
  if (!n) return null
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function formatReleaseDate(dateStr, language = 'uz') {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    const localeMap = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }
    return d.toLocaleDateString(localeMap[language] || 'uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getSectionStyle(sec) {
  switch (sec) {
    case 'futured':
      return {
        color: '#a78bfa',
        badgeBg: 'rgba(167, 139, 250, 0.14)',
        badgeBorder: 'rgba(167, 139, 250, 0.35)',
        short: 'Futured'
      }
    case 'doing':
      return {
        color: '#34d399',
        badgeBg: 'rgba(52, 211, 153, 0.14)',
        badgeBorder: 'rgba(52, 211, 153, 0.35)',
        short: 'Going'
      }
    case 'done':
      return {
        color: '#60a5fa',
        badgeBg: 'rgba(96, 165, 250, 0.14)',
        badgeBorder: 'rgba(96, 165, 250, 0.35)',
        short: 'Done'
      }
    case 'todo':
    default:
      return {
        color: '#fbbf24',
        badgeBg: 'rgba(251, 191, 36, 0.14)',
        badgeBorder: 'rgba(251, 191, 36, 0.35)',
        short: 'To Do'
      }
  }
}

function getFranchiseBrand(item) {
  const key = String(item?.universe_key || item?.key || '').toLowerCase();
  const name = String(item?.name || item?.universe_name || '').toLowerCase();

  // Marvel Studios / MCU - Solid Vibrant Marvel Red Background
  if (key === 'mcu' || name.includes('marvel') || name.includes('mcu')) {
    return {
      name: 'Marvel Studios',
      logoUrl: 'https://image.tmdb.org/t/p/w500/hUzeosd33nzE5MCNsZxCGEKTXaQ.png',
      fallbackText: 'MARVEL',
      bgColor: '#ED1D24',
      border: '1.5px solid rgba(255, 255, 255, 0.45)',
      boxShadow: '0 3px 12px rgba(237, 29, 36, 0.4)',
      glow: 'rgba(237, 29, 36, 0.55)',
      padding: 3,
      textColor: '#ffffff'
    };
  }

  // DC Universe (DCU - James Gunn / Gods & Monsters) - Solid Pure White Background
  if (key === 'dcu' || name.includes('gods and monsters') || (name.includes('dc universe') && !name.includes('extended'))) {
    return {
      name: 'DC Studios',
      logoUrl: 'https://image.tmdb.org/t/p/w500/2Tc1P3Ac8M479naPp1kYT3izLS5.png',
      fallbackText: 'DC',
      bgColor: '#FFFFFF',
      border: '1.5px solid #0078f0',
      boxShadow: '0 3px 12px rgba(0, 120, 240, 0.35)',
      glow: 'rgba(0, 120, 240, 0.55)',
      padding: 3,
      textColor: '#0078f0'
    };
  }

  // DC Extended Universe (DCEU - Zack Snyder / 2013-2023) - Solid Pure White Background
  if (key === 'dceu' || name.includes('extended') || name.includes('dceu')) {
    return {
      name: 'DC Extended Universe',
      logoUrl: 'https://image.tmdb.org/t/p/w500/2Tc1P3Ac8M479naPp1kYT3izLS5.png',
      fallbackText: 'DC',
      bgColor: '#FFFFFF',
      border: '1.5px solid #0078f0',
      boxShadow: '0 3px 12px rgba(0, 120, 240, 0.35)',
      glow: 'rgba(0, 120, 240, 0.55)',
      padding: 3,
      textColor: '#0078f0'
    };
  }

  // Star Wars / Lucasfilm - Solid Pitch Black with Star Wars Yellow Border
  if (key === 'star_wars' || name.includes('star wars')) {
    return {
      name: 'Lucasfilm / Star Wars',
      logoUrl: 'https://image.tmdb.org/t/p/w500/tlVSws0RvvtPBwViUyOFAO0vcQS.png',
      fallbackText: 'SW',
      bgColor: '#000000',
      border: '2px solid #FFE81F',
      boxShadow: '0 0 12px rgba(255, 232, 31, 0.45)',
      glow: 'rgba(255, 232, 31, 0.65)',
      filter: 'brightness(1.4)',
      padding: 3,
      textColor: '#FFE81F'
    };
  }

  // Kurtlar Vadisi / Pana Film - Dark Stone Background with Crimson Red Border
  if (key === 'kurtlar_vadisi' || name.includes('kurtlar') || name.includes('wolves')) {
    return {
      name: 'Pana Film',
      logoUrl: 'https://image.tmdb.org/t/p/w500/1o1yIEtI1Fpwiq8it884t2szo0A.png',
      fallbackText: 'KV',
      bgColor: '#1c1917',
      border: '1.5px solid #ef4444',
      boxShadow: '0 3px 12px rgba(239, 68, 68, 0.4)',
      glow: 'rgba(239, 68, 68, 0.6)',
      filter: 'brightness(1.3)',
      padding: 3,
      textColor: '#ef4444'
    };
  }

  // Check if item has a poster_path
  if (item?.poster_path) {
    return {
      name: item.name,
      posterUrl: item.poster_path,
      fallbackText: (item.name || 'FR').slice(0, 2).toUpperCase(),
      bgColor: '#181825',
      border: '1.5px solid rgba(255, 255, 255, 0.35)',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.4)',
      glow: 'rgba(139, 92, 246, 0.4)',
      padding: 0,
      textColor: '#ffffff'
    };
  }

  const initials = (item?.name || 'Franchise')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('') || 'FR';

  return {
    name: item?.name || 'Franchise',
    fallbackText: initials,
    bgColor: '#7c3aed',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 3px 10px rgba(124, 58, 237, 0.35)',
    glow: 'rgba(124, 58, 237, 0.5)',
    padding: 0,
    textColor: '#ffffff'
  };
}

function FranchiseBadge({ item, size = 32, active = false, style = {} }) {
  const brand = getFranchiseBrand(item);
  const [imgError, setImgError] = useState(false);

  const paddingVal = brand.padding !== undefined ? brand.padding : (brand.logoUrl ? 3 : 0);

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        backgroundColor: brand.bgColor,
        background: brand.bgColor,
        border: active ? '2px solid #ffffff' : brand.border,
        boxShadow: active ? `0 0 14px ${brand.glow || 'rgba(255,255,255,0.7)'}` : brand.boxShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
        padding: paddingVal,
        boxSizing: 'border-box',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        ...style
      }}
    >
      {brand.logoUrl && !imgError ? (
        <img
          src={brand.logoUrl}
          alt={brand.name}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: brand.filter || 'none',
            display: 'block'
          }}
        />
      ) : brand.posterUrl && !imgError ? (
        <img
          src={brand.posterUrl}
          alt={brand.name}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      ) : (
        <span style={{ fontSize: size <= 28 ? 9 : 11, fontWeight: 900, color: brand.textColor || '#ffffff' }}>
          {brand.fallbackText}
        </span>
      )}
    </div>
  );
}

// Memoized SVG Bezier Cable Component with Hardware-Accelerated Vector Glow
const SpaceCable = React.memo(function SpaceCable({
  conn,
  CARD_W,
  CARD_H,
  isConnHovered,
  isAnyHovered
}) {
  const x1 = conn.from.x + CARD_W
  const y1 = conn.from.y + CARD_H / 2
  const x2 = conn.to.x
  const y2 = conn.to.y + CARD_H / 2
  const dx = (x2 - x1) * 0.5
  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

  if (isConnHovered) {
    return (
      <g>
        {/* Vector-based dual-path glow (smooth 60fps GPU acceleration without raster filters) */}
        <path
          d={d}
          fill="none"
          stroke="var(--space-cable-glow)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.45"
          style={{ transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <path
          d={d}
          fill="none"
          stroke="url(#cable-active-grad)"
          strokeWidth="2.4"
          strokeLinecap="round"
          style={{ transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
        <circle cx={x1} cy={y1} r="4.5" fill="var(--space-cable-active)" style={{ transition: 'all 0.18s ease' }} />
        <circle cx={x2} cy={y2} r="4.5" fill="var(--space-cable-active)" style={{ transition: 'all 0.18s ease' }} />
      </g>
    )
  }

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={isAnyHovered ? "rgba(128, 128, 128, 0.08)" : "var(--space-cable-default)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ transition: 'stroke 0.18s ease' }}
      />
      <circle cx={x1} cy={y1} r="3" fill={isAnyHovered ? "rgba(128, 128, 128, 0.12)" : "var(--space-cable-dot)"} style={{ transition: 'fill 0.18s ease' }} />
      <circle cx={x2} cy={y2} r="3" fill={isAnyHovered ? "rgba(128, 128, 128, 0.12)" : "var(--space-cable-dot)"} style={{ transition: 'fill 0.18s ease' }} />
    </g>
  )
})

// Memoized Space Node Card (Zero lag hover and scale animation)
const SpaceNodeCard = React.memo(function SpaceNodeCard({
  movie,
  x,
  y,
  id,
  CARD_W,
  CARD_H,
  isCardHovered,
  isConnectedToHovered,
  isAdding,
  onSelect,
  onHover,
  onAdd
}) {
  const { t } = useLanguage()
  return (
    <div
      className="space-card-clickable"
      onClick={() => onSelect(movie)}
      onMouseEnter={() => onHover(movie.id || id || movie.tmdb_id)}
      onMouseLeave={() => onHover(null)}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: CARD_W,
        height: CARD_H,
        background: isCardHovered ? 'var(--space-card-hover)' : 'var(--space-card-bg)',
        border: isCardHovered
          ? '1.5px solid var(--space-card-border-hover)'
          : isConnectedToHovered
            ? '1.5px solid rgba(124, 58, 237, 0.45)'
            : '1px solid var(--space-card-border)',
        borderRadius: 14,
        display: 'flex',
        cursor: 'pointer',
        zIndex: isCardHovered ? 12 : isConnectedToHovered ? 5 : 2,
        boxShadow: isCardHovered
          ? '0 16px 36px rgba(124, 58, 237, 0.25)'
          : isConnectedToHovered
            ? '0 10px 24px rgba(124, 58, 237, 0.15)'
            : 'var(--space-shadow)',
        transform: isCardHovered ? 'translate3d(0, -3px, 0) scale(1.02)' : 'translate3d(0, 0, 0) scale(1)',
        willChange: 'transform, box-shadow',
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
      }}
    >
      {/* Left Connector Handle */}
      <div style={{
        position: 'absolute',
        left: -5,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 10,
        height: 10,
        borderRadius: 5,
        background: isCardHovered || isConnectedToHovered ? 'var(--accent)' : 'var(--space-cable-dot)',
        border: '2px solid var(--space-card-bg)',
        boxShadow: isCardHovered || isConnectedToHovered ? '0 0 8px rgba(124, 58, 237, 0.9)' : 'none',
        transition: 'all 0.15s ease',
        zIndex: 3
      }} />

      {/* Right Connector Handle */}
      <div style={{
        position: 'absolute',
        right: -5,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 10,
        height: 10,
        borderRadius: 5,
        background: isCardHovered || isConnectedToHovered ? 'var(--accent)' : 'var(--space-cable-dot)',
        border: '2px solid var(--space-card-bg)',
        boxShadow: isCardHovered || isConnectedToHovered ? '0 0 8px rgba(124, 58, 237, 0.9)' : 'none',
        transition: 'all 0.15s ease',
        zIndex: 3
      }} />

      {/* Poster Thumbnail on Left */}
      <div style={{
        position: 'relative',
        width: 68,
        height: CARD_H,
        borderRadius: '13px 0 0 13px',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'var(--bg-input)'
      }}>
        <img
          src={movie.poster_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" fill="%23888"><rect width="60" height="90"/></svg>'}
          alt={movie.title}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
        {/* Index Pill Overlay */}
        <div style={{
          position: 'absolute',
          top: 4,
          left: 4,
          background: 'var(--space-panel-bg)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '2px 6px',
          fontSize: 10,
          fontWeight: 800,
          color: 'var(--accent)'
        }}>
          #{movie.chronology_index || 1}
        </div>
      </div>

      {/* Card Details on Right */}
      <div style={{
        flex: 1,
        minWidth: 0,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          {/* Movie Title */}
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            marginBottom: 3
          }}>
            {movie.title}
          </div>

          {/* Year & Rating Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>{movie.release_year || movie.release_date?.split('-')[0] || '-'}</span>
            {movie.rating ? (
              <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <Star size={11} fill="#fbbf24" color="#fbbf24" /> {movie.rating}
              </span>
            ) : null}
          </div>
        </div>

        {/* Status Badge & Quick Add */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {movie.in_board ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.35)',
              color: '#34d399',
              borderRadius: 6,
              padding: '2px 7px',
              fontSize: 10,
              fontWeight: 700
            }}>
              <CheckCircle size={10} />
              <span>{t(`sections.${movie.user_movie?.section || 'todo'}_short`, null, movie.user_movie?.section?.toUpperCase() || t('sections.badge_in_board'))}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => onAdd(movie, 'todo', e)}
              disabled={isAdding}
              style={{
                border: '1px solid rgba(124, 58, 237, 0.3)',
                background: 'rgba(124, 58, 237, 0.12)',
                color: 'var(--accent)',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124, 58, 237, 0.12)'; e.currentTarget.style.color = 'var(--accent)' }}
            >
              {isAdding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              <span>{t('common.add')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default function ChronologySpace({ targetTmdbId = null, targetMediaType = null }) {
  const { language, t } = useLanguage()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 300, y: 120 })
  const [isPanning, setIsPanning] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  // Real Data States
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [universeData, setUniverseData] = useState(null)
  
  // Sidebar States
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [viewedFranchises, setViewedFranchises] = useState([])
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [activeTmdbId, setActiveTmdbId] = useState(targetTmdbId)
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [hoveredFranchiseKey, setHoveredFranchiseKey] = useState(null)
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null)

  // Card Detail Modal States
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [addingMovieId, setAddingMovieId] = useState(null)
  const [selectedSection, setSelectedSection] = useState('todo')
  const [modalTrailer, setModalTrailer] = useState(null)
  const [isModalVideoReady, setIsModalVideoReady] = useState(false)
  const [isModalMuted, setIsModalMuted] = useState(true)
  const [isModalFullscreen, setIsModalFullscreen] = useState(false)
  const modalTrailerIframeRef = useRef(null)
  const modalTrailerContainerRef = useRef(null)

  useEffect(() => {
    if (!selectedMovie) {
      setModalTrailer(null)
      setIsModalMuted(true)
      setIsModalFullscreen(false)
      return
    }
    let active = true
    const tmdb_id = selectedMovie.tmdb_id || selectedMovie.id
    const movieTitle = selectedMovie.title || selectedMovie.name
    const isTv = selectedMovie.media_type === 'tv' || Boolean(selectedMovie.seasons && selectedMovie.seasons !== '-' && selectedMovie.seasons !== '—' && /season|ep/i.test(selectedMovie.seasons))

    const fn = (api && api.getMovieTrailer) ? api.getMovieTrailer : (window.api && window.api.getMovieTrailer ? window.api.getMovieTrailer : null)
    if (fn) {
      fn(tmdb_id, isTv ? 'tv' : 'movie', movieTitle)
        .then(res => {
          if (active && res?.trailer) {
            setModalTrailer(res.trailer)
          }
        })
        .catch(() => {})
    }
    return () => { active = false }
  }, [selectedMovie])

  useEffect(() => {
    if (!selectedMovie || !modalTrailer?.key) {
      setIsModalVideoReady(false)
      return
    }

    let active = true
    setIsModalVideoReady(false)
    const timer = setTimeout(() => {
      if (active) setIsModalVideoReady(true)
    }, 350)

    const handleMessage = (e) => {
      try {
        if (!e.data) return
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data.event === 'onStateChange' && (data.info === 1 || data.info === 3)) {
          if (active) setIsModalVideoReady(true)
        }
      } catch (_) {}
    }

    window.addEventListener('message', handleMessage)
    return () => {
      active = false
      clearTimeout(timer)
      window.removeEventListener('message', handleMessage)
    }
  }, [selectedMovie, modalTrailer?.key])

  const handleToggleModalMute = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const nextMute = !isModalMuted
    setIsModalMuted(nextMute)
    if (modalTrailerIframeRef.current?.contentWindow) {
      try {
        const cmd = nextMute ? 'mute' : 'unMute'
        modalTrailerIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: [] }),
          '*'
        )
        if (!nextMute) {
          modalTrailerIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
            '*'
          )
        }
      } catch (err) {}
    }
  }

  const handleToggleModalFullscreen = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const el = modalTrailerContainerRef.current || modalTrailerIframeRef.current
    if (!el) return

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
      setIsModalFullscreen(false)
    } else {
      const requestFs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen
      if (requestFs) {
        requestFs.call(el).then(() => setIsModalFullscreen(true)).catch(() => {
          modalTrailerIframeRef.current?.requestFullscreen?.().catch(() => {})
        })
      }
    }
  }

  useEffect(() => {
    const onFsChange = () => {
      setIsModalFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const canvasRef = useRef(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const rafRef = useRef(null)
  const wheelTimeoutRef = useRef(null)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  // 1. Fetch user's viewed franchises list & determine initial target franchise
  const fetchViewedFranchises = async () => {
    try {
      if (window.api && window.api.getViewedFranchises) {
        const list = await window.api.getViewedFranchises()
        if (Array.isArray(list)) {
          setViewedFranchises(list)
          return list
        }
      }
    } catch (e) {
      console.error('Failed to fetch viewed franchises:', e)
    }
    return []
  }

  // 2. Fetch specific franchise data by tmdb_id & media_type
  const loadFranchiseData = async (tmdbId, mediaType = null, lang = language) => {
    if (!tmdbId) return
    setLoading(true)
    setError(null)
    try {
      if (window.api && window.api.getFranchiseUniverse) {
        const data = await window.api.getFranchiseUniverse(tmdbId, mediaType, lang)
        setUniverseData(data)
        setActiveTmdbId(tmdbId)

        // Optimistically update viewedFranchises state so sidebar updates instantly
        if (data) {
          const fName = data.universe_name || data.collection_name || data.movies?.[0]?.title || 'Franchise'
          const fKey = data.universe_key || (data.universe_name ? data.universe_name : `movie_${tmdbId}`)
          const isUniv = !!data.is_universe
          const totalCount = data.total_movies || data.movies?.length || 0

          setViewedFranchises(prev => {
            const list = Array.isArray(prev) ? [...prev] : []
            const filtered = list.filter(item => {
              if (data.universe_key && (item.universe_key === data.universe_key || item.key === data.universe_key)) return false
              if (String(item.tmdb_id) === String(tmdbId)) return false
              if (item.name && item.name.toLowerCase().trim() === fName.toLowerCase().trim()) return false
              return true
            })
            filtered.unshift({
              key: fKey,
              universe_key: data.universe_key || null,
              tmdb_id: Number(tmdbId),
              media_type: mediaType || data.movies?.[0]?.media_type || 'movie',
              name: fName,
              is_universe: isUniv,
              total_movies: totalCount,
              last_viewed_at: new Date().toISOString()
            })
            return filtered.slice(0, 50)
          })
        }

        // Refresh viewed franchises list from backend
        fetchViewedFranchises()
      }
    } catch (err) {
      console.error('Failed loading franchise data:', err)
      setError(err.message || 'Xronologiya ma\'lumotlarini yuklashda xatolik yuz berdi.')
    } finally {
      setLoading(false)
    }
  }

  // Reload franchise universe when interface language changes
  useEffect(() => {
    if (activeTmdbId) {
      loadFranchiseData(activeTmdbId, universeData?.movies?.[0]?.media_type || null, language)
    }
  }, [language])

  // Remove franchise from viewed history
  const handleRemoveFranchise = async (item, e = null) => {
    if (e) {
      e.preventDefault?.()
      e.stopPropagation?.()
    }
    const itemKey = item.universe_key || item.key || item.tmdb_id
    const isCurrentActive = String(item.tmdb_id) === String(activeTmdbId) || (item.universe_key && universeData?.universe_key === item.universe_key)
    
    const remainingList = viewedFranchises.filter(f => {
      const k = f.universe_key || f.key || f.tmdb_id
      return k !== itemKey && f.name !== item.name
    })

    // Optimistically update frontend state
    setViewedFranchises(remainingList)
    setConfirmDeleteKey(null)

    // If active franchise was removed, automatically switch to top remaining franchise or reset canvas
    if (isCurrentActive) {
      if (remainingList.length > 0) {
        const next = remainingList[0]
        loadFranchiseData(next.tmdb_id, next.media_type)
      } else {
        setUniverseData(null)
        setActiveTmdbId(null)
      }
    }

    try {
      if (api && api.removeViewedFranchise) {
        await api.removeViewedFranchise(itemKey)
      } else if (window.api && window.api.removeViewedFranchise) {
        await window.api.removeViewedFranchise(itemKey)
      }
      setToastMessage(`"${item.name}" tarixdan olib tashlandi.`)
      setTimeout(() => setToastMessage(null), 3000)
    } catch (err) {
      console.warn('Failed removing franchise view:', err)
    }
  }

  // Initial load effect
  useEffect(() => {
    (async () => {
      const list = await fetchViewedFranchises()
      if (targetTmdbId) {
        loadFranchiseData(targetTmdbId, targetMediaType, language)
      } else if (list && list.length > 0 && list[0].tmdb_id) {
        loadFranchiseData(list[0].tmdb_id, list[0].media_type || null, language)
      } else {
        loadFranchiseData(1726, 'movie', language)
      }
    })()
  }, [targetTmdbId, targetMediaType])

  // Add Movie to User Board
  const handleAddMovieToBoard = async (movieToAdd, section = 'todo', e = null) => {
    if (e) e.stopPropagation()
    setAddingMovieId(movieToAdd.tmdb_id)
    try {
      const payload = {
        title: movieToAdd.title,
        tmdb_id: movieToAdd.tmdb_id,
        media_type: movieToAdd.media_type || 'movie',
        poster_path: movieToAdd.poster_path,
        rating: movieToAdd.rating,
        vote_count: movieToAdd.vote_count,
        genre: movieToAdd.genre || '-',
        director: movieToAdd.director || '-',
        overview: movieToAdd.overview || '',
        release_date: movieToAdd.release_date,
        release_year: movieToAdd.release_year,
        seasons: movieToAdd.seasons || '-',
        section
      }
      const created = await window.api.createMovie(payload)

      // Update in universeData
      setUniverseData(prev => {
        if (!prev) return prev
        const updatedMovies = prev.movies.map(m => {
          if (String(m.tmdb_id) === String(movieToAdd.tmdb_id)) {
            return { ...m, in_board: true, user_movie: created }
          }
          return m
        })
        return {
          ...prev,
          in_board_count: (prev.in_board_count || 0) + 1,
          movies: updatedMovies
        }
      })

      // Update selectedMovie if open
      setSelectedMovie(prev => (prev && String(prev.tmdb_id) === String(movieToAdd.tmdb_id)) ? { ...prev, in_board: true, user_movie: created } : prev)
      
      setToastMessage(`"${movieToAdd.title}" muvaffaqiyatli ustunga qo'shildi!`)
      setTimeout(() => setToastMessage(null), 3500)
    } catch (err) {
      console.error('Failed adding movie to board:', err)
      setToastMessage(`Xatolik: ${err.message}`)
      setTimeout(() => setToastMessage(null), 3500)
    } finally {
      setAddingMovieId(null)
    }
  }

  // Mouse drag panning handlers (RAF-batched)
  const handleMouseDown = (e) => {
    if (e.target.closest('.space-card-clickable') || e.target.closest('.space-controls') || e.target.closest('.space-sidebar') || e.target.closest('.space-modal')) {
      return
    }
    setIsPanning(true)
    setIsInteracting(true)
    setStartPos({ x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y })
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const nextX = e.clientX - startPos.x
    const nextY = e.clientY - startPos.y
    rafRef.current = requestAnimationFrame(() => {
      setPan({ x: nextX, y: nextY })
    })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setIsInteracting(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  // Native non-passive wheel listener for smooth 60fps/120fps zooming (RAF-batched)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      setIsInteracting(true)
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
      wheelTimeoutRef.current = setTimeout(() => {
        setIsInteracting(false)
      }, 150)

      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const curZoom = zoomRef.current
      const curPan = panRef.current

      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
      const newZoom = Math.min(Math.max(curZoom * zoomFactor, 0.35), 2.5)

      const newPanX = mouseX - (mouseX - curPan.x) * (newZoom / curZoom)
      const newPanY = mouseY - (mouseY - curPan.y) * (newZoom / curZoom)

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setZoom(newZoom)
        setPan({ x: newPanX, y: newPanY })
      })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
    }
  }, [])

  // Floating controls buttons
  const handleZoomIn = () => {
    setIsInteracting(false)
    const nextZoom = Math.min(zoom * 1.15, 2.5)
    setZoom(nextZoom)
  }
  const handleZoomOut = () => {
    setIsInteracting(false)
    const nextZoom = Math.max(zoom / 1.15, 0.35)
    setZoom(nextZoom)
  }
  const handleResetView = () => {
    setIsInteracting(false)
    setZoom(1)
    setPan({ x: sidebarOpen ? 300 : 80, y: 120 })
  }

  const movies = universeData?.movies || []
  const displayTitle = universeData?.universe_name || universeData?.collection_name || 'Kino Xronologiyasi'

  useEffect(() => {
    if (movies.length > 0) {
      movies.slice(0, 15).forEach(m => prefetchTrailer(m))
    }
  }, [movies])

  // Memoized DAG graph and node placement calculation (zero-cost during panning/zooming)
  const layoutData = useMemo(() => {
    const CARD_W = 280
    const CARD_H = 96
    const COL_STEP = 390
    const ROW_STEP = 132
    const BASE_Y = 240

    const hasExplicitLayout = movies.some(m => m.stage !== null && m.stage !== undefined)
    const positionedNodes = []
    const connections = []

    if (hasExplicitLayout) {
      // 1. Position nodes based on canonical story stages and character lanes
      movies.forEach((movie, idx) => {
        const stage = movie.stage !== undefined && movie.stage !== null ? movie.stage : idx
        const lane = movie.lane !== undefined && movie.lane !== null ? movie.lane : 0
        const x = (sidebarOpen ? 180 : 80) + stage * COL_STEP
        const y = BASE_Y + lane * ROW_STEP
        positionedNodes.push({ movie, x, y, id: movie.id || movie.tmdb_id || idx, stage, lane })
      })

      // 2. Build explicit DAG connections from connects_to
      positionedNodes.forEach(source => {
        const targets = source.movie.connects_to || []
        targets.forEach(targetId => {
          const targetNode = positionedNodes.find(n => String(n.movie?.id || n.movie?.tmdb_id) === String(targetId) || String(n.id) === String(targetId))
          if (targetNode) {
            connections.push({ from: source, to: targetNode })
          }
        })
      })
    } else {
      // Fallback: Intelligent multi-branch stages for general collections
      const pattern = movies.length <= 4 ? [1, 1, 1, 1] : [2, 3, 1, 3, 1, 3, 2, 3, 1, 3, 2, 3]
      const stages = []
      let curIdx = 0
      let pIdx = 0

      while (curIdx < movies.length) {
        const size = Math.min(pattern[pIdx % pattern.length], movies.length - curIdx)
        stages.push(movies.slice(curIdx, curIdx + size))
        curIdx += size
        pIdx++
      }

      stages.forEach((stageMovies, stageIdx) => {
        const totalInStage = stageMovies.length
        const stageNodes = stageMovies.map((movie, rowIdx) => {
          const x = (sidebarOpen ? 180 : 80) + stageIdx * COL_STEP
          const y = BASE_Y + (rowIdx - (totalInStage - 1) / 2) * ROW_STEP
          const node = { movie, x, y, stageIdx, rowIdx, id: movie.tmdb_id || `${stageIdx}_${rowIdx}` }
          positionedNodes.push(node)
          return node
        })

        if (stageIdx > 0) {
          const prevStageNodes = positionedNodes.filter(n => n.stageIdx === stageIdx - 1)
          if (prevStageNodes.length === 1) {
            stageNodes.forEach(target => connections.push({ from: prevStageNodes[0], to: target }))
          } else if (stageNodes.length === 1) {
            prevStageNodes.forEach(source => connections.push({ from: source, to: stageNodes[0] }))
          } else {
            prevStageNodes.forEach((source, sIdx) => {
              const targetIdx = Math.min(sIdx, stageNodes.length - 1)
              connections.push({ from: source, to: stageNodes[targetIdx] })
            })
          }
        }
      })
    }

    const maxX = positionedNodes.length > 0 ? Math.max(...positionedNodes.map(n => n.x)) : 1000
    const maxY = positionedNodes.length > 0 ? Math.max(...positionedNodes.map(n => n.y)) : 800

    return {
      CARD_W,
      CARD_H,
      positionedNodes,
      connections,
      maxX,
      maxY
    }
  }, [movies, sidebarOpen])

  // Callbacks for Memoized Cards
  const handleCardHover = useCallback((id, movie) => {
    setHoveredNodeId(id)
    if (movie) prefetchTrailer(movie)
  }, [])

  const handleCardSelect = useCallback((movie) => {
    prefetchTrailer(movie)
    setSelectedMovie(movie)
  }, [])

  const handleCardAdd = useCallback((movie, section, e) => {
    handleAddMovieToBoard(movie, section, e)
  }, [])

  // O(1) Fast lookup for nodes connected to the currently hovered node
  const connectedIdsSet = useMemo(() => {
    if (!hoveredNodeId) return new Set()
    const set = new Set()
    const targetStr = String(hoveredNodeId)
    layoutData.connections.forEach(c => {
      const fromId = String(c.from.id)
      const fromTmdb = String(c.from.movie?.id || c.from.movie?.tmdb_id || '')
      const toId = String(c.to.id)
      const toTmdb = String(c.to.movie?.id || c.to.movie?.tmdb_id || '')

      if (fromId === targetStr || fromTmdb === targetStr) {
        set.add(toId)
        if (toTmdb) set.add(toTmdb)
      }
      if (toId === targetStr || toTmdb === targetStr) {
        set.add(fromId)
        if (fromTmdb) set.add(fromTmdb)
      }
    })
    return set
  }, [hoveredNodeId, layoutData.connections])

  const filteredFranchises = viewedFranchises.filter(f => 
    !sidebarSearch.trim() || (f.name && f.name.toLowerCase().includes(sidebarSearch.toLowerCase().trim()))
  )

  // Dot pattern dynamically scales with zoom and uses low contrast
  const dotOpacity = Math.min(Math.max(0.045 * Math.sqrt(zoom), 0.02), 0.065).toFixed(3)
  const dotRadius = Math.max(0.9 * zoom, 0.5).toFixed(2)
  const gridSize = Math.max(28 * zoom, 10).toFixed(2)

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 52px)',
        overflow: 'hidden',
        background: 'var(--space-bg)',
        backgroundImage: `radial-gradient(var(--space-dot) ${dotRadius}px, transparent ${dotRadius}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor: isPanning ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* Collapsible Left Sidebar for Viewed Franchises */}
      <div
        className="space-sidebar"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 20,
          width: sidebarOpen ? 270 : 52,
          height: 'calc(100vh - 84px)',
          background: 'var(--space-panel-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--space-panel-border)',
          borderRadius: 24,
          boxShadow: 'var(--space-shadow)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Sidebar Header (When Open) */}
        {sidebarOpen && (
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--space-panel-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              <Sparkles size={16} color="var(--accent)" />
              <span>{t('space.franchises')} ({viewedFranchises.length})</span>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              title={t('common.close')}
              style={{
                border: 'none',
                background: 'var(--bg-input)',
                color: 'var(--text-secondary)',
                width: 28,
                height: 28,
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Sidebar Content (When Open) */}
        {sidebarOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '12px 14px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={t('space.searchFranchise')}
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '6px 10px 6px 30px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* List of Franchises */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
              {filteredFranchises.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 8px' }}>
                  {viewedFranchises.length === 0 ? t('space.noViewedFranchises') : t('space.noFranchisesFound')}
                </div>
              ) : (
                filteredFranchises.map((item, idx) => {
                  const itemKey = item.universe_key || item.key || (item.tmdb_id ? `movie_${item.tmdb_id}` : `idx_${idx}`)
                  const isActive = (item.universe_key && universeData?.universe_key === item.universe_key) || (item.tmdb_id && activeTmdbId === item.tmdb_id)
                  const countToDisplay = (item.universe_key && universeData?.universe_key === item.universe_key) ? universeData.movies.length : (item.total_movies || item.movie_count || 0)
                  const isHovered = hoveredFranchiseKey === itemKey
                  const isConfirmingDelete = confirmDeleteKey === itemKey

                  return (
                    <div
                      key={itemKey}
                      style={{ position: 'relative', width: '100%' }}
                      onMouseEnter={() => setHoveredFranchiseKey(itemKey)}
                      onMouseLeave={() => {
                        setHoveredFranchiseKey(null)
                        if (confirmDeleteKey === itemKey) setConfirmDeleteKey(null)
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!isConfirmingDelete) {
                            loadFranchiseData(item.tmdb_id, item.media_type)
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          paddingRight: isHovered || isConfirmingDelete ? 36 : 10,
                          borderRadius: 14,
                          width: '100%',
                          textAlign: 'left',
                          background: isActive ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.16), rgba(99, 102, 241, 0.08))' : 'var(--bg-card)',
                          border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)'
                        }}
                        onMouseLeave={e => {
                          if (!isActive) e.currentTarget.style.background = 'var(--bg-card)'
                        }}
                      >
                        <FranchiseBadge item={item} size={32} active={isActive} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginTop: 3 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {item.is_universe ? (
                                <>
                                  <Sparkles size={10} color="var(--accent)" />
                                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('space.universe')}</span>
                                </>
                              ) : (
                                <>
                                  <Film size={10} color="var(--text-secondary)" />
                                  <span>{t('space.franchise')}</span>
                                </>
                              )}
                            </span>
                            <span style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 8, color: 'var(--text-secondary)' }}>
                              {countToDisplay} {t('space.moviesCount')}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Delete from History Action Button */}
                      {(isHovered || isConfirmingDelete) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (isConfirmingDelete) {
                              handleRemoveFranchise(item, e)
                            } else {
                              setConfirmDeleteKey(itemKey)
                            }
                          }}
                          title={isConfirmingDelete ? t('space.confirmDelete', null, "O'chirishni tasdiqlang") : t('space.deleteFromHistory', null, "Tarixdan o'chirish")}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: isConfirmingDelete ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                            color: isConfirmingDelete ? '#ffffff' : '#f87171',
                            padding: isConfirmingDelete ? '4px 8px' : '6px',
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            transition: 'all 0.15s ease',
                            zIndex: 5
                          }}
                        >
                          <Trash2 size={12} />
                          {isConfirmingDelete && <span>{t('common.delete')}</span>}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          /* Collapsed Vertical Sidebar */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '14px 6px',
            gap: 10,
            flex: 1,
            overflowY: 'auto'
          }}>
            {/* Active Universe Round Logo */}
            <div
              onClick={() => setSidebarOpen(true)}
              title={`${universeData?.universe_name || 'Hozirgi franshiza'} (Panelni ochish)`}
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <FranchiseBadge
                item={{ universe_key: universeData?.universe_key, name: universeData?.universe_name }}
                size={36}
                active={true}
              />
            </div>

            {/* Expand Toggle Button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              title="Paneni ochish"
              style={{
                border: 'none',
                background: 'var(--bg-input)',
                color: 'var(--text-secondary)',
                width: 28,
                height: 28,
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <ChevronRight size={16} />
            </button>

            {filteredFranchises.length > 0 && (
              <div style={{ width: 24, height: 1, background: 'var(--space-panel-border)', margin: '4px 0' }} />
            )}

            {/* Quick-switch Mini Logos for All Franchises in History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', width: '100%' }}>
              {filteredFranchises.map((item, idx) => {
                const itemKey = item.universe_key || item.key || (item.tmdb_id ? `movie_${item.tmdb_id}` : `idx_${idx}`)
                const isActive = (item.universe_key && universeData?.universe_key === item.universe_key) || (item.tmdb_id && activeTmdbId === item.tmdb_id)

                return (
                  <button
                    key={itemKey}
                    type="button"
                    onClick={() => loadFranchiseData(item.tmdb_id, item.media_type)}
                    title={`${item.name} (${item.is_universe ? 'Koinot' : 'Franshiza'})`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      borderRadius: '50%',
                      transition: 'transform 0.15s ease',
                      opacity: isActive ? 1 : 0.65
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = isActive ? '1' : '0.65'; }}
                  >
                    <FranchiseBadge item={item} size={28} active={isActive} />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Banner inside Space */}
      {universeData && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: sidebarOpen ? 296 : 76,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--space-panel-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--space-panel-border)',
          borderRadius: 30,
          padding: '10px 20px',
          boxShadow: 'var(--space-shadow)',
          transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <Sparkles size={18} color="var(--accent)" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{displayTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {universeData?.is_universe ? t('space.canonicalOrder') : t('space.calledCollection')} · {movies.length} {t('space.moviesCount')} ({universeData?.in_board_count || 0} {t('space.inColumns')})
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no universe is selected / history is empty */}
      {!universeData && !loading && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: sidebarOpen ? 'calc(50% + 120px)' : '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: 440,
          padding: '36px 28px',
          background: 'var(--space-panel-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1px solid var(--space-panel-border)',
          boxShadow: 'var(--space-shadow)',
          transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          color: 'var(--text-primary)'
        }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <Sparkles size={28} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            {t('space.emptyHistoryTitle')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('space.emptyHistoryDesc')}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 15,
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
            {t('space.loadingChronology')}
          </div>
        </div>
      )}

      {/* Error Message Display */}
      {error && !loading && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 16,
          padding: '12px 20px',
          color: '#f87171',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Infinite/Pan Canvas Grid Viewport */}
      <div style={{
        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        transformOrigin: '0 0',
        willChange: 'transform',
        position: 'absolute',
        top: 0,
        left: 0,
        transition: isInteracting || isPanning ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {(() => {
          const { CARD_W, CARD_H, positionedNodes, connections, maxX, maxY } = layoutData

          return (
            <div style={{ position: 'relative', width: maxX + 600, height: maxY + 400 }}>
              {/* SVG Layer for Bezier Connection Cables & Junctions */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                <defs>
                  <linearGradient id="cable-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--space-cable-active)" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
                    <stop offset="100%" stopColor="var(--space-cable-active)" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {connections.map((conn, cIdx) => {
                  const isConnHovered = hoveredNodeId && (
                    String(conn.from.id) === String(hoveredNodeId) ||
                    String(conn.to.id) === String(hoveredNodeId) ||
                    String(conn.from.movie?.id || conn.from.movie?.tmdb_id) === String(hoveredNodeId) ||
                    String(conn.to.movie?.id || conn.to.movie?.tmdb_id) === String(hoveredNodeId)
                  )

                  return (
                    <SpaceCable
                      key={`conn_${cIdx}`}
                      conn={conn}
                      CARD_W={CARD_W}
                      CARD_H={CARD_H}
                      isConnHovered={isConnHovered}
                      isAnyHovered={!!hoveredNodeId}
                    />
                  )
                })}
              </svg>

              {/* Positioned Node Cards (Horizontal Board Card Style) */}
              {positionedNodes.map(({ movie, x, y, id }) => {
                const isCardHovered = String(hoveredNodeId) === String(id) || String(movie.id) === String(hoveredNodeId) || String(movie.tmdb_id) === String(hoveredNodeId)
                const isConnectedToHovered = !isCardHovered && (
                  connectedIdsSet.has(String(id)) ||
                  connectedIdsSet.has(String(movie.id)) ||
                  connectedIdsSet.has(String(movie.tmdb_id))
                )
                const isAdding = addingMovieId === movie.tmdb_id

                return (
                  <SpaceNodeCard
                    key={movie.id || movie.tmdb_id || movie.title}
                    movie={movie}
                    x={x}
                    y={y}
                    id={id}
                    CARD_W={CARD_W}
                    CARD_H={CARD_H}
                    isCardHovered={isCardHovered}
                    isConnectedToHovered={isConnectedToHovered}
                    isAdding={isAdding}
                    onSelect={handleCardSelect}
                    onHover={handleCardHover}
                    onAdd={handleCardAdd}
                  />
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Floating Canvas Controls (Zoom In, Zoom Out, Reset Center) */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--space-panel-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--space-panel-border)',
        borderRadius: 30,
        padding: '6px 12px',
        boxShadow: 'var(--space-shadow)'
      }}>
        <button
          onClick={handleZoomOut}
          title={t('space.zoomOut')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><Minus size={15} /></button>
        
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', minWidth: 42, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          title={t('space.zoomIn')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><Plus size={15} /></button>

        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />

        <button
          onClick={handleResetView}
          title={t('space.resetView')}
          style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><RotateCcw size={14} /></button>
      </div>

      {/* Movie Detail Modal (Interactive Detail Portal) */}
      {selectedMovie && ReactDOM.createPortal(
        <div
          onClick={() => setSelectedMovie(null)}
          className="space-modal smooth-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="smooth-modal-content"
            style={{
              position: 'relative',
              width: 'min(920px, 95vw)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--space-modal-bg)',
              border: '1px solid var(--space-modal-border)',
              borderRadius: 24,
              boxShadow: 'var(--space-shadow)',
              color: 'var(--text-primary)'
            }}
          >
            {/* Modal Header Banner with Background Video Trailer */}
            <div
              ref={modalTrailerContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: 330,
                overflow: 'hidden',
                borderRadius: '24px 24px 0 0',
                background: '#09090b',
                borderBottom: '1px solid var(--border)'
              }}
            >
              {modalTrailer?.key ? (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  <iframe
                    ref={modalTrailerIframeRef}
                    src={`https://www.youtube-nocookie.com/embed/${modalTrailer.key}?autoplay=1&mute=1&controls=0&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&loop=1&playlist=${modalTrailer.key}&disablekb=1&widget_referrer=${window.location.origin}`}
                    title={`${selectedMovie.title} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      top: '-20%',
                      left: '-15%',
                      width: '130%',
                      height: '140%',
                      border: 'none',
                      pointerEvents: 'none',
                      display: 'block'
                    }}
                  />

                  {/* Smooth Cover Poster Backdrop while YouTube initial splash/controls fade */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: isModalVideoReady ? 0 : 1,
                      transition: 'opacity 0.5s ease',
                      pointerEvents: 'none',
                      background: '#09090b',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={selectedMovie.poster_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" fill="%23888"><rect width="60" height="90"/></svg>'}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(20px) brightness(0.45)',
                        transform: 'scale(1.2)',
                        display: 'block'
                      }}
                    />
                  </div>

                  {/* Cinematic Bottom & Edge Vignette Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.75) 100%)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              ) : (
                <>
                  <img
                    src={selectedMovie.poster_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" fill="%23888"><rect width="60" height="90"/></svg>'}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'blur(20px) brightness(0.45)',
                      transform: 'scale(1.2)',
                      display: 'block'
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.7) 100%)' }} />
                </>
              )}

              {/* Action Buttons: Mute/Unmute, Fullscreen, and Close */}
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  zIndex: 20
                }}
              >
                {modalTrailer?.key && (
                  <>
                    {/* 1. Mute/Unmute Toggle */}
                    <button
                      type="button"
                      onClick={handleToggleModalMute}
                      title={isModalMuted ? "Ovozni yoqish (Unmute)" : "Ovozsiz qilish (Mute)"}
                      style={{
                        border: isModalMuted ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(147, 197, 253, 0.6)',
                        background: isModalMuted ? 'rgba(0, 0, 0, 0.65)' : 'rgba(59, 130, 246, 0.85)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        color: '#ffffff',
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {isModalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>

                    {/* 2. Fullscreen Button */}
                    <button
                      type="button"
                      onClick={handleToggleModalFullscreen}
                      title="Kattalashtirish (Fullscreen)"
                      style={{
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        color: '#ffffff',
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </>
                )}

                {/* 3. Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedMovie(null)}
                  title={t('common.close')}
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: '#ffffff',
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 1)'
                    e.currentTarget.style.color = '#fff'
                    e.currentTarget.style.transform = 'scale(1.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Poster & Main Header Info */}
              <div style={{ position: 'absolute', bottom: 18, left: 28, right: 28, display: 'flex', gap: 22, alignItems: 'flex-end', zIndex: 5 }}>
                <img
                  src={selectedMovie.poster_path}
                  alt={selectedMovie.title}
                  style={{
                    width: 130,
                    height: 190,
                    objectFit: 'cover',
                    borderRadius: 16,
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7)',
                    border: '2px solid rgba(255, 255, 255, 0.25)',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      background: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '3px 10px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#c084fc'
                    }}>
                      #{selectedMovie.chronology_index || 1}
                    </span>
                    {selectedMovie.rating ? (
                      <span style={{
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(251, 191, 36, 0.35)',
                        padding: '3px 9px',
                        borderRadius: 10,
                        color: '#fbbf24',
                        fontSize: 12.5,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Star size={13} fill="#fbbf24" color="#fbbf24" /> {selectedMovie.rating}
                      </span>
                    ) : null}
                  </div>
                  <div style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.25,
                    textShadow: '0 2px 16px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.8)'
                  }}>
                    {selectedMovie.title}
                  </div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.85)',
                    marginTop: 5,
                    textShadow: '0 1px 6px rgba(0,0,0,0.9)'
                  }}>
                    {selectedMovie.release_year || selectedMovie.release_date?.split('-')[0] || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body Info */}
            <div style={{ padding: '28px 34px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Board Status Pill / Add Button */}
              {(() => {
                const sStyle = getSectionStyle(selectedMovie.user_movie?.section)
                return (
                  <div style={{
                    background: 'var(--space-panel-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16
                  }}>
                    {selectedMovie.in_board ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: 'rgba(52, 211, 153, 0.15)',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#34d399'
                          }}>
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('space.inYourColumn')}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('space.inBoardStatus')}</div>
                          </div>
                        </div>
                        <div style={{
                          background: sStyle.badgeBg,
                          border: `1px solid ${sStyle.badgeBorder}`,
                          color: sStyle.color,
                          borderRadius: 12,
                          padding: '7px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: sStyle.color }} />
                          {t(`sections.${selectedMovie.user_movie?.section || 'todo'}_short`, null, sStyle.short)}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: 'rgba(139, 92, 246, 0.14)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)'
                          }}>
                            <Plus size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('space.notInYourColumn')}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('space.selectColumnHint', null, 'Kerakli ustunga bitta bosish bilan qo\'shing:')}</div>
                          </div>
                        </div>

                        {/* NoteLab 4-Column Sleek Quick-Add Buttons */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: 12,
                          marginTop: 2
                        }}>
                          {[
                            { key: 'todo', label: t('sections.todo'), dot: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.25)', glow: 'rgba(251, 191, 36, 0.25)' },
                            { key: 'futured', label: t('sections.futured'), dot: '#a78bfa', bg: 'rgba(167, 139, 250, 0.08)', border: 'rgba(167, 139, 250, 0.25)', glow: 'rgba(167, 139, 250, 0.25)' },
                            { key: 'doing', label: t('sections.doing'), dot: '#34d399', bg: 'rgba(52, 211, 153, 0.08)', border: 'rgba(52, 211, 153, 0.25)', glow: 'rgba(52, 211, 153, 0.25)' },
                            { key: 'done', label: t('sections.done'), dot: '#60a5fa', bg: 'rgba(96, 165, 250, 0.08)', border: 'rgba(96, 165, 250, 0.25)', glow: 'rgba(96, 165, 250, 0.25)' },
                          ].map(col => {
                            const isThisLoading = addingMovieId === `${selectedMovie.tmdb_id}_${col.key}` || (addingMovieId === selectedMovie.tmdb_id && selectedSection === col.key)
                            return (
                              <button
                                key={col.key}
                                type="button"
                                onClick={() => {
                                  setSelectedSection(col.key)
                                  handleAddMovieToBoard(selectedMovie, col.key)
                                }}
                                disabled={Boolean(addingMovieId)}
                                style={{
                                  background: col.bg,
                                  border: `1px solid ${col.border}`,
                                  borderRadius: 16,
                                  padding: '14px 12px',
                                  cursor: Boolean(addingMovieId) ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 7,
                                  color: col.dot,
                                  transition: 'all 0.18s ease',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}
                                onMouseEnter={e => {
                                  if (!addingMovieId) {
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                    e.currentTarget.style.borderColor = col.dot
                                    e.currentTarget.style.boxShadow = `0 6px 14px ${col.glow}`
                                  }
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.transform = 'translateY(0)'
                                  e.currentTarget.style.borderColor = col.border
                                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'
                                }}
                              >
                                {isThisLoading ? (
                                  <Loader2 size={18} className="animate-spin" style={{ color: col.dot }} />
                                ) : (
                                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.dot, flexShrink: 0, boxShadow: `0 0 8px ${col.dot}` }} />
                                )}
                                <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  {col.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tags & Meta Details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13 }}>
                {selectedMovie.release_date && (
                  <span style={{ background: 'var(--space-chip-bg)', borderRadius: 10, padding: '7px 15px', color: 'var(--space-chip-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="var(--accent)" /> {formatReleaseDate(selectedMovie.release_date, language)}
                  </span>
                )}
                {selectedMovie.genre && selectedMovie.genre !== '-' && (
                  <span style={{ background: 'var(--space-chip-bg)', borderRadius: 10, padding: '7px 15px', color: 'var(--space-chip-color)' }}>
                    {selectedMovie.genre}
                  </span>
                )}
                {selectedMovie.director && selectedMovie.director !== '-' && (
                  <span style={{ background: 'var(--space-chip-bg)', borderRadius: 10, padding: '7px 15px', color: 'var(--space-chip-color)' }}>
                    {t('card.director')}: {selectedMovie.director}
                  </span>
                )}
                {selectedMovie.seasons && selectedMovie.seasons !== '-' && (
                  <span style={{ background: 'var(--space-chip-bg)', borderRadius: 10, padding: '7px 15px', color: 'var(--space-chip-color)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} color="var(--accent)" /> {selectedMovie.seasons}
                  </span>
                )}
              </div>

              {/* Overview / Story Plot */}
              {selectedMovie.overview && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('space.storyPlot')}
                  </div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                    {selectedMovie.overview}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Notification Toast */}
      {toastMessage && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999999,
          background: 'rgba(18, 19, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          color: '#a78bfa',
          border: '1px solid rgba(167, 139, 250, 0.4)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
          borderRadius: 30,
          padding: '10px 22px',
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Sparkles size={16} color="#a78bfa" />
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}
    </div>
  )
}
