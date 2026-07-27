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
  const isTouchDraggingRef = useRef(false)
  const isTouchSessionRef = useRef(false) // true while finger is on screen; blocks mouse-hover after touch
  const touchOpenedAtRef = useRef(0) // timestamp when modal was opened by touch (to block ghost click)
  const cardRef = useRef(null) // ref to card DOM node for non-passive touchmove listener

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
    console.log('[TouchStart] x:', touch.clientX.toFixed(0), 'y:', touch.clientY.toFixed(0), 'timeSinceLastTap:', now - lastTapTimeRef.current)
    isTouchSessionRef.current = true
    touchStartPos.current = { x: touch.clientX, y: touch.clientY, time: now }
    isTouchDraggingRef.current = false
    setTouchDelta({ x: 0, y: 0 })
    // Reset hover state so no hover/trash icon appears from touch
    setHovered(false)
  }

  // Attach touchmove with { passive: false } so e.preventDefault() actually works
  // (React's synthetic onTouchMove is passive by default on mobile, making preventDefault a no-op)
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
      console.log('[TouchMove] dist:', dist.toFixed(1), 'heldMs:', held, 'dragging:', isTouchDraggingRef.current)

      if (!isTouchDraggingRef.current) {
        if (dist > 10 && held > 80 && !noDrag) {
          isTouchDraggingRef.current = true
          setIsTouchDragging(true)
          setTouchDelta({ x: dx, y: dy })
          console.log('[TouchMove] 🟡 Drag START — calling onTouchDragStart')
          onTouchDragStart?.(movie, touch.clientX, touch.clientY)
        }
      }

      if (isTouchDraggingRef.current) {
        e.preventDefault() // works because listener is non-passive
        setTouchDelta({ x: dx, y: dy })
        console.log('[TouchMove] 🟢 Drag MOVE — calling onTouchDragMove', touch.clientX.toFixed(0), touch.clientY.toFixed(0))
        onTouchDragMove?.(movie, touch.clientX, touch.clientY)
      }
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [noDrag, movie, onTouchDragStart, onTouchDragMove])


    const handleTouchEnd = (e) => {
      const _now = Date.now()
      console.log('[TouchEnd] dragging:', isTouchDraggingRef.current, '| timeSinceLastTap:', _now - lastTapTimeRef.current, '| willOpenModal:', (!isTouchDraggingRef.current && (_now - lastTapTimeRef.current) < 300))
      isTouchSessionRef.current = false
      const touch = e.changedTouches[0] || e.touches[0]

      if (isTouchDraggingRef.current) {
        // End drag operation
        isTouchDraggingRef.current = false
        setIsTouchDragging(false)
        setTouchDelta({ x: 0, y: 0 })
        const finalX = touch?.clientX || touchStartPos.current.x
        const finalY = touch?.clientY || touchStartPos.current.y
        console.log('[TouchEnd] 🔴 Drag END — calling onTouchDragEnd at', finalX.toFixed(0), finalY.toFixed(0))
        onTouchDragEnd?.(movie, finalX, finalY)
        return
      }

      // Double-tap detection for opening detail modal
      const now = Date.now()
      if (now - lastTapTimeRef.current < 300) {
        // Suppress the browser's synthetic click event that would immediately
        // hit the modal backdrop and close the modal (ghost click)
        if (e.cancelable) e.preventDefault()
        touchOpenedAtRef.current = now
        setExpanded(true)
        console.log('[TouchEnd] ✅ Modal opened by double-tap')
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
        borderRadius: 8, padding: '10px 12px',
        cursor: 'pointer',
        transition: isTouchDragging ? 'none' : 'border-color 0.15s, background 0.15s, transform 0.15s',
        position: 'relative', overflow: 'hidden', userSelect: 'none',
        transform: isTouchDragging ? `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0) scale(1.04)` : 'none',
        boxShadow: isTouchDragging ? '0 20px 45px rgba(0,0,0,0.8)' : 'none',
        zIndex: isTouchDragging ? 99999 : 1,
        opacity: isTouchDragging ? 0.95 : 1,
        touchAction: 'none',
        WebkitTouchCallout: 'none',  // kills iOS long-press callout/context menu
        WebkitUserSelect: 'none',
        pointerEvents: isTouchDragging ? 'none' : 'auto', // allow elementFromPoint to see through card while dragging
      }}
      onMouseEnter={e => {
        // Don't show hover state during or immediately after touch
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
