import React, { useState } from 'react'
import { Tv, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import MovieCard from './MovieCard.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function SeriesGroupCard({
  seriesTitle,
  seasons,
  group,
  expandedMovieId,
  onToggleExpandMovie,
  onMoveMovieSection,
  onSaveRating,
  onItemContextMenu,
  onItemDelete,
  handleTouchDragStart,
  handleTouchDragMove,
  handleTouchDragEnd,
  onOpenChronology,
  dragMarker
}) {
  const { t } = useLanguage()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const seasonNumbers = seasons.map(s => {
    const m = s._movie || s
    const match = (m.title || '').match(/—\s*Season\s*(\d+)/i) || (m.title || '').match(/-\s*Season\s*(\d+)/i)
    return match ? match[1] : '?'
  })

  return (
    <div
      className="series-group-card"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(139, 92, 246, 0.28)',
        borderRadius: 14,
        padding: '8px 8px 10px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* Series Group Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
          paddingBottom: isCollapsed ? 4 : 8,
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onClick={() => setIsCollapsed(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Tv size={12} />
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {seriesTitle}
          </span>
          <span
            style={{
              background: 'rgba(139, 92, 246, 0.16)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: '#c4b5fd',
              fontSize: 11,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 6,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            <Layers size={10} />
            {seasons.length} {t('common.seasons', null, 'mavsum')} (S{seasonNumbers.join(', S')})
          </span>
        </div>

        <button
          type="button"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isCollapsed ? "Kengaytirish" : "Yig'ish"}
        >
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {/* Grouped Seasons Stack */}
      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {seasons.map(seasonItem => (
            <div key={seasonItem.id} data-item-id={seasonItem.id} style={{ position: 'relative' }}>
              {dragMarker?.targetId === seasonItem.id && dragMarker.position === 'before' && (
                <div
                  className="drag-marker-line"
                  style={{
                    position: 'absolute',
                    top: -2,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: '#a78bfa',
                    borderRadius: 2,
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                />
              )}
              <MovieCard
                movie={seasonItem._movie || seasonItem}
                sectionKey={group.section_key}
                isExpanded={
                  expandedMovieId != null &&
                  (String(expandedMovieId) === String(seasonItem.id) ||
                    (seasonItem._movie && String(expandedMovieId) === String(seasonItem._movie.id)))
                }
                onToggleExpand={() => onToggleExpandMovie?.(seasonItem.id)}
                onClose={() => onToggleExpandMovie?.(null)}
                onMoveSection={(targetSectionKey) => onMoveMovieSection?.(seasonItem, targetSectionKey)}
                onRate={(newRating) => onSaveRating?.(seasonItem.id, newRating)}
                onContextMenu={(e) => onItemContextMenu?.(e, seasonItem)}
                onDelete={() => onItemDelete?.(seasonItem)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('itemId', String(seasonItem.id))
                  e.dataTransfer.setData('fromGroup', String(group.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onTouchDragStart={(movie, x, y) => handleTouchDragStart?.(seasonItem, x, y)}
                onTouchDragMove={(movie, x, y) => handleTouchDragMove?.(seasonItem, x, y)}
                onTouchDragEnd={(movie, x, y) => handleTouchDragEnd?.(seasonItem, x, y)}
                onOpenChronology={onOpenChronology}
              />
              {dragMarker?.targetId === seasonItem.id && dragMarker.position === 'after' && (
                <div
                  className="drag-marker-line"
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: '#a78bfa',
                    borderRadius: 2,
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
