import React, { useRef, useCallback, useState, useEffect } from 'react'
import MovieCard from '../cards/MovieCard.jsx'
import { Pencil, X, Plus } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

const COL_COLORS = {
  futured: { color: '#a78bfa', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.3)' },
  todo:    { color: '#fbbf24', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.3)' },
  doing:   { color: '#34d399', bg: 'rgba(5,150,105,0.12)', border: 'rgba(5,150,105,0.3)' },
  done:    { color: '#6ee7b7', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
}

function getDropPosition(movies, clientY, containerRef) {
  if (!containerRef.current || movies.length === 0) return { targetId: null, position: 'after', insertIndex: 0 }

  const cardEls = containerRef.current.querySelectorAll('[data-movie-id]')
  let best = null
  let bestDist = Infinity

  cardEls.forEach(el => {
    const rect = el.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const dist = Math.abs(clientY - midY)
    if (dist < bestDist) {
      bestDist = dist
      const before = clientY < midY
      best = {
        targetId: parseInt(el.dataset.movieId),
        position: before ? 'before' : 'after',
      }
    }
  })

  if (!best) {
    const firstRect = cardEls[0]?.getBoundingClientRect()
    if (firstRect && clientY < firstRect.top) {
      best = { targetId: parseInt(cardEls[0].dataset.movieId), position: 'before' }
    } else {
      const lastEl = cardEls[cardEls.length - 1]
      best = { targetId: lastEl ? parseInt(lastEl.dataset.movieId) : null, position: 'after' }
    }
  }

  const idx = movies.findIndex(m => m.id === best.targetId)
  const insertIndex = best.position === 'before' ? idx : idx + 1

  return { ...best, insertIndex: Math.max(0, insertIndex) }
}

export default function Column({ sectionKey, meta, movies, onContextMenu, onAdd, onMoveCard, onReorderCard, onGroupContextMenu, onRename, onDelete, groupClipboard, onGroupCut, onGroupCopy, onGroupPaste }) {
  const { t } = useLanguage()
  const col = COL_COLORS[sectionKey] || COL_COLORS.todo
  const [dragMarker, setDragMarker] = useState(null)
  const [headerHovered, setHeaderHovered] = useState(false)
  const [editingName, setEditingName] = useState(false)

  const defaultLabel = t(`sections.${sectionKey}`, null, meta.label)
  const [nameVal, setNameVal] = useState(defaultLabel)
  const cardsRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    setNameVal(t(`sections.${sectionKey}`, null, meta.label))
  }, [meta.label, sectionKey, t])

  const handleRename = async () => {
    if (!nameVal.trim() || nameVal.trim() === defaultLabel) { setEditingName(false); setNameVal(defaultLabel); return }
    onRename?.(nameVal.trim())
    setEditingName(false)
  }

  const updateMarker = useCallback((clientY) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const next = getDropPosition(movies, clientY, cardsRef)
      setDragMarker(prev => {
        if (prev?.targetId === next.targetId && prev?.position === next.position) return prev
        return next
      })
    })
  }, [movies])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.style.outline = `2px dashed ${col.color}`
    updateMarker(e.clientY)
  }

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    e.currentTarget.style.outline = 'none'
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setDragMarker(null)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.currentTarget.style.outline = 'none'
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const movieId = parseInt(e.dataTransfer.getData('movieId'))
    const fromSection = e.dataTransfer.getData('fromSection')
    if (!movieId) { setDragMarker(null); return }

    const dropInfo = getDropPosition(movies, e.clientY, cardsRef)

    if (fromSection === sectionKey) {
      if (dropInfo.targetId != null) {
        await onReorderCard(movieId, dropInfo.targetId, dropInfo.position, sectionKey)
      }
    } else {
      await onMoveCard(movieId, sectionKey, dropInfo.insertIndex)
    }
    setDragMarker(null)
  }

  const colBtnStyle = { background: 'transparent', border: 'none', borderRadius: 5, color: 'var(--text-muted)', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.12s, background 0.12s' }

  return (
    <div style={{
      width: 280, minWidth: 280, maxWidth: 280,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-surface, #111)', borderRadius: 10,
      border: '1px solid var(--border)', flexShrink: 0,
    }}>
      {/* Header */}
      <div
        style={{
          padding: '10px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 6,
          borderRadius: '10px 10px 0 0',
          borderTop: `3px solid ${col.color}`,
        }}
        onContextMenu={onGroupContextMenu}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditingName(false); setNameVal(defaultLabel) } }}
            onBlur={handleRename}
            style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${col.color}`, color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, outline: 'none', flex: 1 }}
          />
        ) : (
          <span
            onDoubleClick={() => setEditingName(true)}
            style={{ background: col.bg, color: col.color, border: `1px solid ${col.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, flexShrink: 0, cursor: 'default' }}
          >{defaultLabel}</span>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{movies.length}</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 2, opacity: headerHovered ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: headerHovered ? 'auto' : 'none' }}>
          <button onClick={(e) => { e.stopPropagation(); setEditingName(true) }} title={t('card.edit')} style={colBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.color = col.color; e.currentTarget.style.background = col.bg }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          ><Pencil size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete?.() }} title={t('card.delete')} style={colBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          ><X size={12} /></button>
        </div>
        <button
          onClick={onAdd}
          style={{ background: 'transparent', border: `1px solid ${col.border}`, borderRadius: 6, color: col.color, width: 26, height: 26, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          title={t('board.addMovie')}
        ><Plus size={14} /></button>
      </div>

      {/* Cards — drop zone */}
      <div
        ref={cardsRef}
        className="column-cards"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          padding: '10px 10px',
          display: 'flex', flexDirection: 'column', gap: 8,
          minHeight: 100,
          borderRadius: '0 0 10px 10px',
          transition: 'outline 0.1s',
        }}
      >
        {movies.map((movie) => (
          <div
            key={movie.id}
            data-movie-id={movie.id}
            style={{ position: 'relative' }}
          >
            {dragMarker?.targetId === movie.id && dragMarker.position === 'before' && (
              <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 3, background: col.color, borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />
            )}
            <MovieCard
              movie={movie}
              sectionKey={sectionKey}
              onContextMenu={onContextMenu}
            />
            {dragMarker?.targetId === movie.id && dragMarker.position === 'after' && (
              <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 3, background: col.color, borderRadius: 2, zIndex: 2, pointerEvents: 'none' }} />
            )}
          </div>
        ))}
        {movies.length === 0 && (
          <div style={{
            color: 'var(--text-muted)', fontSize: 12,
            textAlign: 'center', padding: '20px 0', opacity: 0.4,
          }}>{t('board.emptyColumn')}</div>
        )}
      </div>
    </div>
  )
}
