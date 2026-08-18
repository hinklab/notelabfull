import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Plus, Minus, RotateCcw, Sparkles, CheckCircle, Clock, Film, Star, ArrowRight, ChevronLeft, ChevronRight, Search, ListFilter, AlertCircle, ExternalLink, X, Calendar, PlusCircle, Check, Loader2 } from 'lucide-react'

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

export default function ChronologySpace({ targetTmdbId = null, targetMediaType = null }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 300, y: 120 })
  const [isPanning, setIsPanning] = useState(false)
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

  // Card Detail Modal States
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [backdrops, setBackdrops] = useState([])
  const [loadingBackdrops, setLoadingBackdrops] = useState(false)
  const [selectedScene, setSelectedScene] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [addingMovieId, setAddingMovieId] = useState(null)
  const [selectedSection, setSelectedSection] = useState('todo')

  const canvasRef = useRef(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  // Fetch backdrops when detail modal opens
  useEffect(() => {
    if (selectedMovie && selectedMovie.tmdb_id) {
      setLoadingBackdrops(true)
      setBackdrops([])
      window.api.getMovieImages(selectedMovie.tmdb_id, selectedMovie.media_type)
        .then(res => {
          if (res && res.backdrops && res.backdrops.length > 0) {
            setBackdrops(res.backdrops)
          }
        })
        .catch(err => console.warn('Failed fetching scene backdrops:', err))
        .finally(() => setLoadingBackdrops(false))
    }
  }, [selectedMovie])

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
  const loadFranchiseData = async (tmdbId, mediaType = null) => {
    if (!tmdbId) return
    setLoading(true)
    setError(null)
    try {
      if (window.api && window.api.getFranchiseUniverse) {
        const data = await window.api.getFranchiseUniverse(tmdbId, mediaType)
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

  // Initial load effect
  useEffect(() => {
    (async () => {
      const list = await fetchViewedFranchises()
      if (targetTmdbId) {
        loadFranchiseData(targetTmdbId, targetMediaType)
      } else if (list && list.length > 0 && list[0].tmdb_id) {
        loadFranchiseData(list[0].tmdb_id, list[0].media_type || null)
      } else {
        loadFranchiseData(1726, 'movie')
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
      
      setToastMessage(`"${movieToAdd.title}" kinolar taxtasiga muvaffaqiyatli qo'shildi!`)
      setTimeout(() => setToastMessage(null), 3500)
    } catch (err) {
      console.error('Failed adding movie to board:', err)
      setToastMessage(`Xatolik: ${err.message}`)
      setTimeout(() => setToastMessage(null), 3500)
    } finally {
      setAddingMovieId(null)
    }
  }

  // Mouse drag panning handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.space-card-clickable') || e.target.closest('.space-controls') || e.target.closest('.space-sidebar') || e.target.closest('.space-modal')) {
      return
    }
    setIsPanning(true)
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    setPan({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Native non-passive wheel listener for smooth, cursor-centered zooming
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const curZoom = zoomRef.current
      const curPan = panRef.current

      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
      const newZoom = Math.min(Math.max(curZoom * zoomFactor, 0.35), 2.5)

      const newPanX = mouseX - (mouseX - curPan.x) * (newZoom / curZoom)
      const newPanY = mouseY - (mouseY - curPan.y) * (newZoom / curZoom)

      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // Floating controls buttons
  const handleZoomIn = () => {
    const nextZoom = Math.min(zoom * 1.15, 2.5)
    setZoom(nextZoom)
  }
  const handleZoomOut = () => {
    const nextZoom = Math.max(zoom / 1.15, 0.35)
    setZoom(nextZoom)
  }
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: sidebarOpen ? 300 : 80, y: 120 })
  }

  const movies = universeData?.movies || []
  const displayTitle = universeData?.universe_name || universeData?.collection_name || 'Kino Xronologiyasi'

  const filteredFranchises = viewedFranchises.filter(f => 
    !sidebarSearch.trim() || (f.name && f.name.toLowerCase().includes(sidebarSearch.toLowerCase().trim()))
  )

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
        background: '#090a0f',
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)',
        backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
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
          width: sidebarOpen ? 260 : 44,
          height: 'calc(100vh - 84px)',
          background: 'rgba(15, 17, 26, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
      >
        {/* Sidebar Header & Toggle */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#f4f4f5' }}>
              <Sparkles size={16} color="#a78bfa" />
              <span>Franchizalar ({viewedFranchises.length})</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Paneni yopish" : "Paneni ochish"}
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#a1a1aa',
              width: 28,
              height: 28,
              borderRadius: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: sidebarOpen ? '0' : '0 auto',
              transition: 'all 0.15s ease'
            }}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Sidebar Content */}
        {sidebarOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '12px 14px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={13} color="#a1a1aa" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Franchiza qidirish..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: '6px 10px 6px 30px',
                  fontSize: 12,
                  color: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* List of Franchises */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
              {filteredFranchises.length === 0 ? (
                <div style={{ fontSize: 11, color: '#71717a', textAlign: 'center', padding: '24px 8px' }}>
                  {viewedFranchises.length === 0 ? "Ko'rilgan franchizalar yo'q. Kinolardan xronologiyaga kiring!" : "Topilmadi."}
                </div>
              ) : (
                filteredFranchises.map((item, idx) => {
                  const itemKey = item.universe_key || item.key || (item.tmdb_id ? `movie_${item.tmdb_id}` : `idx_${idx}`)
                  const isActive = (item.universe_key && universeData?.universe_key === item.universe_key) || (item.tmdb_id && activeTmdbId === item.tmdb_id)
                  const countToDisplay = (item.universe_key && universeData?.universe_key === item.universe_key) ? universeData.movies.length : (item.total_movies || item.movie_count || 0)

                  return (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() => loadFranchiseData(item.tmdb_id, item.media_type)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 14,
                        width: '100%',
                        textAlign: 'left',
                        background: isActive ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                        border: isActive ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#a78bfa' : '#f4f4f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: '#a1a1aa', marginTop: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {item.is_universe ? (
                            <>
                              <Sparkles size={11} color="#c084fc" />
                              <span>UNIVERSE</span>
                            </>
                          ) : (
                            <>
                              <Film size={11} color="#a1a1aa" />
                              <span>COLLECTION</span>
                            </>
                          )}
                        </span>
                        <span style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>{countToDisplay} kinolar</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top Banner inside Space */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: sidebarOpen ? 296 : 76,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(15, 17, 26, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 30,
        padding: '10px 20px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <Sparkles size={18} color="#a78bfa" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f4f4f5' }}>{displayTitle}</div>
          <div style={{ fontSize: 11, color: '#a1a1aa' }}>
            {universeData?.is_universe ? 'Kanonik xronologik syujet bo\'yicha' : 'Chaqirilgan to\'plam'} · {movies.length} ta film ({universeData?.in_board_count || 0} ta taxtada)
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 15,
          background: 'rgba(9, 10, 15, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          color: '#a78bfa'
        }}>
          <Sparkles className="animate-spin" size={28} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5' }}>Franchiza xronologiyasi yuklanmoqda...</div>
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
          gap: 8
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Pannable & Zoomable World Container (GPU Accelerated) */}
      <div style={{
        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
        transformOrigin: '0 0',
        willChange: 'transform',
        position: 'absolute',
        top: 0,
        left: 0,
        transition: isPanning ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {(() => {
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
              positionedNodes.push({ movie, x, y, id: movie.tmdb_id || idx, stage, lane })
            })

            // 2. Build explicit DAG connections from connects_to
            positionedNodes.forEach(source => {
              const targets = source.movie.connects_to || []
              targets.forEach(targetId => {
                const targetNode = positionedNodes.find(n => Number(n.movie.tmdb_id) === Number(targetId))
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

          const maxX = Math.max(...positionedNodes.map(n => n.x), 1000)
          const maxY = Math.max(...positionedNodes.map(n => n.y), 800)

          return (
            <div style={{ position: 'relative', width: maxX + 600, height: maxY + 400 }}>
              {/* SVG Layer for Bezier Connection Cables & Junctions */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                <defs>
                  <linearGradient id="cable-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="cable-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {connections.map((conn, cIdx) => {
                  const x1 = conn.from.x + CARD_W
                  const y1 = conn.from.y + CARD_H / 2
                  const x2 = conn.to.x
                  const y2 = conn.to.y + CARD_H / 2
                  const dx = (x2 - x1) * 0.5
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`

                  const isConnHovered = hoveredNodeId && (
                    conn.from.id === hoveredNodeId ||
                    conn.to.id === hoveredNodeId ||
                    String(conn.from.movie?.tmdb_id) === String(hoveredNodeId) ||
                    String(conn.to.movie?.tmdb_id) === String(hoveredNodeId)
                  )
                  const isAnyHovered = !!hoveredNodeId

                  return (
                    <g key={`conn_${cIdx}`}>
                      {isConnHovered ? (
                        <>
                          {/* Ambient soft glow on active hover */}
                          <path
                            d={d}
                            fill="none"
                            stroke="rgba(167, 139, 250, 0.35)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            style={{ transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }}
                          />
                          {/* Active illuminated cable */}
                          <path
                            d={d}
                            fill="none"
                            stroke="url(#cable-active-grad)"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            filter="url(#cable-soft-glow)"
                            style={{ transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }}
                          />
                          {/* Illuminated junction dots */}
                          <circle cx={x1} cy={y1} r="4" fill="#c084fc" filter="url(#cable-soft-glow)" style={{ transition: 'all 0.22s ease' }} />
                          <circle cx={x2} cy={y2} r="4" fill="#a78bfa" filter="url(#cable-soft-glow)" style={{ transition: 'all 0.22s ease' }} />
                        </>
                      ) : (
                        <>
                          {/* Default low-contrast subtle line */}
                          <path
                            d={d}
                            fill="none"
                            stroke={isAnyHovered ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.12)"}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            style={{ transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }}
                          />
                          {/* Subtle junction dots */}
                          <circle cx={x1} cy={y1} r="3" fill={isAnyHovered ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.22)"} style={{ transition: 'all 0.22s ease' }} />
                          <circle cx={x2} cy={y2} r="3" fill={isAnyHovered ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.22)"} style={{ transition: 'all 0.22s ease' }} />
                        </>
                      )}
                    </g>
                  )
                })}
              </svg>

              {/* Positioned Node Cards (Horizontal Board Card Style) */}
              {positionedNodes.map(({ movie, x, y, id }) => {
                const isCardHovered = hoveredNodeId === id || String(movie.tmdb_id) === String(hoveredNodeId)
                const isConnectedToHovered = hoveredNodeId && connections.some(c => 
                  (c.from.id === id && (c.to.id === hoveredNodeId || String(c.to.movie?.tmdb_id) === String(hoveredNodeId))) ||
                  (c.to.id === id && (c.from.id === hoveredNodeId || String(c.from.movie?.tmdb_id) === String(hoveredNodeId)))
                )
                const isAdding = addingMovieId === movie.tmdb_id

                return (
                  <div
                    key={movie.tmdb_id || movie.title}
                    className="space-card-clickable"
                    onClick={() => setSelectedMovie(movie)}
                    onMouseEnter={() => setHoveredNodeId(movie.tmdb_id || id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: y,
                      width: CARD_W,
                      height: CARD_H,
                      background: isCardHovered ? '#151726' : '#12131f',
                      border: isCardHovered
                        ? '1px solid #a78bfa'
                        : isConnectedToHovered
                          ? '1px solid rgba(167, 139, 250, 0.45)'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 14,
                      display: 'flex',
                      cursor: 'pointer',
                      zIndex: isCardHovered ? 12 : isConnectedToHovered ? 5 : 2,
                      boxShadow: isCardHovered
                        ? '0 16px 40px rgba(124, 58, 237, 0.35)'
                        : isConnectedToHovered
                          ? '0 10px 24px rgba(124, 58, 237, 0.2)'
                          : '0 6px 20px rgba(0, 0, 0, 0.55)',
                      transform: isCardHovered ? 'translateY(-3px) scale(1.02)' : 'translateY(0) scale(1)',
                      transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease',
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
                      background: isCardHovered || isConnectedToHovered ? '#a78bfa' : 'rgba(255, 255, 255, 0.35)',
                      border: '2px solid #090a0f',
                      boxShadow: isCardHovered || isConnectedToHovered ? '0 0 8px rgba(167, 139, 250, 0.9)' : 'none',
                      transition: 'all 0.18s ease',
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
                      background: isCardHovered || isConnectedToHovered ? '#c084fc' : 'rgba(255, 255, 255, 0.35)',
                      border: '2px solid #090a0f',
                      boxShadow: isCardHovered || isConnectedToHovered ? '0 0 8px rgba(192, 132, 252, 0.9)' : 'none',
                      transition: 'all 0.18s ease',
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
                      background: '#181926'
                    }}>
                      <img
                        src={movie.poster_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" fill="%231e2030"><rect width="60" height="90"/></svg>'}
                        alt={movie.title}
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
                        background: 'rgba(15, 15, 26, 0.88)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        borderRadius: 10,
                        padding: '2px 6px',
                        fontSize: 10,
                        fontWeight: 800,
                        color: '#a78bfa'
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
                          color: '#f4f4f5',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a1a1aa' }}>
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
                            <span>{movie.user_movie?.section?.toUpperCase() || 'BAZADA'}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleAddMovieToBoard(movie, 'todo', e)}
                            disabled={isAdding}
                            style={{
                              border: 'none',
                              background: 'rgba(124, 58, 237, 0.22)',
                              border: '1px solid rgba(167, 139, 250, 0.4)',
                              color: '#c084fc',
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
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124, 58, 237, 0.4)'; e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124, 58, 237, 0.22)'; e.currentTarget.style.color = '#c084fc' }}
                          >
                            {isAdding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                            <span>+ Qo'shish</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        })()}
      </div>

      {/* Floating Canvas Controls (Zoom / Reset) */}
      <div
        className="space-controls"
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(15, 17, 26, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 24,
          padding: '6px 10px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={handleZoomOut}
          title="Kichiklashtirish (-)"
          style={{ border: 'none', background: 'transparent', color: '#f4f4f5', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><Minus size={15} /></button>
        
        <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', minWidth: 42, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          title="Kattalashtirish (+)"
          style={{ border: 'none', background: 'transparent', color: '#f4f4f5', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><Plus size={15} /></button>

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

        <button
          onClick={handleResetView}
          title="Ko'rinishni tiklash (100%)"
          style={{ border: 'none', background: 'transparent', color: '#a1a1aa', width: 32, height: 32, borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
            background: 'rgba(0, 0, 0, 0.82)',
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
              width: 'min(740px, 94vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#12131e',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 24,
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
              color: '#f4f4f5'
            }}
          >
            {/* Modal Header Banner */}
            <div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden', borderRadius: '24px 24px 0 0' }}>
              <img
                src={selectedMovie.poster_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" fill="%231e2030"><rect width="60" height="90"/></svg>'}
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
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, #12131e 100%)' }} />

              {/* Close Button */}
              <button
                onClick={() => setSelectedMovie(null)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  border: 'none',
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#f4f4f5',
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
              ><X size={18} /></button>

              {/* Poster & Main Header Info */}
              <div style={{ position: 'absolute', bottom: 16, left: 24, right: 24, display: 'flex', gap: 20, alignItems: 'flex-end', zIndex: 5 }}>
                <img
                  src={selectedMovie.poster_path}
                  alt={selectedMovie.title}
                  style={{
                    width: 110,
                    height: 160,
                    objectFit: 'cover',
                    borderRadius: 14,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, color: '#ffffff', marginBottom: 6 }}>
                    {selectedMovie.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: '#a1a1aa' }}>
                    <span>{selectedMovie.release_year || selectedMovie.release_date?.split('-')[0] || '-'}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>{selectedMovie.media_type === 'tv' ? 'Serial' : 'Film'}</span>
                    {selectedMovie.rating ? (
                      <>
                        <span>•</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Star size={13} fill="#fbbf24" color="#fbbf24" /> {selectedMovie.rating}/10
                        </span>
                      </>
                    ) : null}
                    {selectedMovie.vote_count ? <span style={{ fontSize: 11 }}>({formatVotes(selectedMovie.vote_count)} ovoz)</span> : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body Info */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Board Action Bar */}
              <div style={{
                background: selectedMovie.in_board ? 'rgba(52, 211, 153, 0.08)' : 'rgba(124, 58, 237, 0.08)',
                border: selectedMovie.in_board ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(167, 139, 250, 0.25)',
                borderRadius: 16,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                {selectedMovie.in_board ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 600, fontSize: 13 }}>
                    <CheckCircle size={18} />
                    <span>Ushbu film allaqachon kinolar taxtangizda mavjud ({selectedMovie.user_movie?.section?.toUpperCase() || 'TODO'})</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5' }}>Ushbu film taxtangizda yo'q</div>
                      <div style={{ fontSize: 11, color: '#a1a1aa' }}>Qo'shish orqali ko'rish rejangizga kiritishingiz mumkin</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <select
                        value={selectedSection}
                        onChange={e => setSelectedSection(e.target.value)}
                        style={{
                          background: '#1b1c2b',
                          color: '#f4f4f5',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 10,
                          padding: '6px 10px',
                          fontSize: 12,
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="todo">To Do (Ko'riladi)</option>
                        <option value="futured">Futured (Kutilmoqda)</option>
                        <option value="doing">Going (Ko'rilmoqda)</option>
                        <option value="done">Done (Ko'rildi)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAddMovieToBoard(selectedMovie, selectedSection)}
                        disabled={addingMovieId === selectedMovie.tmdb_id}
                        style={{
                          border: 'none',
                          background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                          color: '#ffffff',
                          borderRadius: 10,
                          padding: '7px 16px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
                        }}
                      >
                        {addingMovieId === selectedMovie.tmdb_id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        <span>+ Taxtaga qo'shish</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags & Meta Details */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                {selectedMovie.release_date && (
                  <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '5px 12px', color: '#d4d4d8', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={12} color="#a78bfa" /> {formatReleaseDate(selectedMovie.release_date)}
                  </span>
                )}
                {selectedMovie.genre && selectedMovie.genre !== '-' && (
                  <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '5px 12px', color: '#d4d4d8' }}>
                    {selectedMovie.genre}
                  </span>
                )}
                {selectedMovie.director && selectedMovie.director !== '-' && (
                  <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '5px 12px', color: '#d4d4d8' }}>
                    Rejissyor: {selectedMovie.director}
                  </span>
                )}
                {selectedMovie.seasons && selectedMovie.seasons !== '-' && (
                  <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '5px 12px', color: '#d4d4d8', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} color="#a78bfa" /> {selectedMovie.seasons}
                  </span>
                )}
              </div>

              {/* Overview / Story Plot */}
              {selectedMovie.overview && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#a1a1aa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Film Syujeti
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: '#e4e4e7' }}>
                    {selectedMovie.overview}
                  </div>
                </div>
              )}

              {/* Film Kadrlar (Scene Backdrops Gallery) */}
              {(loadingBackdrops || backdrops.length > 0) && (
                <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Film size={14} color="#a78bfa" /> Film Kadrlari (Sahnalar)</span>
                      {backdrops.length > 0 && <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 400 }}>({backdrops.length} ta kadr)</span>}
                    </span>
                    <span style={{ fontSize: 11, color: '#a1a1aa' }}>Kattalashtirish uchun bosing</span>
                  </div>

                  {loadingBackdrops ? (
                    <div style={{ color: '#a1a1aa', fontSize: 12, padding: '12px 0' }}>Kadrlari yuklanmoqda...</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'thin' }}>
                      {backdrops.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedScene(imgUrl)}
                          style={{
                            position: 'relative',
                            width: 160,
                            height: 94,
                            borderRadius: 10,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            flexShrink: 0,
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: '#181926',
                            transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Sahna ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lightbox for Zoomed Scene Image */}
      {selectedScene && ReactDOM.createPortal(
        <div
          onClick={() => setSelectedScene(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
            background: 'rgba(0, 0, 0, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setSelectedScene(null)}
              style={{
                position: 'absolute',
                top: -16,
                right: -16,
                border: 'none',
                background: '#18181b',
                color: '#fff',
                width: 36,
                height: 36,
                borderRadius: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                zIndex: 2
              }}
            ><X size={16} /></button>
            <img
              src={selectedScene}
              alt="Film sahna rasmi"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                display: 'block'
              }}
            />
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
