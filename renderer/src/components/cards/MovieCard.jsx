import React, { useState, useEffect, useRef } from 'react'
import { Star, Calendar, X, Trash2, Clock, Sparkles, Film, Check, Play, Ticket, ExternalLink, MapPin } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { getStoredUserLocation } from '../../services/geo.js'
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

function RatingStars10Inline({ value, onChange, t }) {
  const [hoverVal, setHoverVal] = useState(null)
  const activeVal = hoverVal !== null ? hoverVal : (value || 0)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '10px 14px',
      background: 'rgba(59, 130, 246, 0.08)',
      border: '1px solid rgba(59, 130, 246, 0.22)',
      borderRadius: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd' }}>{t ? t('card.rating') : 'Bahoingiz'}:</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>{activeVal ? `${activeVal}/10` : '-'}</span>
      </div>
      <div style={{ display: 'flex', gap: 3, justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverVal(star)}
            onMouseLeave={() => setHoverVal(null)}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onChange(star)
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.1s ease',
              transform: hoverVal === star ? 'scale(1.3)' : 'scale(1)'
            }}
          >
            <Star
              size={15}
              fill={star <= activeVal ? '#60a5fa' : 'transparent'}
              color={star <= activeVal ? '#60a5fa' : 'var(--text-muted)'}
            />
          </button>
        ))}
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
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 })
  const [userRating, setUserRating] = useState(movie?.user_rating || null)
  const [watchProvider, setWatchProvider] = useState(null)
  const [cinemasCount, setCinemasCount] = useState(0)
  const [showCinemasModal, setShowCinemasModal] = useState(false)
  const isFuture = (movie.section === 'futured' || sectionKey === 'futured') && !movie.rating
  const isTvSeries = movie?.media_type === 'tv' || Boolean(movie?.seasons && movie.seasons !== '-' && movie.seasons !== '—' && /season|ep/i.test(movie.seasons))

  useEffect(() => {
    setUserRating(movie?.user_rating || null)
  }, [movie?.user_rating])

  useEffect(() => {
    if (isCardExpanded && movie?.tmdb_id && language === 'ru') {
      fetchSingleMovieTranslation(movie.tmdb_id, movie.media_type)
    }
  }, [isCardExpanded, movie?.tmdb_id, movie?.media_type, language])

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

  const touchStartPos = useRef({ x: 0, y: 0, time: 0 })
  const isTouchDraggingRef = useRef(false)
  const isTouchSessionRef = useRef(false)
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
    if (isCardExpanded) return
    const touch = e.touches[0]
    const now = Date.now()
    isTouchSessionRef.current = true
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: now }
    isTouchDraggingRef.current = false
    setTouchDelta({ x: 0, y: 0 })
    setHovered(false)
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
      const held = Date.now() - touchStartPos.current.time

      if (!isTouchDraggingRef.current) {
        if (dist > 10 && held > 80 && !noDrag) {
          isTouchDraggingRef.current = true
          setIsTouchDragging(true)
          setTouchDelta({ x: dx, y: dy })
          onTouchDragStart?.(movie, touch.clientX, touch.clientY)
        }
      }

      if (isTouchDraggingRef.current) {
        e.preventDefault()
        setTouchDelta({ x: dx, y: dy })
        onTouchDragMove?.(movie, touch.clientX, touch.clientY)
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [noDrag, movie, onTouchDragStart, onTouchDragMove, isCardExpanded])

  const handleTouchEnd = (e) => {
    if (isCardExpanded) return
    isTouchSessionRef.current = false
    const touch = e.changedTouches[0] || e.touches[0]

    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false
      setIsTouchDragging(false)
      setTouchDelta({ x: 0, y: 0 })
      const finalX = touch?.clientX || touchStartPos.current.x
      const finalY = touch?.clientY || touchStartPos.current.y
      onTouchDragEnd?.(movie, finalX, finalY)
      return
    }

    handleExpand(e)
  }

  const handleTouchCancel = () => {
    isTouchSessionRef.current = false
    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false
      setIsTouchDragging(false)
      setTouchDelta({ x: 0, y: 0 })
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
      draggable={!noDrag && !isCardExpanded}
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
        background: isVisuallyExpanded ? 'var(--bg-surface)' : (isTouchDragging ? 'var(--bg-card-hover)' : 'var(--bg-card)'),
        border: isVisuallyExpanded ? '1px solid var(--accent, #a78bfa)' : (isTouchDragging ? '1.5px solid var(--accent, #7c3aed)' : '1px solid var(--border)'),
        borderRadius: 14,
        boxShadow: isVisuallyExpanded ? '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(167, 139, 250, 0.2)' : 'none',
        cursor: isCardExpanded ? 'default' : 'pointer',
        overflow: 'hidden',
        maxHeight: renderExpanded ? (isVisuallyExpanded ? 1100 : 116) : 'none',
        transition: 'max-height 0.28s cubic-bezier(0.05, 0.9, 0.1, 1), border-color 0.18s ease, background 0.18s ease, box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.05, 0.9, 0.1, 1)',
        transform: isTouchDragging ? `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0) scale(1.04)` : 'none',
        zIndex: isTouchDragging ? 99999 : (isCardExpanded ? 15 : 1),
        opacity: isTouchDragging ? 0.95 : 1,
        touchAction: isCardExpanded ? 'auto' : 'none',
        WebkitTouchCallout: 'none',
        pointerEvents: isTouchDragging ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none'
      }}
      onMouseEnter={e => {
        if (isTouchDragging || isTouchSessionRef.current || isCardExpanded) return
        setHovered(true)
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
            <div style={{
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
            <div style={{
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
          <div style={{ flex: 1, padding: '10px 14px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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
                {((movie.section === 'done' || sectionKey === 'done') && (movie.avg_user_rating || movie.user_rating || userRating)) ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0px 5px', borderRadius: 4 }}>
                    <Star size={10} color="#60a5fa" fill="#60a5fa" />
                    <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600 }}>{Number(movie.avg_user_rating || movie.user_rating || userRating).toFixed(1).replace(/\.0$/, '')}</span>
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
              <div style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={11} color="var(--text-muted)" />
                <span>{formatCardRuntime(movie.seasons)}</span>
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
          {/* Top Poster Banner */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: isVisuallyExpanded ? 345 : 116,
              overflow: 'hidden',
              background: '#09090b',
              transition: 'height 0.36s cubic-bezier(0.05, 0.9, 0.1, 1)',
            }}
          >
            {movie.poster_path ? (
              <img
                src={movie.poster_path}
                alt={displayTitle || ''}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 15%',
                  display: 'block'
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Film size={36} />
              </div>
            )}

            {/* Gradient shadow overlay at bottom */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, var(--bg-surface) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.55) 100%)',
              pointerEvents: 'none'
            }} />

            {/* ONLY ONE Single Top-Right Close Button */}
            <button
              type="button"
              onClick={handleClose}
              title={t('common.close')}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 20,
                background: 'rgba(0, 0, 0, 0.7)',
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
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 1)'
                e.currentTarget.style.transform = 'scale(1.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <X size={16} />
            </button>

            {/* Top Left Chronology Button if tmdb_id is present */}
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
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  zIndex: 20,
                  background: 'rgba(124, 58, 237, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(167, 139, 250, 0.5)',
                  color: '#fff',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.85)'}
              >
                <Sparkles size={12} />
                <span>{t('card.chronology')}</span>
              </button>
            )}

            {/* Overlay Title at bottom of banner */}
            <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14, zIndex: 5, pointerEvents: 'none' }}>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                {displayTitle}
              </div>
              {movie.tagline ? (
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 3, fontStyle: 'italic', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {movie.tagline}
                </div>
              ) : null}
            </div>
          </div>

          {/* Expanded Card Body Details */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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

            {/* Interactive User Rating in-place */}
            {(currentSection === 'done' || userRating) && (
              <RatingStars10Inline
                value={userRating}
                onChange={handleRate}
                t={t}
              />
            )}

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
    </div>
  )
}

export default React.memo(MovieCard)


