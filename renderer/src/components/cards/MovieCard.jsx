import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Star, Calendar, Clapperboard, X, Trash2 } from 'lucide-react'

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
  const isFuture = movie.section === 'futured' && !movie.rating

  const touchStartPos = useRef({ x: 0, y: 0, time: 0 })
  const lastTapTimeRef = useRef(0)
  const contextTimerRef = useRef(null)
  const isTouchDraggingRef = useRef(false)
  const contextOpenedRef = useRef(false)

  useEffect(() => {
    if (!expanded) {
      setAnimateOpen(false)
      return
    }

    const id = requestAnimationFrame(() => setAnimateOpen(true))
    return () => cancelAnimationFrame(id)
  }, [expanded])

  const clearTimers = () => {
    if (contextTimerRef.current) { clearTimeout(contextTimerRef.current); contextTimerRef.current = null }
  }

  const handleDragStart = (e) => {
    e.dataTransfer.setData('movieId', String(movie.id))
    e.dataTransfer.setData('itemId', String(movie.id))
    if (sectionKey) e.dataTransfer.setData('fromSection', sectionKey)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.style.opacity = '0.5'
    if (onDragStart) onDragStart(e)
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    if (onDragEnd) onDragEnd(e)
  }

  const handleCardClick = (e) => {
    // Prevent mouse click from firing immediately after touch interaction
    if (Date.now() - touchStartPos.current.time < 350) return
    setExpanded(true)
  }

  const handleClose = (e) => {
    e?.stopPropagation()
    setAnimateOpen(false)
    setTimeout(() => setExpanded(false), 240)
  }

  // Touch gesture handlers for mobile:
  // 1. Movement (> 8px) = Immediate Drag (translates card with finger)
  // 2. Double-tap (two taps < 300ms) = Open detail modal
  // 3. Hold still for 3s = Context menu
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    isTouchDraggingRef.current = false
    contextOpenedRef.current = false
    setTouchDelta({ x: 0, y: 0 })
    clearTimers()

    if (onContextMenu) {
      contextTimerRef.current = setTimeout(() => {
        contextOpenedRef.current = true
        isTouchDraggingRef.current = false
        setIsTouchDragging(false)
        setTouchDelta({ x: 0, y: 0 })
        onContextMenu({
          preventDefault: () => {},
          stopPropagation: () => {},
          clientX: touchStartPos.current.x,
          clientY: touchStartPos.current.y
        })
      }, 3000)
    }
  }

  const handleTouchMove = (e) => {
    const touch = e.touches[0]
    const dx = touch.clientX - touchStartPos.current.x
    const dy = touch.clientY - touchStartPos.current.y
    const dist = Math.hypot(dx, dy)

    if (!isTouchDraggingRef.current && !contextOpenedRef.current) {
      if (dist > 8 && !noDrag) {
        clearTimers()
        isTouchDraggingRef.current = true
        setIsTouchDragging(true)
        setTouchDelta({ x: dx, y: dy })
        onTouchDragStart?.(movie, touch.clientX, touch.clientY)
      }
    }

    if (isTouchDraggingRef.current) {
      if (e.cancelable) e.preventDefault()
      setTouchDelta({ x: dx, y: dy })
      onTouchDragMove?.(movie, touch.clientX, touch.clientY)
    }
  }

    const handleTouchEnd = (e) => {
      clearTimers()
      const touch = e.changedTouches[0] || e.touches[0]

      if (contextOpenedRef.current) {
        contextOpenedRef.current = false
        setTouchDelta({ x: 0, y: 0 })
        return
      }

      if (isTouchDraggingRef.current) {
        // End drag operation
        isTouchDraggingRef.current = false
        setIsTouchDragging(false)
        setTouchDelta({ x: 0, y: 0 })
        onTouchDragEnd?.(movie, touch?.clientX || touchStartPos.current.x, touch?.clientY || touchStartPos.current.y)
        return
      }

      // Double-tap detection for opening detail modal
      const now = Date.now()
      if (now - lastTapTimeRef.current < 300) {
        setExpanded(true)
      }
      lastTapTimeRef.current = now


    }

  const handleTouchCancel = () => {
    clearTimers()
    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false
      setIsTouchDragging(false)
      setTouchDelta({ x: 0, y: 0 })
      onTouchDragEnd?.(movie, touchStartPos.current.x, touchStartPos.current.y)
    }
  }

  const preview = (
    <div
      draggable={!noDrag}
      onDragStart={noDrag ? undefined : handleDragStart}
      onDragEnd={noDrag ? undefined : handleDragEnd}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e) : undefined}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        background: isTouchDragging ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border: isTouchDragging ? '1.5px solid var(--accent, #7c3aed)' : '1px solid var(--border)',
        borderRadius: 8, padding: '10px 12px',
        cursor: 'pointer',
        transition: isTouchDragging ? 'none' : 'border-color 0.15s, background 0.15s, transform 0.15s',
        position: 'relative', overflow: 'hidden', userSelect: 'none',
        transform: isTouchDragging ? `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0) scale(1.04)` : 'none',
        boxShadow: isTouchDragging ? '0 20px 45px rgba(0,0,0,0.8)' : 'none',
        zIndex: isTouchDragging ? 99999 : 1,
        opacity: isTouchDragging ? 0.95 : 1,
        touchAction: 'none',
      }}
      onMouseEnter={e => {
        if (isTouchDragging) return
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
      {/* Poster background */}
      {movie.poster_path && (
        <>
          <div style={{
            position: 'absolute', right: 0, top: 0, width: 70, height: '100%',
            background: 'linear-gradient(to right, var(--bg-card) 0%, transparent 100%)',
            zIndex: 1,
          }} />
          <img src={movie.poster_path} alt="" style={{
            position: 'absolute', right: 0, top: 0,
            height: '100%', width: 70, objectFit: 'cover', opacity: 0.15,
          }} />
        </>
      )}

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4 }}>
          {movie.title}
          {movie.year && movie.year !== '—' && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 5, fontSize: 12 }}>
              ({movie.release_year || movie.year})
            </span>
          )}
        </div>

        {isFuture && movie.release_date ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <Calendar size={11} color="#a78bfa" />
            <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 500 }}>
              {formatReleaseDate(movie.release_date)}
            </span>
          </div>
        ) : isFuture && movie.release_year && movie.release_year !== '—' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <Calendar size={11} color="#a78bfa" />
            <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 500 }}>
              {movie.release_year}
            </span>
          </div>
        ) : null}

        {!isFuture && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <Star size={11} color={movie.rating ? "#fbbf24" : "var(--text-muted)"} fill={movie.rating ? "#fbbf24" : "none"} />
            <span style={{ color: movie.rating ? '#fbbf24' : 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
              {movie.rating ? movie.rating : '0/10'}
            </span>
            {movie.vote_count ? (
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({formatVotes(movie.vote_count)})</span>
            ) : null}
          </div>
        )}

        {((movie.genre && movie.genre !== '—' && movie.genre !== '-') || (movie.director && movie.director !== '—' && movie.director !== '-')) && (
          <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 2, lineHeight: 1.4 }}>
            {movie.genre && movie.genre !== '—' && movie.genre !== '-' && <span>{movie.genre}</span>}
            {movie.director && movie.director !== '—' && movie.director !== '-' && (
              <span style={{ color: 'var(--text-muted)' }}>
                {movie.genre && movie.genre !== '—' && movie.genre !== '-' ? ' • ' : ''}{movie.director}
              </span>
            )}
          </div>
        )}

        {movie.seasons && movie.seasons !== '—' && movie.seasons !== '-' && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{movie.seasons}</div>
        )}
      </div>
    </div>
  )

  const overlayVisible = expanded

  // Modal oyna balandligining 2/3 qismini egallaydi, markazda
  const modalHeight = `min(${Math.round(window.innerHeight * 0.67)}px, 90vh)`

  const modalStyle = {
    position: 'relative',
    width: 'min(820px, 92vw)',
    height: modalHeight,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    gap: 20,
    opacity: animateOpen ? 1 : 0,
    transform: animateOpen ? 'scale(1) translateY(0)' : 'scale(0.93) translateY(24px)',
    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
    flexShrink: 0,
  }
  const posterStyle = {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    background: '#111',
    height: '100%',
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1, marginBottom: 8 }}>{movie.title}</div>
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
                  <span style={{ background: '#222', borderRadius: 6, padding: '3px 8px' }}>{movie.release_year}</span>
                )}
                {movie.genre && movie.genre !== '—' && (
                  <span style={{ background: '#222', borderRadius: 6, padding: '3px 8px' }}>{movie.genre}</span>
                )}
                {movie.director && movie.director !== '—' && (
                  <span style={{ background: '#222', borderRadius: 6, padding: '3px 8px' }}><><Clapperboard size={11} style={{marginRight: 4}} />{movie.director}</></span>
                )}
                {!isFuture && (
                  <span style={{ background: movie.rating ? '#2a1f00' : 'var(--bg-input)', color: movie.rating ? '#fbbf24' : 'var(--text-muted)', borderRadius: 6, padding: '3px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Star size={11} fill={movie.rating ? "#fbbf24" : "none"} color={movie.rating ? "#fbbf24" : "var(--text-muted)"} /> {movie.rating ? movie.rating : '0/10'}
                  </span>
                )}
              </div>

              {movie.overview && (
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>
                  {movie.overview}
                </div>
              )}

              <div style={{ display: 'grid', gap: 8, marginTop: 'auto' }}>
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
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    <strong>Sezonlar:</strong> {movie.seasons}
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
    </>
  )
}
