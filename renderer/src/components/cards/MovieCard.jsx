import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Star, Calendar, X, Trash2, Clock, Sparkles, Film, Check, Play, Ticket, ExternalLink, MapPin, Volume2, VolumeX, Maximize2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { getStoredUserLocation } from '../../services/geo.js'
import { api } from '../../config/api.js'
import CinemasModal from '../modals/CinemasModal.jsx'

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

function formatCardRuntime(str) {
  if (!str || str === '-' || str === '—') return null
  return str.replace(/\s*\(\d+\s*min\)$/i, '')
}

const trailerClientCache = new Map()

export function prefetchTrailer(movie, title) {
  if (!movie) return
  const tmdb_id = movie.tmdb_id
  const movieTitle = title || movie.title || movie.name
  if (!tmdb_id && !movieTitle) return
  const isTv = movie.media_type === 'tv' || Boolean(movie.seasons && movie.seasons !== '-' && movie.seasons !== '—' && /season|ep/i.test(movie.seasons))
  const cacheKey = `${tmdb_id || movieTitle}_${isTv ? 'tv' : 'movie'}`.toLowerCase()
  if (trailerClientCache.has(cacheKey)) return

  const fn = (api && api.getMovieTrailer) ? api.getMovieTrailer : (window.api && window.api.getMovieTrailer ? window.api.getMovieTrailer : null)
  if (fn) {
    fn(tmdb_id, isTv ? 'tv' : 'movie', movieTitle)
      .then(res => {
        if (res?.trailer) {
          trailerClientCache.set(cacheKey, res.trailer)
        }
      })
      .catch(() => {})
  }
}

function MovieRatingModal({ movie, currentRating, onRate, onClose }) {
  const [hoverVal, setHoverVal] = useState(null)
  const [selectedVal, setSelectedVal] = useState(currentRating || 0)

  const activeVal = hoverVal !== null ? hoverVal : selectedVal

  const getRatingLabel = (val) => {
    if (!val) return 'Baholash uchun yulduzni tanlang'
    if (val === 10) return '🌟 10/10 — Şahona asar (Masterpiece)'
    if (val === 9) return '🔥 9/10 — Ajoyib (Outstanding)'
    if (val === 8) return '👍 8/10 — Juda yaxshi (Very Good)'
    if (val === 7) return '👌 7/10 — Yaxshi (Good)'
    if (val === 6) return '😐 6/10 — O\'rtacha (Average)'
    if (val === 5) return '😕 5/10 — Qoniqarsiz (Below Average)'
    if (val === 4) return '👎 4/10 — Yomon (Poor)'
    return `💔 ${val}/10 — Tavsiya etilmaydi`
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(400px, 92vw)',
          background: 'var(--bg-surface, #18181b)',
          border: '1px solid var(--border, #27272a)',
          borderRadius: 20,
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Star size={18} color="#60a5fa" fill="#60a5fa" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Filmga baho bering
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {movie?.title || 'Film'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-input, rgba(255,255,255,0.06))',
              color: 'var(--text-muted)',
              width: 30,
              height: 30,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Dynamic Label Badge */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 12,
          padding: '10px 14px',
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: '#93c5fd',
          minHeight: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {getRatingLabel(activeVal)}
        </div>

        {/* 10 Interactive Glowing Stars */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 8px',
            background: 'var(--bg-input, rgba(255,255,255,0.03))',
            borderRadius: 14,
            border: '1px solid var(--border)'
          }}
          onMouseLeave={() => setHoverVal(null)}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(starNum => {
            const isFilled = starNum <= activeVal
            return (
              <button
                key={starNum}
                type="button"
                onClick={() => {
                  setSelectedVal(starNum)
                  onRate(starNum)
                  onClose()
                }}
                onMouseEnter={() => setHoverVal(starNum)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
              >
                <Star
                  size={21}
                  fill={isFilled ? '#60a5fa' : 'none'}
                  color={isFilled ? '#60a5fa' : 'rgba(255,255,255,0.2)'}
                  style={{
                    transition: 'all 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: hoverVal === starNum ? 'scale(1.35)' : 'scale(1)',
                    filter: isFilled ? 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.6))' : 'none'
                  }}
                />
              </button>
            )
          })}
        </div>

        {/* Quick Numbers Selection Grid (1 to 10) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => {
                setSelectedVal(num)
                onRate(num)
                onClose()
              }}
              onMouseEnter={() => setHoverVal(num)}
              onMouseLeave={() => setHoverVal(null)}
              style={{
                padding: '7px 0',
                background: (num === selectedVal) ? '#2563eb' : (num === activeVal) ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-input, rgba(255,255,255,0.05))',
                color: (num === selectedVal || num === activeVal) ? '#ffffff' : 'var(--text-muted)',
                border: (num === selectedVal) ? '1px solid #3b82f6' : '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          {currentRating ? (
            <button
              type="button"
              onClick={() => {
                onRate(null)
                onClose()
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Trash2 size={13} />
              <span>Bahoni o'chirish</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-input, rgba(255,255,255,0.08))',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  )
}

let activeWindowScrollRaf = null

// Custom animated scroll that follows the speed graph (fast explosive start, long smooth exponential glide)
function smoothSlideWindowTo(targetY, targetX, duration = 280) {
  if (activeWindowScrollRaf) {
    cancelAnimationFrame(activeWindowScrollRaf)
    activeWindowScrollRaf = null
  }

  const startY = window.pageYOffset || document.documentElement.scrollTop || 0
  const startX = window.pageXOffset || document.documentElement.scrollLeft || 0
  const deltaY = targetY - startY
  const deltaX = targetX - startX

  if (Math.abs(deltaY) < 1 && Math.abs(deltaX) < 1) return

  const startTime = performance.now()

  // Easing curve: rapid initial acceleration, long exponential deceleration
  function easeOutSpeedGraph(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10.5 * t)
  }

  function step(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeOutSpeedGraph(progress)

    const nextY = Math.round(startY + deltaY * eased)
    const nextX = Math.round(startX + deltaX * eased)

    window.scrollTo(nextX, nextY)

    if (progress < 1) {
      activeWindowScrollRaf = requestAnimationFrame(step)
    } else {
      activeWindowScrollRaf = null
      window.scrollTo(Math.round(targetX), Math.round(targetY))
    }
  }

  activeWindowScrollRaf = requestAnimationFrame(step)
}

function centerCardEquator(el, duration = 280) {
  if (!el) return

  const rect = el.getBoundingClientRect()
  const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0
  const currentScrollX = window.pageXOffset || document.documentElement.scrollLeft || 0
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1200

  // 1. Visible boundary: between sticky header bottom and screen bottom
  const myCol = el.closest('.note-column')
  const headerEl = myCol?.querySelector('.column-header-sticky') || document.querySelector('.column-header-sticky')
  const topBoundary = headerEl ? headerEl.getBoundingClientRect().bottom : 96
  const bottomBoundary = viewportHeight
  const visibleAreaHeight = Math.max(200, bottomBoundary - topBoundary)

  // 2. Expected expanded height of the card
  const expectedCardHeight = rect.height > 250 ? rect.height : 620

  // 3. Target on-screen top so the card is centered symmetrically in the visible opening
  let targetScreenTop = topBoundary + 12
  if (expectedCardHeight < visibleAreaHeight) {
    targetScreenTop = topBoundary + Math.round((visibleAreaHeight - expectedCardHeight) / 2)
  }

  // 4. Current absolute top of card on document
  const cardAbsoluteTop = currentScrollY + rect.top

  // 5. Target scroll position
  const targetScrollY = Math.max(0, Math.round(cardAbsoluteTop - targetScreenTop))

  const cardCenterX = rect.left + currentScrollX + (rect.width / 2)
  const targetScrollX = Math.max(0, Math.round(cardCenterX - (viewportWidth / 2)))

  smoothSlideWindowTo(targetScrollY, targetScrollX, duration)
}

function MovieCard({
  movie,
  sectionKey,
  isExpanded = false,
  onToggleExpand,
  onClose,
  onMoveSection,
  onRate,
  onContextMenu,
  noDrag,
  onDragStart,
  onDragEnd,
  onDelete,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  onOpenChronology
}) {
  const {
    language,
    t,
    getMovieTitle,
    getMovieOverview,
    getMovieGenre,
    getMovieDirector,
    fetchSingleMovieTranslation
  } = useLanguage()

  const displayTitle = getMovieTitle(movie)
  const displayOverview = getMovieOverview(movie)
  const displayGenre = getMovieGenre(movie)
  const displayDirector = getMovieDirector(movie)

  const [localExpanded, setLocalExpanded] = useState(false)
  const isCardExpanded = (onToggleExpand !== undefined || isExpanded !== undefined) ? Boolean(isExpanded) : localExpanded

  const [renderExpanded, setRenderExpanded] = useState(isCardExpanded)
  const [isOpen, setIsOpen] = useState(isCardExpanded)
  const [isClosing, setIsClosing] = useState(false)
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    if (isCardExpanded) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setRenderExpanded(true)
      setIsClosing(false)
      setIsOpen(true)
      
      // Immediately on frame 0, trigger seamless speed-graph slide alongside card morph
      const raf = requestAnimationFrame(() => {
        centerCardEquator(cardRef.current, 280)
      })

      // Settle at exact final equatorial center when morph finishes
      const t = setTimeout(() => {
        centerCardEquator(cardRef.current, 120)
      }, 280)

      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(t)
      }
    } else {
      setIsOpen(false)
      setIsClosing(true)
      setIsOverviewExpanded(false)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setRenderExpanded(false)
        setIsClosing(false)
      }, 280)
      return () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      }
    }
  }, [isCardExpanded])

  useEffect(() => {
    if (isCardExpanded && isOverviewExpanded) {
      const t = setTimeout(() => centerCardEquator(cardRef.current), 80)
      return () => clearTimeout(t)
    }
  }, [isOverviewExpanded, isCardExpanded])

  const handleClose = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (onClose) {
      onClose()
    } else if (onToggleExpand) {
      onToggleExpand()
    } else {
      setLocalExpanded(false)
    }
  }

  const handleExpand = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (Date.now() - touchStartPos.current.time < 350 && isTouchDraggingRef.current) return
    if (onToggleExpand) {
      onToggleExpand()
    } else {
      setLocalExpanded(true)
    }
  }

  const [hovered, setHovered] = useState(false)
  const [isTouchDragging, setIsTouchDragging] = useState(false)
  const [dragMetrics, setDragMetrics] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0, width: 260, height: 116 })
  const dragMetricsRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0, width: 260, height: 116 })
  const portalGhostRef = useRef(null)
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 })
  const [userRating, setUserRating] = useState(movie?.user_rating || null)
  const [watchProvider, setWatchProvider] = useState(null)
  const [cinemasCount, setCinemasCount] = useState(0)
  const [showCinemasModal, setShowCinemasModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [trailer, setTrailer] = useState(null)
  const [trailerLoading, setTrailerLoading] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const trailerIframeRef = useRef(null)
  const trailerContainerRef = useRef(null)
  const isFuture = (movie.section === 'futured' || sectionKey === 'futured') && !movie.rating
  const isTvSeries = movie?.media_type === 'tv' || Boolean(movie?.seasons && movie.seasons !== '-' && movie.seasons !== '—' && /season|ep/i.test(movie.seasons))
  const effectiveUserRating = userRating || movie?.user_rating || movie?.avg_user_rating

  const handleToggleMute = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const nextMute = !isMuted
    setIsMuted(nextMute)
    if (trailerIframeRef.current?.contentWindow) {
      try {
        const cmd = nextMute ? 'mute' : 'unMute'
        trailerIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: cmd, args: [] }),
          '*'
        )
        if (!nextMute) {
          trailerIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }),
            '*'
          )
        }
      } catch (err) {
        console.warn('Trailer audio toggle error:', err)
      }
    }
  }

  const handleToggleFullscreen = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const el = trailerContainerRef.current || trailerIframeRef.current
    if (!el) return

    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    } else {
      const requestFs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen
      if (requestFs) {
        requestFs.call(el).then(() => {
          setIsFullscreen(true)
        }).catch(() => {
          trailerIframeRef.current?.requestFullscreen?.().catch(() => {})
        })
      }
    }
  }

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    setUserRating(movie?.user_rating || null)
  }, [movie?.user_rating])

  useEffect(() => {
    if (isCardExpanded && movie?.tmdb_id && language === 'ru') {
      fetchSingleMovieTranslation(movie.tmdb_id, movie.media_type)
    }
  }, [isCardExpanded, movie?.tmdb_id, movie?.media_type, language])

  useEffect(() => {
    if (movie?.tmdb_id || movie?.title) {
      prefetchTrailer(movie, displayTitle)
    }
  }, [movie?.tmdb_id, movie?.title, displayTitle])

  useEffect(() => {
    if (!isCardExpanded) return
    if (!movie?.tmdb_id && !movie?.title) return
    const isTv = movie?.media_type === 'tv' || Boolean(movie?.seasons && movie.seasons !== '-' && movie.seasons !== '—' && /season|ep/i.test(movie.seasons))
    const cacheKey = `${movie.tmdb_id || movie.title || displayTitle}_${isTv ? 'tv' : 'movie'}`.toLowerCase()

    if (trailerClientCache.has(cacheKey)) {
      setTrailer(trailerClientCache.get(cacheKey))
      return
    }

    let active = true
    setTrailerLoading(true)

    const fetchTrailer = (api && api.getMovieTrailer) ? api.getMovieTrailer : (window.api && window.api.getMovieTrailer ? window.api.getMovieTrailer : null)
    if (fetchTrailer) {
      fetchTrailer(movie.tmdb_id, isTv ? 'tv' : 'movie', movie.title || displayTitle)
        .then(res => {
          if (res?.trailer) {
            trailerClientCache.set(cacheKey, res.trailer)
            if (active) setTrailer(res.trailer)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setTrailerLoading(false)
        })
    }
    return () => { active = false }
  }, [isCardExpanded, movie?.tmdb_id, movie?.media_type, movie?.title, movie?.seasons, displayTitle])

  useEffect(() => {
    if (!isCardExpanded || !trailer?.key) {
      setIsVideoReady(false)
      return
    }

    let active = true
    setIsVideoReady(false)
    const timer = setTimeout(() => {
      if (active) setIsVideoReady(true)
    }, 350)

    const handleMessage = (e) => {
      try {
        if (!e.data) return
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data.event === 'onStateChange' && (data.info === 1 || data.info === 3)) {
          if (active) setIsVideoReady(true)
        }
      } catch (_) {}
    }

    window.addEventListener('message', handleMessage)
    return () => {
      active = false
      clearTimeout(timer)
      window.removeEventListener('message', handleMessage)
    }
  }, [isCardExpanded, trailer?.key])

  useEffect(() => {
    if (!isCardExpanded) return
    let active = true
    const geo = getStoredUserLocation()
    const title = movie?.title || movie?.name || ''
    const isTv = movie?.media_type === 'tv' || Boolean(movie?.seasons && movie.seasons !== '-' && movie.seasons !== '—' && /season|ep/i.test(movie.seasons))

    async function loadProvidersAndCinemas() {
      try {
        const promises = [
          window.api.getWatchProviders(movie.tmdb_id, isTv ? 'tv' : 'movie', geo.countryCode, title).catch(() => null)
        ]
        if (!isTv) {
          promises.push(window.api.getNearbyCinemas(geo.lat, geo.lon, title, geo.city, geo.countryCode).catch(() => null))
        }
        const [wpData, cinData] = await Promise.all(promises)
        if (active) {
          if (wpData?.primary_provider) setWatchProvider(wpData.primary_provider)
          if (cinData?.count !== undefined) setCinemasCount(cinData.count)
        }
      } catch (err) {
        console.warn('Failed loading providers or cinemas:', err)
      }
    }
    loadProvidersAndCinemas()
    return () => { active = false }
  }, [isCardExpanded, movie?.tmdb_id, movie?.media_type, movie?.title, movie?.seasons])

  useEffect(() => {
    const handleCinemaOpen = (e) => {
      if (e.detail && e.detail !== movie.id) {
        setShowCinemasModal(false)
      }
    }
    window.addEventListener('notelab_open_cinema_modal', handleCinemaOpen)
    return () => window.removeEventListener('notelab_open_cinema_modal', handleCinemaOpen)
  }, [movie.id])

  const handleRate = async (newRating) => {
    setUserRating(newRating)
    if (movie) movie.user_rating = newRating
    if (onRate) {
      onRate(newRating)
    } else {
      try {
        await window.api.updateMovie(movie.id, { user_rating: newRating })
      } catch (err) {
        console.error('Failed to save user rating:', err)
      }
    }
  }

  const isTouchDevice = typeof window !== "undefined" && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  const touchStartPos = useRef({ x: 0, y: 0, time: 0 })
  const isTouchDraggingRef = useRef(false)
  const isTouchSessionRef = useRef(false)
  const longPressTimerRef = useRef(null)
  const isLongPressTriggeredRef = useRef(false)
  const touchMovedRef = useRef(false)
  const cardRef = useRef(null)

  const handleDragStart = (e) => {
    if (isCardExpanded) return
    e.dataTransfer.setData('movieId', String(movie.id))
    e.dataTransfer.setData('itemId', String(movie.id))
    if (sectionKey) e.dataTransfer.setData('fromSection', sectionKey)
    e.dataTransfer.effectAllowed = 'move'
    
    const el = e.currentTarget
    setTimeout(() => {
      if (el) el.style.opacity = '0'
    }, 0)

    if (onDragStart) onDragStart(e)
  }

  const handleDragEnd = (e) => {
    if (e.currentTarget) {
      e.currentTarget.style.transition = 'opacity 0.2s ease'
      e.currentTarget.style.opacity = '1'
    }
    if (onDragEnd) onDragEnd(e)
  }

  const handleTouchStart = (e) => {
    if (isCardExpanded || noDrag) return
    const touch = e.touches[0]
    const now = Date.now()
    isTouchSessionRef.current = true
    isTouchDraggingRef.current = false
    isLongPressTriggeredRef.current = false
    touchMovedRef.current = false
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: now }
    setHovered(false)

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      if (isTouchSessionRef.current && !touchMovedRef.current && !isCardExpanded && !noDrag) {
        const el = cardRef.current
        if (!el) return
        isLongPressTriggeredRef.current = true
        isTouchDraggingRef.current = true
        const rect = el.getBoundingClientRect()
        const metrics = {
          x: touchStartPos.current.x,
          y: touchStartPos.current.y,
          offsetX: touchStartPos.current.x - rect.left,
          offsetY: touchStartPos.current.y - rect.top,
          width: rect.width,
          height: rect.height
        }
        dragMetricsRef.current = metrics
        setDragMetrics(metrics)
        setIsTouchDragging(true)
        try { if (navigator.vibrate) navigator.vibrate(35) } catch {}
        onTouchDragStart?.(movie, touchStartPos.current.x, touchStartPos.current.y)
      }
    }, 220)
  }

  useEffect(() => {
    const el = cardRef.current
    if (!el || isCardExpanded) return
    const onMove = (e) => {
      const touch = e.touches[0]
      if (!touch) return
      const dx = touch.clientX - touchStartPos.current.x
      const dy = touch.clientY - touchStartPos.current.y
      const dist = Math.hypot(dx, dy)

      // If finger moved before long-press elapsed, cancel long-press and allow normal smooth page scrolling!
      if (!isLongPressTriggeredRef.current) {
        if (dist > 8) {
          touchMovedRef.current = true
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }
        }
        return
      }

      // If long-press is active, user is dragging the card!
      if (isTouchDraggingRef.current) {
        if (e.cancelable) e.preventDefault()
        dragMetricsRef.current.x = touch.clientX
        dragMetricsRef.current.y = touch.clientY
        if (portalGhostRef.current) {
          const posX = touch.clientX - dragMetricsRef.current.offsetX
          const posY = touch.clientY - dragMetricsRef.current.offsetY
          portalGhostRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(1.04)`
        }
        onTouchDragMove?.(movie, touch.clientX, touch.clientY)
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [noDrag, movie, onTouchDragStart, onTouchDragMove, isCardExpanded])

  const handleTouchEnd = (e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isCardExpanded) return
    isTouchSessionRef.current = false
    const touch = e.changedTouches[0] || e.touches[0]

    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false
      isLongPressTriggeredRef.current = false
      setIsTouchDragging(false)
      const finalX = touch?.clientX || touchStartPos.current.x
      const finalY = touch?.clientY || touchStartPos.current.y
      onTouchDragEnd?.(movie, finalX, finalY)
      return
    }

    // Only expand modal on clean tap if finger did not scroll/move
    if (!touchMovedRef.current) {
      handleExpand(e)
    }
  }

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    isTouchSessionRef.current = false
    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false
      isLongPressTriggeredRef.current = false
      setIsTouchDragging(false)
      onTouchDragEnd?.(movie, touchStartPos.current.x, touchStartPos.current.y)
    }
  }

  const currentSection = movie.section || sectionKey || 'todo'
  const isVisuallyExpanded = isOpen && !isClosing

  return (
    <div
      ref={cardRef}
      data-closing={isClosing ? 'true' : undefined}
      className={isClosing ? 'movie-card-closing' : (isVisuallyExpanded ? 'movie-card-expanded' : '')}
      draggable={!isCardExpanded && !noDrag}
      onDragStart={noDrag || isCardExpanded ? undefined : handleDragStart}
      onDragEnd={noDrag || isCardExpanded ? undefined : handleDragEnd}
      onContextMenu={onContextMenu ? (e) => {
        if (e.pointerType === 'touch' || isTouchSessionRef.current) {
          e.preventDefault()
          return
        }
        onContextMenu(e)
      } : (e) => e.preventDefault()}
      onClick={isCardExpanded ? undefined : handleExpand}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        background: isVisuallyExpanded ? 'var(--bg-surface)' : (isTouchDragging ? 'transparent' : 'var(--bg-card)'),
        border: isVisuallyExpanded ? '1px solid var(--accent, #a78bfa)' : (isTouchDragging ? '1.5px dashed var(--accent, #a78bfa)' : '1px solid var(--border)'),
        borderRadius: 14,
        boxShadow: 'none',
        cursor: isCardExpanded ? 'default' : (isTouchDragging ? 'grabbing' : 'pointer'),
        overflow: 'hidden',
        maxHeight: renderExpanded ? (isVisuallyExpanded ? 1100 : 116) : 'none',
        transition: 'max-height 0.28s cubic-bezier(0.05, 0.9, 0.1, 1), border-color 0.18s ease, background 0.18s ease, box-shadow 0.2s ease',
        opacity: isTouchDragging ? 0.35 : 1,
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none'
      }}
      onMouseEnter={e => {
        if (isTouchDragging || isTouchSessionRef.current || isCardExpanded) return
        setHovered(true)
        prefetchTrailer(movie, displayTitle)
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.background = 'var(--bg-card-hover)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (isTouchDragging || isCardExpanded) return
        setHovered(false)
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* 1. COLLAPSED VIEW (Compact Horizontal Row) */}
      {!renderExpanded ? (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', minHeight: 116 }}>
          {/* Delete button on hover */}
          {onDelete && (
            <button
              type="button"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete(movie)
              }}
              title={t('common.delete')}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                zIndex: 10,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                width: 24,
                height: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hovered ? 0.9 : 0,
                transform: hovered ? 'scale(1)' : 'scale(0.85)',
                transition: 'opacity 0.15s, transform 0.15s, color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Trash2 size={12} />
            </button>
          )}

          {/* Left: Poster thumbnail */}
          {movie.poster_path ? (
            <div className="movie-poster-thumb" style={{
              width: 82,
              minWidth: 82,
              flexShrink: 0,
              overflow: 'hidden',
              borderRadius: '13px 0 0 13px',
              background: '#08080a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={movie.poster_path}
                alt=""
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div className="movie-poster-thumb" style={{
              width: 82,
              minWidth: 82,
              flexShrink: 0,
              borderRadius: '13px 0 0 13px',
              background: '#141414',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}>
              <Film size={22} color="var(--text-muted)" />
            </div>
          )}

          {/* Right: Text info */}
          <div className="movie-info-wrap" style={{ flex: 1, padding: '10px 14px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <div className="movie-card-title" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {displayTitle}
              {movie.year && movie.year !== '—' && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 5, fontSize: 12.5 }}>
                  ({movie.release_year || movie.year})
                </span>
              )}
            </div>

            {isFuture && movie.release_date ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} color="#a78bfa" />
                <span style={{ color: '#a78bfa', fontSize: 11.5, fontWeight: 500 }}>
                  {formatReleaseDate(movie.release_date, language)}
                </span>
              </div>
            ) : isFuture && movie.release_year && movie.release_year !== '—' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={11} color="#a78bfa" />
                <span style={{ color: '#a78bfa', fontSize: 11.5, fontWeight: 500 }}>
                  {movie.release_year}
                </span>
              </div>
            ) : null}

            {!isFuture && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={11} color={movie.rating ? "#fbbf24" : "var(--text-muted)"} fill={movie.rating ? "#fbbf24" : "none"} />
                  <span style={{ color: movie.rating ? '#fbbf24' : 'var(--text-muted)', fontSize: 11.5, fontWeight: 600 }}>
                    {movie.rating ? movie.rating : '0/10'}
                  </span>
                  {movie.vote_count ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({formatVotes(movie.vote_count)})</span>
                  ) : null}
                </div>
                {effectiveUserRating ? (
                  <div
                    draggable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowRatingModal(true)
                    }}
                    title={`Sizning bahoyingiz: ${effectiveUserRating}/10 (O'zgartirish uchun bosing)`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      padding: '0px 6px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#60a5fa'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)'}
                  >
                    <Star size={10} color="#60a5fa" fill="#60a5fa" />
                    <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600 }}>{Number(effectiveUserRating).toFixed(1).replace(/\.0$/, '')}</span>
                  </div>
                ) : null}
              </div>
            )}

            {((displayGenre && displayGenre !== '—' && displayGenre !== '-') || (displayDirector && displayDirector !== '—' && displayDirector !== '-')) && (
              <div style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayGenre && displayGenre !== '—' && displayGenre !== '-' && <span>{displayGenre}</span>}
                {displayDirector && displayDirector !== '—' && displayDirector !== '-' && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {displayGenre && displayGenre !== '—' && displayGenre !== '-' ? ' • ' : ''}{displayDirector}
                  </span>
                )}
              </div>
            )}

            {movie.seasons && movie.seasons !== '—' && movie.seasons !== '-' && (
              <div style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 1 }}>
                <Clock size={11} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ lineHeight: 1.35, wordBreak: 'break-word' }}>{formatCardRuntime(movie.seasons)}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. EXPANDED VIEW (Vertical Rich Accordion in Column) */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          opacity: isVisuallyExpanded ? 1 : 0,
          transform: isVisuallyExpanded ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.98)',
          transition: 'opacity 0.28s cubic-bezier(0.05, 0.9, 0.1, 1), transform 0.36s cubic-bezier(0.05, 0.9, 0.1, 1)',
        }}>
          {/* Top Horizontal Cinema Trailer / Poster Banner */}
          <div
            ref={trailerContainerRef}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 10',
              maxHeight: 250,
              overflow: 'hidden',
              background: '#09090b',
              borderTopLeftRadius: 13,
              borderTopRightRadius: 13,
              borderBottom: '1px solid var(--border)',
            }}
          >
            {trailer?.key ? (
              <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                <iframe
                  ref={trailerIframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&loop=1&playlist=${trailer.key}&disablekb=1&widget_referrer=${window.location.origin}`}
                  title={`${displayTitle} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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

                {/* Smooth Cover Poster Backdrop while YouTube initial splash/controls fade away */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: isVideoReady ? 0 : 1,
                    transition: 'opacity 0.5s ease',
                    pointerEvents: 'none',
                    background: '#09090b',
                    overflow: 'hidden'
                  }}
                >
                  {movie.poster_path ? (
                    <img
                      src={movie.poster_path}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center 20%',
                        display: 'block'
                      }}
                    />
                  ) : null}
                </div>

                {/* Cinematic Dark Vignette Overlay (Vibrant video in both Light & Dark themes) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.65) 100%)',
                    pointerEvents: 'none'
                  }}
                />

                {/* EXACTLY 2 Floating Trailer Controls: Mute/Unmute and Fullscreen */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    zIndex: 25,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    pointerEvents: 'auto'
                  }}
                >
                  {/* 1. Ovozsizni o'chirish / yoqish (Mute / Unmute) */}
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    title={isMuted ? "Ovozni yoqish (Unmute)" : "Ovozsiz qilish (Mute)"}
                    style={{
                      background: isMuted ? 'rgba(0, 0, 0, 0.65)' : 'rgba(59, 130, 246, 0.85)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: isMuted ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(147, 197, 253, 0.6)',
                      borderRadius: '50%',
                      color: '#fff',
                      width: 32,
                      height: 32,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  {/* 2. Kattalashtirish (Fullscreen) */}
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    title="Kattalashtirish (Fullscreen)"
                    style={{
                      background: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '50%',
                      color: '#fff',
                      width: 32,
                      height: 32,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Maximize2 size={15} />
                  </button>
                </div>
              </div>
            ) : movie.poster_path ? (
              <>
                <img
                  src={movie.poster_path}
                  alt={displayTitle || ''}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                    display: 'block'
                  }}
                />
                {/* Gradient shadow overlay at bottom */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.7) 100%)',
                  pointerEvents: 'none'
                }} />
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Film size={36} />
              </div>
            )}

            {/* ONLY ONE Single Top-Right Close Button */}
            <button
              type="button"
              onClick={handleClose}
              title={t('common.close')}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 30,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '50%',
                color: '#fff',
                width: 28,
                height: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 1)'
                e.currentTarget.style.transform = 'scale(1.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Expanded Card Body Details */}
          <div style={{ padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Title, Tagline & Chronology Button Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17.5, fontWeight: 700, lineHeight: 1.25, color: 'var(--text-primary)' }}>
                  {displayTitle}
                </div>
                {movie.tagline ? (
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3, fontStyle: 'italic' }}>
                    {movie.tagline}
                  </div>
                ) : null}
              </div>
              {movie.tmdb_id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (onOpenChronology) onOpenChronology(movie.tmdb_id, movie.media_type)
                  }}
                  title={t('card.chronology')}
                  style={{
                    background: 'rgba(124, 58, 237, 0.18)',
                    border: '1px solid rgba(167, 139, 250, 0.4)',
                    color: '#a78bfa',
                    borderRadius: 20,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.35)'
                    e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.7)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(124, 58, 237, 0.18)'
                    e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.4)'
                  }}
                >
                  <Sparkles size={11} />
                  <span>{t('card.chronology')}</span>
                </button>
              )}
            </div>
            {/* Meta Tags Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
              {movie.release_year && movie.release_year !== '—' && (
                <span style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '3px 8px' }}>{movie.release_year}</span>
              )}
              {displayGenre && displayGenre !== '—' && (
                <span style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '3px 8px' }}>{displayGenre}</span>
              )}
              {displayDirector && displayDirector !== '—' && (
                <span style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '3px 8px' }}>{displayDirector}</span>
              )}
              {!isFuture && (
                <span style={{ background: movie.rating ? '#2a1f00' : 'var(--bg-input)', color: movie.rating ? '#fbbf24' : 'var(--text-muted)', borderRadius: 6, padding: '3px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Star size={10} fill={movie.rating ? "#fbbf24" : "none"} color={movie.rating ? "#fbbf24" : "var(--text-muted)"} /> {movie.rating ? movie.rating : '0/10'}
                </span>
              )}
              {effectiveUserRating ? (
                <span
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowRatingModal(true)
                  }}
                  title={`Sizning bahoyingiz: ${effectiveUserRating}/10 (O'zgartirish uchun bosing)`}
                  style={{
                    background: '#0c213d',
                    color: '#60a5fa',
                    border: '1px solid rgba(96, 165, 250, 0.45)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#60a5fa'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.45)'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <Star size={10} fill="#60a5fa" color="#60a5fa" /> {Number(effectiveUserRating).toFixed(1).replace(/\.0$/, '')}
                </span>
              ) : (currentSection === 'done' || movie.section === 'done') ? (
                <span
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowRatingModal(true)
                  }}
                  title="Baholash (1-10)"
                  style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    color: '#93c5fd',
                    border: '1px dashed rgba(59, 130, 246, 0.35)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#60a5fa'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)'}
                >
                  <Star size={10} color="#93c5fd" /> Baholash
                </span>
              ) : null}
            </div>

            {/* Watch Online & Nearby Cinemas Action Bar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2, marginBottom: 2 }}>
              {/* Watch Online Button */}
              <a
                href={watchProvider?.url || (getStoredUserLocation().countryCode === 'UZ'
                  ? `https://itv.uz/search?text=${encodeURIComponent(displayTitle || movie.title || '')}`
                  : `https://www.netflix.com/search?q=${encodeURIComponent(displayTitle || movie.title || '')}`)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  padding: '7px 12px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(16, 185, 129, 0.35)' }}
              >
                <Play size={12} fill="#fff" />
                <span>
                  {getStoredUserLocation().countryCode === 'UZ'
                    ? "ITV da ko'rish"
                    : (watchProvider?.name ? `${watchProvider.name} da ko'rish` : "Netflix da ko'rish")}
                </span>
                <ExternalLink size={11} style={{ opacity: 0.85 }} />
              </a>

              {/* Nearby Cinemas Button (Hidden for TV Series) */}
              {!isTvSeries && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.dispatchEvent(new CustomEvent('notelab_open_cinema_modal', { detail: movie.id }))
                    setShowCinemasModal(true)
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '7px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Ticket size={13} />
                  <span>
                    {cinemasCount > 0
                      ? `${t('cinema.cinemas', null, 'Kinoteatrlar')} (${cinemasCount})`
                      : t('cinema.cinemas', null, 'Kinoteatrlar')}
                  </span>
                </button>
              )}
            </div>

            {/* Overview / Story Summary (Clamped to 3 lines with bottom fade gradient, click to toggle) */}
            {displayOverview ? (
              <div
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsOverviewExpanded(prev => !prev)
                }}
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: 'var(--text-secondary)',
                  background: isOverviewExpanded ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.015)',
                  border: isOverviewExpanded ? '1px solid rgba(167, 139, 250, 0.35)' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  userSelect: 'text',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  ...(isOverviewExpanded ? {
                    display: 'block',
                    maxHeight: '500px',
                    maskImage: 'none',
                    WebkitMaskImage: 'none',
                  } : {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    maxHeight: '4.9em',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
                  })
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent, #a78bfa)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isOverviewExpanded ? 'rgba(167, 139, 250, 0.35)' : 'var(--border)'
                  e.currentTarget.style.background = isOverviewExpanded ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.015)'
                }}
              >
                {displayOverview}
              </div>
            ) : null}

            {/* Bottom Actions Row: ONLY Delete Button (No Duplicate Close Button) */}
            {onDelete && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete(movie)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    borderRadius: 6,
                    transition: 'background 0.15s ease, color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Trash2 size={13} />
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCinemasModal && (
        <CinemasModal
          movie={movie}
          onClose={() => setShowCinemasModal(false)}
        />
      )}

      {showRatingModal && (
        <MovieRatingModal
          movie={movie}
          currentRating={effectiveUserRating}
          onRate={handleRate}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {isTouchDragging && createPortal(
        <div
          style={{
            position: 'fixed',
            left: dragMetrics.x - dragMetrics.offsetX,
            top: dragMetrics.y - dragMetrics.offsetY,
            width: dragMetrics.width,
            minHeight: dragMetrics.height,
            zIndex: 99999999,
            pointerEvents: 'none',
            borderRadius: 14,
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--accent, #7c3aed)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 0 2px var(--accent, #7c3aed)',
            transform: 'scale(1.04) rotate(1deg)',
            transition: 'transform 0.08s ease',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'stretch',
            userSelect: 'none',
            boxSizing: 'border-box'
          }}
        >
          {movie.poster_path ? (
            <div className="movie-poster-thumb" style={{
              width: 82,
              minWidth: 82,
              flexShrink: 0,
              overflow: 'hidden',
              borderRadius: '13px 0 0 13px',
              background: '#08080a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={movie.poster_path}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div className="movie-poster-thumb" style={{
              width: 82,
              minWidth: 82,
              flexShrink: 0,
              borderRadius: '13px 0 0 13px',
              background: '#141414',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}>
              <Film size={22} color="var(--text-muted)" />
            </div>
          )}
          <div className="movie-info-wrap" style={{ flex: 1, padding: '10px 14px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <div className="movie-card-title" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayTitle}
            </div>
            {movie.vote_average > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <Star size={12} fill="#eab308" color="#eab308" />
                <span style={{ fontWeight: 700, color: '#eab308' }}>{Number(movie.vote_average).toFixed(1)}</span>
                {effectiveUserRating && (
                  <span style={{ marginLeft: 6, background: '#3b82f6', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>
                    ★ {effectiveUserRating}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default React.memo(MovieCard)
