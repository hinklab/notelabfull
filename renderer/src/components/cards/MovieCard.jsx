import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Star, Calendar, Clapperboard, X, Trash2, Clock } from 'lucide-react'

function formatVotes(n) {
  if (!n) return null
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function RatingStars10({ value, onChange }) {
  const [hoverVal, setHoverVal] = useState(null)
  const activeVal = hoverVal !== null ? hoverVal : (value || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd' }}>Sizning bahoingiz:</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{activeVal ? `${activeVal}/10` : 'Baho berilmagan'}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }} onMouseLeave={() => setHoverVal(null)}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(starNum => {
          const filled = starNum <= activeVal
          return (
            <button
              key={starNum}
              onClick={(e) => {
                e.stopPropagation()
                onChange(starNum)
              }}
              onMouseEnter={() => setHoverVal(starNum)}
              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Star
                size={18}
                fill={filled ? '#60a5fa' : 'none'}
                color={filled ? '#60a5fa' : '#3f3f46'}
                style={{ transition: 'transform 0.1s, color 0.1s, fill 0.1s', transform: hoverVal === starNum ? 'scale(1.25)' : 'scale(1)' }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function MovieCard({
  movie,
  sectionKey,
  onContextMenu,
  noDrag,
  onDragStart,
  onDragEnd,
  onDelete,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd
}) {
  const [expanded, setExpanded] = useState(false)
  const [animateOpen, setAnimateOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [isTouchDragging, setIsTouchDragging] = useState(false)
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 })
  const [userRating, setUserRating] = useState(movie?.user_rating || null)
  const [showRateModal, setShowRateModal] = useState(false)
  const isFuture = movie.section === 'futured' && !movie.rating

  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    setUserRating(movie?.user_rating || null)
  }, [movie?.user_rating])

  const handleRate = async (newRating) => {
    setUserRating(newRating)
    if (movie) movie.user_rating = newRating
    try {
      await window.api.updateMovie(movie.id, { user_rating: newRating })
      setToastMessage('Rahmat, bahoyingiz saqlandi! ✨')
      setTimeout(() => setToastMessage(null), 2200)
    } catch (err) {
      console.error('Failed to save user rating:', err)
    }
  }

  const touchStartPos = useRef({ x: 0, y: 0, time: 0 })
  const lastTapTimeRef = useRef(0)
  const isTouchDraggingRef = useRef(false)
  const isTouchSessionRef = useRef(false) // true while finger is on screen; blocks mouse-hover after touch
  const touchOpenedAtRef = useRef(0) // timestamp when modal was opened by touch (to block ghost click)
  const cardRef = useRef(null) // ref to card DOM node for non-passive touchmove listener

  // Mount effect

  useEffect(() => {
    if (!expanded) {
      setAnimateOpen(false)
      return
    }

    const id = requestAnimationFrame(() => setAnimateOpen(true))
    return () => cancelAnimationFrame(id)
  }, [expanded])


  const handleDragStart = (e) => {
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

  const handleCardClick = (e) => {
    // Prevent mouse click from firing immediately after touch interaction
    if (Date.now() - touchStartPos.current.time < 350) return
    setExpanded(true)
  }

  const handleClose = (e) => {
    // Block ghost clicks synthesized by mobile browser within 400ms of touch-open
    if (Date.now() - touchOpenedAtRef.current < 400) return
    e?.stopPropagation()
    setAnimateOpen(false)
    setTimeout(() => setExpanded(false), 240)
  }

  // Touch gesture handlers for mobile:
  // 1. Movement (> 10px after 80ms) = Drag
  // 2. Double-tap (two taps < 300ms) = Open detail modal
  const handleTouchStart = (e) => {
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
    if (!el) return
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
  }, [noDrag, movie, onTouchDragStart, onTouchDragMove])

  const handleTouchEnd = (e) => {
    const _now = Date.now()
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

    const now = Date.now()
    if (now - lastTapTimeRef.current < 300) {
      if (e.cancelable) e.preventDefault()
      touchOpenedAtRef.current = now
      setExpanded(true)
    }
    lastTapTimeRef.current = now
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

  const preview = (
    <div
      ref={cardRef}
      draggable={!noDrag}
      onDragStart={noDrag ? undefined : handleDragStart}
      onDragEnd={noDrag ? undefined : handleDragEnd}
      onContextMenu={onContextMenu ? (e) => {
        // Block native context menu on touch (long-press) — only allow right-click on desktop
        if (e.pointerType === 'touch' || isTouchSessionRef.current) {
          e.preventDefault()
          return
        }
        onContextMenu(e)
      } : (e) => e.preventDefault()}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        background: isTouchDragging ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: isTouchDragging ? '1.5px solid var(--accent, #7c3aed)' : '1px solid var(--border)',
        borderRadius: 10, padding: 0,
        cursor: 'pointer',
        transition: isTouchDragging ? 'none' : 'border-color 0.15s, background 0.15s, transform 0.15s',
        position: 'relative', overflow: 'hidden', userSelect: 'none',
        transform: isTouchDragging ? `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0) scale(1.04)` : 'none',
        boxShadow: isTouchDragging ? '0 20px 45px rgba(0,0,0,0.8)' : 'none',
        zIndex: isTouchDragging ? 99999 : 1,
        opacity: isTouchDragging ? 0.95 : 1,
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: isTouchDragging ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        minHeight: 120,
      }}
      onMouseEnter={e => {
        if (isTouchDragging || isTouchSessionRef.current) return
        setHovered(true)
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.background = 'var(--bg-card-hover)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (isTouchDragging) return
        setHovered(false)
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Delete button on hover */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(movie)
          }}
          title="Kinolardan o'chirish"
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

      {/* Left: Poster image — clear, fully opaque, uncropped */}
      {movie.poster_path ? (
        <div style={{
          width: 84,
          minWidth: 84,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: '9px 0 0 9px',
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
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      ) : (
        <div style={{
          width: 84,
          minWidth: 84,
          flexShrink: 0,
          borderRadius: '9px 0 0 9px',
          background: '#141414',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 20,
        }}>
          🎬
        </div>
      )}

      {/* Right: Text info */}
      <div style={{ flex: 1, padding: '10px 14px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {movie.title}
          {movie.year && movie.year !== '—' && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 5, fontSize: 13 }}>
              ({movie.release_year || movie.year})
            </span>
          )}
        </div>

        {isFuture && movie.release_date ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={11} color="#a78bfa" />
            <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 500 }}>
              {formatReleaseDate(movie.release_date)}
            </span>
          </div>
        ) : isFuture && movie.release_year && movie.release_year !== '—' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={11} color="#a78bfa" />
            <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 500 }}>
              {movie.release_year}
            </span>
          </div>
        ) : null}

        {!isFuture && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={11} color={movie.rating ? "#fbbf24" : "var(--text-muted)"} fill={movie.rating ? "#fbbf24" : "none"} />
              <span style={{ color: movie.rating ? '#fbbf24' : 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                {movie.rating ? movie.rating : '0/10'}
              </span>
              {movie.vote_count ? (
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({formatVotes(movie.vote_count)})</span>
              ) : null}
            </div>
            {userRating > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0px 5px', borderRadius: 4 }}>
                <Star size={10} color="#60a5fa" fill="#60a5fa" />
                <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 600 }}>{userRating}/10</span>
              </div>
            )}
          </div>
        )}

        {((movie.genre && movie.genre !== '—' && movie.genre !== '-') || (movie.director && movie.director !== '—' && movie.director !== '-')) && (
          <div style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {movie.genre && movie.genre !== '—' && movie.genre !== '-' && <span>{movie.genre}</span>}
            {movie.director && movie.director !== '—' && movie.director !== '-' && (
              <span style={{ color: 'var(--text-muted)' }}>
                {movie.genre && movie.genre !== '—' && movie.genre !== '-' ? ' • ' : ''}{movie.director}
              </span>
            )}
          </div>
        )}

        {movie.seasons && movie.seasons !== '—' && movie.seasons !== '-' && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} color="var(--text-muted)" />
            <span>{movie.seasons}</span>
          </div>
        )}
      </div>
    </div>
  )

  const overlayVisible = expanded

  // Modal oyna balandligining 2/3 qismini egallaydi, markazda
  const modalStyle = {
    position: 'relative',
    width: 'min(860px, 94vw)',
    height: 'min(520px, 85vh)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    gap: 24,
    opacity: animateOpen ? 1 : 0,
    transform: animateOpen ? 'scale(1) translateY(0)' : 'scale(0.93) translateY(24px)',
    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
    flexShrink: 0,
  }
  const posterStyle = {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    background: '#09090b',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: animateOpen ? 1 : 0.6,
    transform: animateOpen ? 'scale(1)' : 'scale(0.94)',
    transition: 'transform 0.3s ease 0.06s, opacity 0.3s ease 0.06s',
  }
  const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    color: 'var(--text-primary)',
    overflowY: 'auto',
    paddingRight: 4,
    opacity: animateOpen ? 1 : 0,
    transform: animateOpen ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 0.28s ease 0.14s, transform 0.28s ease 0.14s',
  }

  return (
    <>
      {preview}
      {overlayVisible && ReactDOM.createPortal(
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: animateOpen ? 'rgba(4,4,4,0.85)' : 'rgba(4,4,4,0)',
            backdropFilter: animateOpen ? 'blur(16px)' : 'blur(0px)',
            WebkitBackdropFilter: animateOpen ? 'blur(16px)' : 'blur(0px)',
            transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
            <div style={posterStyle}>
              {movie.poster_path ? (
                <img
                  src={movie.poster_path}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No poster
                </div>
              )}
            </div>

            <div style={contentStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 }}>{movie.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                    {movie.tagline || movie.original_title || ''}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    border: 'none', background: '#252525', color: '#aaa',
                    width: 36, height: 36, borderRadius: 10,
                    cursor: 'pointer', fontSize: 16, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                ><X size={15} /></button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                {movie.release_year && movie.release_year !== '—' && (
                  <span style={{ background: '#222', borderRadius: 6, padding: '4px 10px' }}>{movie.release_year}</span>
                )}
                {movie.genre && movie.genre !== '—' && (
                  <span style={{ background: '#222', borderRadius: 6, padding: '4px 10px' }}>{movie.genre}</span>
                )}
                {movie.director && movie.director !== '—' && (
                  <span style={{ background: '#222', borderRadius: 6, padding: '4px 10px' }}>{movie.director}</span>
                )}
                {!isFuture && (
                  <span style={{ background: movie.rating ? '#2a1f00' : 'var(--bg-input)', color: movie.rating ? '#fbbf24' : 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={11} fill={movie.rating ? "#fbbf24" : "none"} color={movie.rating ? "#fbbf24" : "var(--text-muted)"} /> {movie.rating ? movie.rating : '0/10'}
                  </span>
                )}
                {(movie.section === 'done' || sectionKey === 'done') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowRateModal(true) }}
                    title="Baho berish / o'zgartirish"
                    style={{
                      background: userRating ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.1)',
                      border: userRating ? '1px solid rgba(59, 130, 246, 0.4)' : '1px dashed rgba(59, 130, 246, 0.35)',
                      color: userRating ? '#60a5fa' : '#93c5fd',
                      borderRadius: 6, padding: '4px 10px', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                    }}
                  >
                    <Star size={11} fill={userRating ? "#60a5fa" : "none"} color={userRating ? "#60a5fa" : "#93c5fd"} />
                    <span>{userRating ? `${userRating}/10` : '+ Baho berish'}</span>
                  </button>
                )}
              </div>

              {movie.overview && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                  {movie.overview}
                </div>
              )}

              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {isFuture && movie.release_date && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    <strong>Chiqish sanasi:</strong> {formatReleaseDate(movie.release_date)}
                  </div>
                )}
                {movie.vote_count && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    <strong>Ovozlar:</strong> {formatVotes(movie.vote_count)}
                  </div>
                )}
                {movie.seasons && movie.seasons !== '-' && movie.seasons !== '—' && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={13} color="var(--text-muted)" />
                    <span><strong>Davomiyligi:</strong> {movie.seasons}</span>
                  </div>
                )}
                {movie.note && movie.note !== movie.overview && movie.note.trim() !== (movie.overview || '').trim() && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    <strong>Izoh:</strong> {movie.note}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {toastMessage && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999999,
          background: '#18181b', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', borderRadius: 30, padding: '10px 20px',
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Star size={14} fill="#60a5fa" color="#60a5fa" />
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}
      {showRateModal && ReactDOM.createPortal(
        <div
          onClick={() => setShowRateModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999999,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(440px, 92vw)', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: 24, padding: 24,
              display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 30px 80px rgba(0,0,0,0.7)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {userRating ? 'Bahoingizni o\'zgartiring 🎬' : 'Filmga baho bering 🎬'}
              </div>
              <button
                onClick={() => setShowRateModal(false)}
                style={{ border: 'none', background: '#252525', color: '#aaa', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              ><X size={15} /></button>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-primary)' }}>"{movie.title}"</strong> filmiga baho bering:
            </div>
            <RatingStars10
              value={userRating}
              onChange={(newRating) => {
                handleRate(newRating)
                setShowRateModal(false)
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
