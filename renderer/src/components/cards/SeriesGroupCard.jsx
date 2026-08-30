import React, { useState } from "react"
import { Tv, ChevronDown, ChevronUp, Layers, Star, Film } from "lucide-react"
import MovieCard from "./MovieCard.jsx"
import { useLanguage } from "../../context/LanguageContext.jsx"

function formatVotes(n) {
  if (!n) return null
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}

function formatSeasonRange(seasonNumbers) {
  const nums = seasonNumbers.map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b)
  if (nums.length <= 1) return nums.map(n => `S${n}`).join(", ")
  if (nums.length <= 3) return nums.map(n => `S${n}`).join(", ")
  const isConsecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)
  if (isConsecutive) {
    return `S${nums[0]}–S${nums[nums.length - 1]}`
  }
  return `S${nums.slice(0, 2).join(", S")}...S${nums[nums.length - 1]}`
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
  const [isDraggingGroup, setIsDraggingGroup] = useState(false)
  const [touchDragActive, setTouchDragActive] = useState(false)

  // Sort seasons ascending by season number (S1, S2, S3...)
  const sortedSeasons = [...seasons].sort((a, b) => {
    const mA = a._movie || a
    const mB = b._movie || b
    const numA = parseInt((mA.title?.match(/[-\u2014]\s*Season\s*(\d+)/i) || [])[1] || "1", 10)
    const numB = parseInt((mB.title?.match(/[-\u2014]\s*Season\s*(\d+)/i) || [])[1] || "1", 10)
    return numA - numB
  })

  const seasonNumbers = sortedSeasons.map(s => {
    const m = s._movie || s
    const match = (m.title || "").match(/\u2014\s*Season\s*(\d+)/i) || (m.title || "").match(/-\s*Season\s*(\d+)/i)
    return match ? match[1] : "1"
  })

  const firstSeason = sortedSeasons[0]
  const firstMovie = firstSeason?._movie || firstSeason
  const firstSeasonId = firstSeason?.id

  // Dragging the main unified card moves the EARLIEST season (S1)
  const handleGroupTouchStart = (e) => {
    if (!firstSeason) return
    setTouchDragActive(true)
    handleTouchDragStart?.({ ...firstSeason, _isSeriesGroup: true }, e.touches[0].clientX, e.touches[0].clientY)
  }
  const handleGroupTouchMove = (e) => {
    if (!touchDragActive || !firstSeason) return
    e.preventDefault()
    handleTouchDragMove?.({ ...firstSeason, _isSeriesGroup: true }, e.touches[0].clientX, e.touches[0].clientY)
  }
  const handleGroupTouchEnd = (e) => {
    if (!touchDragActive || !firstSeason) return
    const touch = e.changedTouches[0]
    handleTouchDragEnd?.({ ...firstSeason, _isSeriesGroup: true }, touch.clientX, touch.clientY)
    setTouchDragActive(false)
  }

  const seasonBadgeText = `${seasons.length} ${t("common.seasons", null, "mavsum")} (${formatSeasonRange(seasonNumbers)})`

  return (
    <div
      className="series-group-card-wrapper"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 6
      }}
    >
      {/* ============================================================
          MAIN UNIFIED SERIES CARD (Single compact card)
          Dragging this card moves Season 1 to the destination column!
          ============================================================ */}
      <div
        className="series-unified-card"
        draggable={!!firstSeasonId}
        onDragStart={(e) => {
          if (!firstSeasonId) { e.preventDefault(); return }
          e.dataTransfer.setData("isSeriesGroup", "true")
          e.dataTransfer.setData("itemId", String(firstSeasonId))
          e.dataTransfer.setData("fromGroup", String(group.id))
          e.dataTransfer.effectAllowed = "move"
          
          const el = e.currentTarget
          setTimeout(() => {
            if (el) el.style.opacity = '0'
          }, 0)
          setIsDraggingGroup(true)
          e.stopPropagation()
        }}
        onDragEnd={(e) => {
          if (e.currentTarget) {
            e.currentTarget.style.transition = 'opacity 0.2s ease'
            e.currentTarget.style.opacity = '1'
          }
          setIsDraggingGroup(false)
        }}
        onMouseEnter={(e) => {
          if (isDraggingGroup) return
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)'
          e.currentTarget.style.background = 'var(--bg-card-hover)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)'
          e.currentTarget.style.background = 'var(--bg-surface)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        onTouchStart={handleGroupTouchStart}
        onTouchMove={handleGroupTouchMove}
        onTouchEnd={handleGroupTouchEnd}
        onClick={() => {
          if (!isDraggingGroup && !touchDragActive) onToggleExpandMovie?.(firstSeason.id)
        }}
        onContextMenu={(e) => onItemContextMenu?.(e, firstSeason)}
        style={{
          background: "var(--bg-surface)",
          border: isDraggingGroup ? "1.5px dashed var(--accent, #8b5cf6)" : "1px solid rgba(139, 92, 246, 0.35)",
          borderRadius: 14,
          display: "flex",
          minHeight: 104,
          position: "relative",
          cursor: isDraggingGroup ? "grabbing" : "grab",
          boxShadow: "0 3px 12px rgba(139, 92, 246, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",
          transition: "transform 0.15s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.2s ease",
          userSelect: "none"
        }}
      >
        {/* Layered stack indicator (visual stacked cards behind) */}
        <div
          style={{
            position: "absolute",
            top: -4,
            left: 12,
            right: 12,
            height: 6,
            background: "rgba(139, 92, 246, 0.18)",
            borderRadius: "10px 10px 0 0",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            borderBottom: "none",
            zIndex: 0,
            pointerEvents: "none"
          }}
        />

        {/* Left: Poster thumbnail */}
        <div
          style={{
            width: 82,
            minWidth: 82,
            flexShrink: 0,
            overflow: "hidden",
            borderRadius: "13px 0 0 13px",
            background: "#08080a",
            position: "relative",
            zIndex: 1
          }}
        >
          {firstMovie?.poster_path ? (
            <img
              src={firstMovie.poster_path}
              alt=""
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <Film size={22} />
            </div>
          )}

          {/* Series badge on poster */}
          <div
            style={{
              position: "absolute",
              top: 5,
              left: 5,
              background: "rgba(15, 12, 35, 0.82)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              color: "#c4b5fd",
              padding: "1px 5px",
              borderRadius: 5,
              fontSize: 9.5,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
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
            padding: "8px 12px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 4,
            zIndex: 1
          }}
        >
          {/* Top row: Title + Expand toggle */}
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13.5,
                  color: "var(--text-primary)",
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical"
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
                  background: isExpanded ? "rgba(139, 92, 246, 0.2)" : "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: 6,
                  color: "#c4b5fd",
                  cursor: "pointer",
                  padding: "3px 5px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.15s"
                }}
                title={isExpanded ? "Yig'ish" : "Mavsumlarni ko'rish"}
              >
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Subtitle / Genre */}
            {firstMovie?.genre && (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 11,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {[firstMovie.genre, firstMovie.director].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          {/* Middle: Rating + Season Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {firstMovie?.rating ? (
              <div style={{ display: "flex", alignItems: "center", gap: 3.5 }}>
                <Star size={11} color="#fbbf24" fill="#fbbf24" />
                <span style={{ color: "#fbbf24", fontSize: 11.5, fontWeight: 700 }}>
                  {firstMovie.rating}
                </span>
                {firstMovie.vote_count ? (
                  <span style={{ color: "var(--text-muted)", fontSize: 10.5 }}>
                    ({formatVotes(firstMovie.vote_count)})
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Season Count Badge */}
            <span
              style={{
                background: "rgba(139, 92, 246, 0.16)",
                border: "1px solid rgba(139, 92, 246, 0.32)",
                color: "#c4b5fd",
                fontSize: 10.5,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 5,
                display: "inline-flex",
                alignItems: "center",
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
              display: "flex",
              alignItems: "center",
              gap: 4,
              overflowX: "auto",
              paddingBottom: 2,
              scrollbarWidth: "none"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {sortedSeasons.map((s, idx) => {
              const num = seasonNumbers[idx]
              return (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("itemId", String(s.id))
                    e.dataTransfer.setData("fromGroup", String(group.id))
                    e.dataTransfer.effectAllowed = "move"
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleExpandMovie?.(s.id)
                  }}
                  style={{
                    background: idx === 0 ? "rgba(139, 92, 246, 0.28)" : "rgba(255, 255, 255, 0.06)",
                    border: `1px solid ${idx === 0 ? "rgba(139, 92, 246, 0.55)" : "rgba(255, 255, 255, 0.12)"}`,
                    color: idx === 0 ? "#e9d5ff" : "var(--text-secondary)",
                    borderRadius: 5,
                    padding: "2px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "grab",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexShrink: 0
                  }}
                  title={`${s.title || seriesTitle + " Season " + num} — sudrab boshqa ustunga o'tkazish mumkin`}
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
          Shows detailed cards for each individual season if user wants full view
          ============================================================ */}
      {isExpanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            paddingLeft: 8,
            borderLeft: "2px solid rgba(139, 92, 246, 0.4)",
            marginTop: 2
          }}
        >
          {sortedSeasons.map(seasonItem => (
            <div key={seasonItem.id} data-item-id={seasonItem.id} style={{ position: "relative" }}>
              {dragMarker?.targetId === seasonItem.id && dragMarker.position === "before" && (
                <div
                  className="drag-marker-line"
                  style={{
                    position: "absolute",
                    top: -2,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "#a78bfa",
                    borderRadius: 2,
                    zIndex: 2,
                    pointerEvents: "none"
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
                  e.dataTransfer.setData("itemId", String(seasonItem.id))
                  e.dataTransfer.setData("fromGroup", String(group.id))
                  e.dataTransfer.effectAllowed = "move"
                }}
                onTouchDragStart={(movie, x, y) => handleTouchDragStart?.(seasonItem, x, y)}
                onTouchDragMove={(movie, x, y) => handleTouchDragMove?.(seasonItem, x, y)}
                onTouchDragEnd={(movie, x, y) => handleTouchDragEnd?.(seasonItem, x, y)}
                onOpenChronology={onOpenChronology}
              />
              {dragMarker?.targetId === seasonItem.id && dragMarker.position === "after" && (
                <div
                  className="drag-marker-line"
                  style={{
                    position: "absolute",
                    bottom: -2,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "#a78bfa",
                    borderRadius: 2,
                    zIndex: 2,
                    pointerEvents: "none"
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
