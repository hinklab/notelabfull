import React, { useState, useRef, useEffect } from 'react'
import { Plus, Minus, RotateCcw, Sparkles, CheckCircle, Clock, Film, Star, ArrowRight, ChevronLeft, ChevronRight, Search, ListFilter, AlertCircle, ExternalLink } from 'lucide-react'

export default function ChronologySpace({ targetTmdbId = null, targetMediaType = null, onSelectMovieForDetail }) {
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

  const canvasRef = useRef(null)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    panRef.current = pan
  }, [pan])

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
        // Refresh viewed franchises list to ensure active one is on top
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
        // Load the MOST RECENTLY viewed franchise automatically
        loadFranchiseData(list[0].tmdb_id, list[0].media_type || null)
      } else {
        // Fallback default: MCU Iron Man (tmdb_id: 1726)
        loadFranchiseData(1726, 'movie')
      }
    })()
  }, [targetTmdbId, targetMediaType])

  // Mouse drag panning handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.space-card-clickable') || e.target.closest('.space-controls') || e.target.closest('.space-sidebar')) {
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

      const currentZoom = zoomRef.current
      const currentPan = panRef.current

      // Fine 5% zoom step per wheel tick (1.05x / 0.95x) for smooth control
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95
      const nextZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.4), 2.5)

      if (nextZoom === currentZoom) return

      // Calculate pan offset to keep point under mouse cursor stationary
      const nextPanX = mouseX - ((mouseX - currentPan.x) / currentZoom) * nextZoom
      const nextPanY = mouseY - ((mouseY - currentPan.y) / currentZoom) * nextZoom

      setZoom(nextZoom)
      setPan({ x: nextPanX, y: nextPanY })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const handleZoomIn = () => {
    const nextZoom = Math.min(zoom * 1.15, 2.5)
    setZoom(nextZoom)
  }
  const handleZoomOut = () => {
    const nextZoom = Math.max(zoom / 1.15, 0.4)
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
                filteredFranchises.map((item) => {
                  const isActive = (item.universe_key && universeData?.universe_key === item.universe_key) || (item.tmdb_id && activeTmdbId === item.tmdb_id)
                  return (
                    <div
                      key={item.key || item.tmdb_id || item.name}
                      onClick={() => loadFranchiseData(item.tmdb_id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 14,
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
                        <span>{item.is_universe ? '🌌 UNIVERSE' : '🎬 COLLECTION'}</span>
                        <span style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 6 }}>{item.total_movies || 0} kinolar</span>
                      </div>
                    </div>
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
            {universeData?.is_universe ? 'Voqealar voqelik ketma-ketligida (In-Story Order)' : 'Chaqirilgan to\'plam'} · {movies.length} ta film ({universeData?.in_board_count || 0} ta bazada)
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
        transition: isPanning ? 'none' : 'transform 0.06s cubic-bezier(0.1, 1, 0.1, 1)',
      }}>
        {/* Horizontal Sequence Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 70, paddingTop: 120, paddingLeft: sidebarOpen ? 60 : 40 }}>
          {movies.map((movie, idx) => (
            <React.Fragment key={movie.tmdb_id || idx}>
              {/* Chronology Movie Card */}
              <div
                className="space-card-clickable"
                onClick={() => onSelectMovieForDetail && onSelectMovieForDetail(movie)}
                style={{
                  position: 'relative',
                  width: 220,
                  background: '#12131c',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 20,
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.03)'
                  e.currentTarget.style.borderColor = '#a78bfa'
                  e.currentTarget.style.boxShadow = '0 30px 70px rgba(124, 58, 237, 0.35)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'
                  e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.6)'
                }}
              >
                {/* Chronology Badge Pill */}
                <div style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  zIndex: 3,
                  background: 'rgba(15, 15, 26, 0.85)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 20,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#a78bfa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  #{movie.chronology_index || (idx + 1)}
                </div>

                {/* Poster Container with Mask Fade Overlay */}
                <div style={{ position: 'relative', width: '100%', height: 300, overflow: 'hidden' }}>
                  <img
                    src={movie.poster_path || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90" fill="%231e2030"><rect width="60" height="90"/></svg>'}
                    alt={movie.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
                    }}
                  />
                  {/* Subtle Gradient Overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, transparent 40%, #12131c 100%)',
                  }} />
                </div>

                {/* Movie Details Below Poster */}
                <div style={{ padding: '0 16px 18px 16px', marginTop: -20, position: 'relative', zIndex: 2 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.3,
                    marginBottom: 6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {movie.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#a1a1aa', marginBottom: 12 }}>
                    <span>{movie.release_year || movie.release_date?.split('-')[0] || '-'}</span>
                    {movie.rating ? <span style={{ color: '#fbbf24', fontWeight: 600 }}>★ {movie.rating}</span> : null}
                  </div>

                  {/* User Board Status Badge */}
                  <div>
                    {movie.in_board ? (
                      <div style={{
                        background: 'rgba(52, 211, 153, 0.15)',
                        border: '1px solid rgba(52, 211, 153, 0.35)',
                        color: '#34d399',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <CheckCircle size={12} />
                          <span>{movie.user_movie?.section?.toUpperCase() || 'IN BOARD'}</span>
                        </span>
                        {movie.user_movie?.user_rating ? <span>⭐ {movie.user_movie.user_rating}</span> : null}
                      </div>
                    ) : (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#a1a1aa',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>Bazada yo'q</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connecting Illuminated Arrow between consecutive cards */}
              {idx < movies.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{
                    width: 32,
                    height: 2,
                    background: 'linear-gradient(to right, rgba(167, 139, 250, 0.3), rgba(167, 139, 250, 0.8))',
                    boxShadow: '0 0 8px rgba(167, 139, 250, 0.6)'
                  }} />
                  <ArrowRight size={18} color="#a78bfa" style={{ filter: 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.8))' }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
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
    </div>
  )
}
