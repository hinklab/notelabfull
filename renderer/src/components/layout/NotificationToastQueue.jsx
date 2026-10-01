import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Play,
  Film,
  Tv,
  Sparkles,
  DollarSign,
  ArrowRight,
  Check,
  Plus,
  ExternalLink,
  RefreshCw,
  Clock,
  Calendar,
  Star
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

function getPosterUrl(posterPath) {
  if (!posterPath || posterPath === '-' || posterPath === '—' || posterPath === '/placeholder.jpg') return null
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) return posterPath
  if (posterPath.startsWith('/')) return `https://image.tmdb.org/t/p/w500${posterPath}`
  return posterPath
}

export default function NotificationToastQueue({
  notifications = [],
  onMarkRead,
  onAddMovieSuccess
}) {
  const { t } = useLanguage()
  // activeToasts: array of { notif, id, exiting: boolean, isNew: boolean, isPushed: boolean, timeoutId, startTime, remainingMs, isPaused, isHovered }
  const [activeToasts, setActiveToasts] = useState([])
  const activeToastsRef = useRef([])

  // Track IDs that have already been queued/shown in this session so they aren't repeated
  const shownIdsRef = useRef(new Set())
  const pendingQueueRef = useRef([])
  const isProcessingRef = useRef(false)
  const isSiteActiveRef = useRef(true)
  const [actionStates, setActionStates] = useState({})

  const updateActiveToasts = (updater) => {
    setActiveToasts(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      activeToastsRef.current = next
      return next
    })
  }

  // 1. Precise check for whether the site is currently active/visible to the user
  const checkIsSiteActive = () => {
    if (typeof document === 'undefined') return true
    if (document.hidden || document.visibilityState !== 'visible') return false
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false
    return true
  }

  // Pause active on-screen toast countdown timers (e.g. when user switches tab or minimizes)
  const pauseActiveToasts = () => {
    const now = Date.now()
    activeToastsRef.current.forEach(item => {
      if (item.timeoutId) {
        clearTimeout(item.timeoutId)
        item.timeoutId = null
      }
      if (!item.isPaused && item.startTime) {
        const elapsed = now - item.startTime
        item.remainingMs = Math.max(3500, (item.remainingMs || 8000) - elapsed)
        item.isPaused = true
      }
    })
  }

  // Resume active on-screen toast countdown timers (when user returns to the tab)
  const resumeActiveToasts = () => {
    const now = Date.now()
    activeToastsRef.current.forEach(item => {
      if (item.isPaused && !item.isHovered && !item.exiting) {
        item.isPaused = false
        item.startTime = now
        const delay = Math.max(3500, item.remainingMs || 8000)
        item.timeoutId = setTimeout(() => {
          dismissToast(item.id, item.notif.id, false)
        }, delay)
      }
    })
  }

  // 2. Lifecycle: listen for tab visibility & window focus changes
  useEffect(() => {
    isSiteActiveRef.current = checkIsSiteActive()

    const onActive = () => {
      const active = checkIsSiteActive()
      isSiteActiveRef.current = active
      if (!active) return

      // Resume timers on already visible toasts
      resumeActiveToasts()

      // When the user enters / focuses the site ("saytga kirishda"):
      // If notifications were received while inactive, trigger the slide animation!
      if (pendingQueueRef.current.length > 0 && !isProcessingRef.current) {
        setTimeout(() => {
          if (checkIsSiteActive() && pendingQueueRef.current.length > 0 && !isProcessingRef.current) {
            startQueueProcessor()
          }
        }, 600)
      }
    }

    const onInactive = () => {
      isSiteActiveRef.current = false
      pauseActiveToasts()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onActive()
      } else {
        onInactive()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', onActive)
    window.addEventListener('blur', onInactive)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', onActive)
      window.removeEventListener('blur', onInactive)
    }
  }, [])

  // 3a. Listen for direct push toasts (e.g. manual refresh movie updates)
  useEffect(() => {
    const handlePushToast = (e) => {
      const notif = e.detail
      if (!notif) return
      const key = String(notif.id || `toast_${Date.now()}_${Math.random()}`)
      notif.id = key
      shownIdsRef.current.add(key)
      pendingQueueRef.current.push(notif)
      if (checkIsSiteActive() && !isProcessingRef.current) {
        startQueueProcessor()
      }
    }

    window.addEventListener('notelab_push_toast', handlePushToast)
    return () => window.removeEventListener('notelab_push_toast', handlePushToast)
  }, [])

  // 3b. Detect new unread notifications and queue them up
  useEffect(() => {
    if (!Array.isArray(notifications)) return

    const unread = notifications.filter(n => n && !n.is_read && n.type !== 'movie_updated')
    let newItemsEnqueued = false

    // Queue at most the 3 newest unread notifications so user is not overwhelmed on initial entry
    const toEnqueue = unread.slice(0, 3).reverse()
    for (const notif of toEnqueue) {
      const key = String(notif.id)
      if (!shownIdsRef.current.has(key)) {
        shownIdsRef.current.add(key)
        pendingQueueRef.current.push(notif)
        newItemsEnqueued = true
      }
    }

    if (newItemsEnqueued) {
      // If the site is currently active, start queue processor with a smooth delay;
      // if site is NOT active, keep them in pendingQueueRef until the user enters the site!
      if (checkIsSiteActive()) {
        setTimeout(() => {
          if (checkIsSiteActive() && pendingQueueRef.current.length > 0 && !isProcessingRef.current) {
            startQueueProcessor()
          }
        }, 500)
      }
    }
  }, [notifications])

  // 4. Queue processor with 2-second stagger
  const startQueueProcessor = () => {
    if (!checkIsSiteActive()) {
      isProcessingRef.current = false
      return
    }
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    const processNext = () => {
      // Pause if site became inactive while waiting between notifications
      if (!checkIsSiteActive()) {
        isProcessingRef.current = false
        return
      }

      if (pendingQueueRef.current.length === 0) {
        isProcessingRef.current = false
        return
      }

      const nextNotif = pendingQueueRef.current.shift()
      const toastId = `${nextNotif.id}_${Date.now()}`

      const now = Date.now()
      const initialRemainingMs = 8000
      let timeoutId = setTimeout(() => {
        dismissToast(toastId, nextNotif.id, false)
      }, initialRemainingMs)

      const newToastItem = {
        notif: nextNotif,
        id: toastId,
        exiting: false,
        isNew: true,
        isPushed: false,
        timeoutId,
        startTime: now,
        remainingMs: initialRemainingMs,
        isPaused: false,
        isHovered: false
      }

      updateActiveToasts(prev => {
        // Enforce max 3 visible toasts: any toast at index >= 2 will be slid out to the right
        const updated = prev.map((item, idx) => {
          if (idx >= 2 && !item.exiting) {
            if (item.timeoutId) clearTimeout(item.timeoutId)
            setTimeout(() => {
              removeToastById(item.id)
            }, 350)
            return { ...item, exiting: true, isPushed: false }
          }
          // Mark existing toasts as 'pushed down' so they slide down smoothly
          return { ...item, isPushed: true, isNew: false }
        })

        return [newToastItem, ...updated]
      })

      // Clear 'isPushed' flag after push animation completes
      setTimeout(() => {
        updateActiveToasts(current => current.map(item =>
          item.isPushed ? { ...item, isPushed: false } : item
        ))
      }, 450)

      // Clear 'isNew' flag after entrance animation completes so it becomes stationary
      setTimeout(() => {
        updateActiveToasts(current => current.map(item =>
          item.id === toastId ? { ...item, isNew: false } : item
        ))
      }, 500)

      // Schedule next notification in 2000ms (2-second delay)
      if (pendingQueueRef.current.length > 0) {
        setTimeout(() => {
          if (checkIsSiteActive()) {
            processNext()
          } else {
            isProcessingRef.current = false
          }
        }, 2000)
      } else {
        isProcessingRef.current = false
      }
    }

    processNext()
  }

  // Hover handlers: pause timer while mouse is over toast, resume when mouse leaves
  const handleToastMouseEnter = (toastId) => {
    const item = activeToastsRef.current.find(t => t.id === toastId)
    if (item) {
      item.isHovered = true
      if (item.timeoutId) {
        clearTimeout(item.timeoutId)
        item.timeoutId = null
      }
      if (item.startTime) {
        const elapsed = Date.now() - item.startTime
        item.remainingMs = Math.max(3000, (item.remainingMs || 8000) - elapsed)
      }
    }
  }

  const handleToastMouseLeave = (toastId) => {
    const item = activeToastsRef.current.find(t => t.id === toastId)
    if (item) {
      item.isHovered = false
      if (checkIsSiteActive() && !item.exiting && !item.isPaused) {
        item.startTime = Date.now()
        const delay = Math.max(3500, item.remainingMs || 4000)
        item.timeoutId = setTimeout(() => {
          dismissToast(item.id, item.notif.id, false)
        }, delay)
      }
    }
  }

  const dismissToast = (toastId, notifId, markRead = false) => {
    updateActiveToasts(prev =>
      prev.map(item => {
        if (item.id === toastId) {
          if (item.timeoutId) clearTimeout(item.timeoutId)
          return { ...item, exiting: true }
        }
        return item
      })
    )

    if (markRead && notifId && onMarkRead && !String(notifId).startsWith('refresh_')) {
      onMarkRead(notifId).catch(() => {})
    }

    setTimeout(() => {
      removeToastById(toastId)
    }, 350)
  }

  const removeToastById = (toastId) => {
    updateActiveToasts(prev => prev.filter(item => item.id !== toastId))
  }

  // Quick action: Move to 'todo'
  const handleMoveToTodo = async (notif, toastId) => {
    setActionStates(prev => ({ ...prev, [notif.id]: 'loading' }))
    try {
      const data = notif.movie_data || {}
      const movieId = data.movie_id || data.id

      if (movieId && window.api?.updateMovie) {
        await window.api.updateMovie(movieId, { section: 'todo' })
      } else if (data.tmdb_id && window.api?.addMovie) {
        await window.api.addMovie({
          title: data.title,
          tmdb_id: data.tmdb_id,
          imdb_id: data.imdb_id || null,
          media_type: data.media_type || 'movie',
          poster_path: data.poster_path || null,
          rating: data.rating || null,
          release_date: data.release_date || null,
          section: 'todo'
        })
      }

      setActionStates(prev => ({ ...prev, [notif.id]: 'moved' }))
      if (onMarkRead) await onMarkRead(notif.id)
      if (onAddMovieSuccess) onAddMovieSuccess()

      setTimeout(() => {
        dismissToast(toastId, notif.id)
      }, 1200)
    } catch (err) {
      setActionStates(prev => ({ ...prev, [notif.id]: 'idle' }))
    }
  }

  // Quick action: Add movie / season
  const handleAddMovie = async (notif, toastId) => {
    setActionStates(prev => ({ ...prev, [notif.id]: 'loading' }))
    try {
      const data = notif.movie_data || {}
      if (window.api?.addMovie) {
        await window.api.addMovie({
          title: data.title || notif.title.replace(/^Tavsiya:\s*/i, ''),
          tmdb_id: data.tmdb_id,
          imdb_id: data.imdb_id || null,
          media_type: data.media_type || 'movie',
          poster_path: data.poster_path || null,
          rating: data.rating || null,
          release_date: data.release_date || null,
          section: 'todo'
        })
      }

      setActionStates(prev => ({ ...prev, [notif.id]: 'added' }))
      if (onMarkRead) await onMarkRead(notif.id)
      if (onAddMovieSuccess) onAddMovieSuccess()

      setTimeout(() => {
        dismissToast(toastId, notif.id)
      }, 1200)
    } catch (err) {
      setActionStates(prev => ({ ...prev, [notif.id]: 'idle' }))
    }
  }

  if (activeToasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 64,
        right: 20,
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 350,
        maxWidth: 'calc(100vw - 32px)',
        pointerEvents: 'none'
      }}
    >
      <style>{`
        @keyframes toastSlideInRight {
          from {
            transform: translateX(115%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOutRight {
          from {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          to {
            transform: translateX(120%) translateY(0);
            opacity: 0;
          }
        }
        @keyframes toastPushedDown {
          from {
            transform: translateY(calc(-100% - 10px));
            opacity: 0.95;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .notelab-toast-card {
          pointer-events: auto;
          transform: translateY(0) translateX(0);
          opacity: 1;
        }
        .notelab-toast-card.is-new {
          animation: toastSlideInRight 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .notelab-toast-card.is-pushed {
          animation: toastPushedDown 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .notelab-toast-card.exiting {
          animation: toastSlideOutRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
          pointer-events: none;
        }
      `}</style>

      {activeToasts.map(({ notif, id: toastId, exiting, isNew, isPushed }) => {
        const evType = notif.movie_data?.event_type || notif.type
        const posterUrl = getPosterUrl(notif.movie_data?.poster_path)
        const isTv = notif.movie_data?.media_type === 'tv'
        const actionState = actionStates[notif.id] || 'idle'

        // Color badge according to type
        let badgeColor = '#6366f1'
        let badgeBg = 'rgba(99, 102, 241, 0.12)'
        let badgeIcon = <Film size={14} />

        if (evType === 'trailer_alert') {
          badgeColor = '#ef4444'
          badgeBg = 'rgba(239, 68, 68, 0.15)'
          badgeIcon = <Play size={14} />
        } else if (evType === 'box_office_alert') {
          badgeColor = '#eab308'
          badgeBg = 'rgba(234, 179, 8, 0.15)'
          badgeIcon = <DollarSign size={14} />
        } else if (evType === 'recommendation') {
          badgeColor = '#10b981'
          badgeBg = 'rgba(16, 185, 129, 0.15)'
          badgeIcon = <Sparkles size={14} />
        } else if (evType === 'movie_updated' || notif.type === 'movie_updated') {
          badgeColor = '#06b6d4'
          badgeBg = 'rgba(6, 182, 212, 0.15)'
          badgeIcon = <RefreshCw size={14} />
        } else if (evType === 'new_season_alert' || isTv) {
          badgeColor = '#8b5cf6'
          badgeBg = 'rgba(139, 92, 246, 0.15)'
          badgeIcon = <Tv size={14} />
        }

        // Determine animation class (never fall back to 'is-new' if neither is active)
        const animClass = exiting ? 'exiting' : isPushed ? 'is-pushed' : isNew ? 'is-new' : ''

        return (
          <div
            key={toastId}
            className={`notelab-toast-card ${animClass}`}
            onMouseEnter={() => handleToastMouseEnter(toastId)}
            onMouseLeave={() => handleToastMouseLeave(toastId)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 14px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Accent side bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3.5,
                height: '100%',
                background: badgeColor
              }}
            />

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Poster or Icon */}
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt=""
                  style={{
                    width: 40,
                    height: 56,
                    borderRadius: 6,
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: '1px solid var(--border)'
                  }}
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: badgeBg,
                    color: badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {badgeIcon}
                </div>
              )}

              {/* Text content */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                {(evType === 'movie_updated' || notif.type === 'movie_updated') && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#06b6d4',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 2
                    }}
                  >
                    <RefreshCw size={10} />
                    <span>Ma'lumot yangilandi</span>
                  </div>
                )}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                    marginBottom: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={notif.title}
                >
                  {notif.title}
                </div>

                {(evType === 'movie_updated' || notif.type === 'movie_updated') && Array.isArray(notif.movie_data?.changes) && notif.movie_data.changes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5, marginTop: 4 }}>
                    {notif.movie_data.changes.slice(0, 3).map((ch, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 5,
                          padding: '1.5px 7px',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {ch.field === 'rating' || ch.field === 'imdb_rating' ? <Star size={11} color="#fbbf24" fill="#fbbf24" style={{ flexShrink: 0 }} /> : null}
                        {ch.field === 'release_date' ? <Calendar size={11} color="#06b6d4" style={{ flexShrink: 0 }} /> : null}
                        {ch.field === 'runtime' ? <Clock size={11} color="#a78bfa" style={{ flexShrink: 0 }} /> : null}
                        {ch.field === 'seasons' ? <Tv size={11} color="#c084fc" style={{ flexShrink: 0 }} /> : null}
                        {ch.field === 'overview' ? <Film size={11} color="#34d399" style={{ flexShrink: 0 }} /> : null}
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ch.text || `${ch.label}: ${ch.newVal || ''}`}
                        </span>
                      </div>
                    ))}
                    {notif.movie_data.changes.length > 3 && (
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 4 }}>
                        +{notif.movie_data.changes.length - 3} ta boshqa o'zgarish
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {notif.message}
                  </div>
                )}

                {/* Quick actions row */}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {/* Premiere move to todo */}
                  {(evType === 'premiere_alert' || (notif.type === 'release_alert' && evType !== 'new_season_alert' && evType !== 'trailer_alert' && evType !== 'box_office_alert')) && (
                    <button
                      onClick={() => handleMoveToTodo(notif, toastId)}
                      disabled={actionState !== 'idle'}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: actionState === 'moved' ? 'rgba(34, 197, 94, 0.15)' : '#22c55e',
                        color: actionState === 'moved' ? '#4ade80' : '#ffffff',
                        border: actionState === 'moved' ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {actionState === 'moved' ? <Check size={11} /> : <ArrowRight size={11} />}
                      <span>{actionState === 'moved' ? "O'tkazildi" : actionState === 'loading' ? '...' : "To Do'ga o'tkazish"}</span>
                    </button>
                  )}

                  {/* Add season or recommendation */}
                  {(evType === 'new_season_alert' || evType === 'recommendation') && (
                    <button
                      onClick={() => handleAddMovie(notif, toastId)}
                      disabled={actionState !== 'idle'}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: actionState === 'added' ? 'rgba(168, 85, 247, 0.15)' : 'var(--accent, #8b5cf6)',
                        color: actionState === 'added' ? '#c084fc' : '#ffffff',
                        border: actionState === 'added' ? '1px solid rgba(168, 85, 247, 0.3)' : 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {actionState === 'added' ? <Check size={11} /> : <Plus size={11} />}
                      <span>{actionState === 'added' ? "Qo'shildi" : actionState === 'loading' ? '...' : "Qo'shish"}</span>
                    </button>
                  )}

                  {/* Watch Trailer */}
                  {evType === 'trailer_alert' && notif.movie_data?.video_key && (
                    <a
                      href={`https://www.youtube.com/watch?v=${notif.movie_data.video_key}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onMarkRead?.(notif.id)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        textDecoration: 'none'
                      }}
                    >
                      <Play size={11} />
                      <span>Treyler</span>
                      <ExternalLink size={10} />
                    </a>
                  )}

                  {/* Box Office revenue badge */}
                  {evType === 'box_office_alert' && (notif.movie_data?.revenue_formatted || notif.movie_data?.revenue) && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 5,
                        background: 'rgba(234, 179, 8, 0.15)',
                        color: '#eab308',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                    >
                      <DollarSign size={11} />
                      <span>{notif.movie_data?.revenue_formatted || `$${Number(notif.movie_data?.revenue).toLocaleString()}`}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Dismiss [X] button */}
              <button
                onClick={() => dismissToast(toastId, notif.id, true)}
                title="Yopish"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
