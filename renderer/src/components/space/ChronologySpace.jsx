import React, { useState, useRef, useEffect } from 'react'
import { Plus, Minus, RotateCcw, Sparkles, CheckCircle, Clock, Film, Star, ArrowRight } from 'lucide-react'

// Sample MCU Mock Movies for Step 2 UI Review
const MOCK_MCU_MOVIES = [
  {
    tmdb_id: 1771,
    title: 'Captain America: The First Avenger',
    release_year: '2011',
    story_year: '1942–1945',
    rating: 7.0,
    poster_path: 'https://image.tmdb.org/t/p/w500/vSNxBGDYm8ssw01mKmxeHYTeEyw.jpg',
    chronology_index: 1,
    in_board: true,
    user_movie: { section: 'done', user_rating: 9 }
  },
  {
    tmdb_id: 299537,
    title: 'Captain Marvel',
    release_year: '2019',
    story_year: '1995',
    rating: 6.9,
    poster_path: 'https://image.tmdb.org/t/p/w500/AtsgWhDnHTq68L0fYioedhRGDAK.jpg',
    chronology_index: 2,
    in_board: true,
    user_movie: { section: 'done', user_rating: 8 }
  },
  {
    tmdb_id: 1726,
    title: 'Iron Man',
    release_year: '2008',
    story_year: '2010',
    rating: 7.6,
    poster_path: 'https://image.tmdb.org/t/p/w500/78P5y8wvuHYr9tz2wScSDhftY3g.jpg',
    chronology_index: 3,
    in_board: true,
    user_movie: { section: 'done', user_rating: 10 }
  },
  {
    tmdb_id: 10138,
    title: 'Iron Man 2',
    release_year: '2010',
    story_year: '2011',
    rating: 6.8,
    poster_path: 'https://image.tmdb.org/t/p/w500/6hT13ooIyBu2B4BXvOY0xwoYrYr.jpg',
    chronology_index: 4,
    in_board: true,
    user_movie: { section: 'done', user_rating: 7.5 }
  },
  {
    tmdb_id: 1724,
    title: 'The Incredible Hulk',
    release_year: '2008',
    story_year: '2011',
    rating: 6.2,
    poster_path: 'https://image.tmdb.org/t/p/w500/gK15853p0UdOhrmzM2fUm9nxB7s.jpg',
    chronology_index: 5,
    in_board: false,
    user_movie: null
  },
  {
    tmdb_id: 10195,
    title: 'Thor',
    release_year: '2011',
    story_year: '2011',
    rating: 6.8,
    poster_path: 'https://image.tmdb.org/t/p/w500/prSlVMeFi9KM35yR8kVj8NjBvOI.jpg',
    chronology_index: 6,
    in_board: true,
    user_movie: { section: 'done', user_rating: 8 }
  },
  {
    tmdb_id: 24428,
    title: 'The Avengers',
    release_year: '2012',
    story_year: '2012',
    rating: 7.7,
    poster_path: 'https://image.tmdb.org/t/p/w500/RYMX2wcKSpAr243xaWjAfAzYdC.jpg',
    chronology_index: 7,
    in_board: true,
    user_movie: { section: 'done', user_rating: 9.5 }
  },
  {
    tmdb_id: 68721,
    title: 'Iron Man 3',
    release_year: '2013',
    story_year: '2012',
    rating: 6.9,
    poster_path: 'https://image.tmdb.org/t/p/w500/qhPtAc1TKbMPqNvcdYWrd9WDN9.jpg',
    chronology_index: 8,
    in_board: true,
    user_movie: { section: 'done', user_rating: 8 }
  }
]

export default function ChronologySpace({ moviesData, universeName = 'Marvel Cinematic Universe' }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 80, y: 120 })
  const [isPanning, setIsPanning] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [selectedMovie, setSelectedMovie] = useState(null)

  const canvasRef = useRef(null)

  const movies = (moviesData && moviesData.length > 0) ? moviesData : MOCK_MCU_MOVIES

  // Mouse drag panning handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.space-card-clickable') || e.target.closest('.space-controls')) {
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

  // Native non-passive wheel listener to allow e.preventDefault() for smooth zooming without page scroll interference
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const handleWheel = (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
      setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 2.2))
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 2.2))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.4))
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 80, y: 120 })
  }

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
      {/* Header Banner inside Space */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 24,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(15, 17, 26, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 30,
        padding: '10px 20px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      }}>
        <Sparkles size={18} color="#a78bfa" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f4f4f5' }}>{universeName}</div>
          <div style={{ fontSize: 11, color: '#a1a1aa' }}>In-Story Chronological Order · {movies.length} Movies</div>
        </div>
      </div>

      {/* Pannable & Zoomable World Container */}
      <div style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
        position: 'absolute',
        top: 0,
        left: 0,
        transition: isPanning ? 'none' : 'transform 0.08s ease-out',
      }}>
        {/* Horizontal Sequence Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 70, paddingTop: 100, paddingLeft: 40 }}>
          {movies.map((movie, idx) => (
            <React.Fragment key={movie.tmdb_id || idx}>
              {/* Chronology Movie Card */}
              <div
                className="space-card-clickable"
                onClick={() => setSelectedMovie(movie)}
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
                    src={movie.poster_path}
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
                    <span>{movie.release_year}</span>
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
