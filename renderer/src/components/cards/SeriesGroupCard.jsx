import React, { useState } from 'react'
import { Tv, ChevronDown, ChevronUp, Layers, Star, Film } from 'lucide-react'
import MovieCard from './MovieCard.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'

function formatVotes(n) {
  if (!n) return null
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function formatSeasonRange(seasonNumbers) {
  const nums = seasonNumbers.map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b)
  if (nums.length <= 1) return nums.map(n => `S${n}`).join(', ')
  if (nums.length <= 3) return nums.map(n => `S${n}`).join(', ')
  const isConsecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)
  if (isConsecutive) {
    return `S${nums[0]}–S${nums[nums.length - 1]}`
  }
  return `S${nums.slice(0, 2).join(', S')}...S${nums[nums.length - 1]}`
}

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
  const [isExpanded, setIsExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Sort seasons ascending by season number (S1, S2, S3...)
  const sortedSeasons = [...seasons].sort((a, b) => {
    const mA = a._movie || a
    const mB = b._movie || b
    const numA = parseInt((mA.title?.match(/[-—]\s*Season\s*(\d+)/i) || [])[1] || '1', 10)
    const numB = parseInt((mB.title?.match(/[-—]\s*Season\s*(\d+)/i) || [])[1] || '1', 10)
    return numA - numB
  })

  const seasonNumbers = sortedSeasons.map(s => {
    const m = s._movie || s
    const match = (m.title || '').match(/\u2014\s*Season\s*(\d+)/i) || (m.title || '').match(/-\s*Season\s*(\d+)/i)
    return match ? match[1] : '1'
  })

  const firstSeason = sortedSeasons[0]
  const firstMovie = firstSeason?._movie || firstSeason
  const firstSeasonId = firstSeason?.id

  const seasonBadgeText = `${seasons.length} ${t('common.seasons', null, 'mavsum')} (${formatSeasonRange(seasonNumbers)})`

  return (
    <div
      className="series-group-card-wrapper"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }}
    >
      {/* ============================================================
          MAIN UNIFIED SERIES CARD (Matches MovieCard styling exactly)
          ============================================================ */}
      <div
        className="series-unified-card"
        draggable={!!firstSeasonId}
        onDragStart={(e) => {
          if (!firstSeasonId) { e.preventDefault(); return }
          e.dataTransfer.setData('isSeriesGroup', 'true')
          e.dataTransfer.setData('itemId', String(firstSeasonId))
          e.dataTransfer.setData('fromGroup', String(group.id))
          e.dataTransfer.effectAllowed = 'move'
        }}
        onTouchStart={(e) => {
          if (!firstSeason) return
          handleTouchDragStart?.({ ...firstSeason, _isSeriesGroup: true }, e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchMove={(e) => {
          if (!firstSeason) return
          handleTouchDragMove?.({ ...firstSeason, _isSeriesGroup: true }, e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchEnd={(e) => {
          if (!firstSeason) return
          handleTouchDragEnd?.({ ...firstSeason, _isSeriesGroup: true }, e.changedTouches[0].clientX, e.changedTouches[0].clientY)
        }}
        onClick={() => onToggleExpandMovie?.(firstSeason.id)}
        onContextMenu={(e) => onItemContextMenu?.(e, firstSeason)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
          border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
          borderRadius: 14,
          display: 'flex',
          minHeight: 116,
          position: 'relative',
          cursor: 'pointer',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'transform 0.15s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.2s ease',
          userSelect: 'none',
          overflow: 'hidden'
        }}
      >
        {/* Left: Poster thumbnail */}
        <div
          style={{
            width: 82,
            minWidth: 82,
            flexShrink: 0,
            overflow: 'hidden',
            borderRadius: '13px 0 0 13px',
            background: '#08080a',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {firstMovie?.poster_path ? (
            <img
              src={firstMovie.poster_path}
              alt=""
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          ) : (
            <Film size={22} color="var(--text-muted)" />
          )}

          {/* TV Badge on poster */}
          <div
            style={{
              position: 'absolute',
              top: 5,
              left: 5,
              background: 'rgba(15, 12, 35, 0.82)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#c4b5fd',
              padding: '1px 5px',
              borderRadius: 5,
              fontSize: 9.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
          >
            <Tv size={9} />
            TV
          </div>
        </div>

        {/* Right: Info */}
        <div
          style={{
            flex: 1,
            padding: '10px 14px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 4
          }}
        >
          {/* Top row: Title + Expand toggle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {seriesTitle}
              </div>

              {/* Expand / Collapse Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(prev => !prev)
                }}
                style={{
                  background: isExpanded ? 'rgba(124, 58, 237, 0.18)' : 'var(--bg-input, rgba(0, 0, 0, 0.04))',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: 6,
                  color: 'var(--accent, #7c3aed)',
                  cursor: 'pointer',
                  padding: '3px 5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.15s'
                }}
                title={isExpanded ? 'Yig\'ish' : 'Mavsumlarni ko\'rish'}
              >
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Subtitle / Genre */}
            {firstMovie?.genre && (
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 11.5,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {[firstMovie.genre, firstMovie.director].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

          {/* Middle: Rating + Season Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {firstMovie?.rating ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={11} color="#fbbf24" fill="#fbbf24" />
                <span style={{ color: '#fbbf24', fontSize: 11.5, fontWeight: 600 }}>
                  {firstMovie.rating}
                </span>
                {firstMovie.vote_count ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    ({formatVotes(firstMovie.vote_count)})
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Season Count Badge */}
            <span
              style={{
                background: 'rgba(124, 58, 237, 0.12)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                color: 'var(--accent, #7c3aed)',
                fontSize: 10.5,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3.5
              }}
            >
              <Layers size={10} />
              {seasonBadgeText}
            </span>
          </div>

          {/* Bottom: Season Chips (clickable / draggable) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              overflowX: 'auto',
              paddingBottom: 2,
              scrollbarWidth: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sortedSeasons.map((s, idx) => {
              const num = seasonNumbers[idx]
              const isFirst = idx === 0
              return (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('isSeriesGroup', 'false')
                    e.dataTransfer.setData('itemId', String(s.id))
                    e.dataTransfer.setData('fromGroup', String(group.id))
                    e.dataTransfer.effectAllowed = 'move'
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleExpandMovie?.(s.id)
                  }}
                  style={{
                    background: isFirst ? 'rgba(124, 58, 237, 0.14)' : 'var(--bg-input, rgba(0, 0, 0, 0.04))',
                    border: `1px solid ${isFirst ? 'rgba(124, 58, 237, 0.45)' : 'var(--border)'}`,
                    color: isFirst ? 'var(--accent, #7c3aed)' : 'var(--text-secondary)',
                    borderRadius: 5,
                    padding: '2px 7px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'grab',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexShrink: 0
                  }}
                  title={`${s.title || seriesTitle + ' Season ' + num} — sudrab boshqa ustunga o'tkazish mumkin`}
                >
                  S{num}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          EXPANDED SEASONS LIST (Optional, opens when chevron clicked)
          ============================================================ */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            paddingLeft: 8,
            borderLeft: '2px solid rgba(139, 92, 246, 0.4)',
            marginTop: 2
          }}
        >
          {sortedSeasons.map(seasonItem => (
            <div key={seasonItem.id} style={{ position: 'relative' }}>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
