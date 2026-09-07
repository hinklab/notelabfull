import React, { useState, useRef, useMemo } from 'react'
import {
  Bell,
  Film,
  Sparkles,
  Check,
  CheckCheck,
  Trash2,
  Plus,
  X,
  Play,
  Tv,
  DollarSign,
  ExternalLink,
  ArrowRight,
  Clock
} from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

function getPosterUrl(posterPath) {
  if (!posterPath || posterPath === '-' || posterPath === '—' || posterPath === '/placeholder.jpg') return null
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) return posterPath
  if (posterPath.startsWith('/')) return `https://image.tmdb.org/t/p/w500${posterPath}`
  return posterPath
}

function formatRelativeTime(isoString, language = 'uz') {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const justNow = language === 'en' ? 'Just now' : language === 'ru' ? 'Только что' : 'Hozirgina'
    if (isNaN(diffMs) || diffMs < 0) return justNow

    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return justNow
    if (diffMinutes < 60) {
      return language === 'en' ? `${diffMinutes}m ago` : language === 'ru' ? `${diffMinutes} мин. назад` : `${diffMinutes} daqiqa oldin`
    }
    if (diffHours < 24) {
      return language === 'en' ? `${diffHours}h ago` : language === 'ru' ? `${diffHours} ч. назад` : `${diffHours} soat oldin`
    }
    if (diffDays === 1) {
      return language === 'en' ? 'Yesterday' : language === 'ru' ? 'Вчера' : 'Kecha'
    }
    if (diffDays < 7) {
      return language === 'en' ? `${diffDays}d ago` : language === 'ru' ? `${diffDays} дн. назад` : `${diffDays} kun oldin`
    }
    const locale = language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'uz-UZ'
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function NotificationPanel({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onAddMovieSuccess,
  onClose
}) {
  const { t, language } = useLanguage()
  const [actionStates, setActionStates] = useState({})
  const actionLockRef = useRef(new Set())

  const uniqueNotifications = useMemo(() => {
    const seen = new Set()
    return notifications.filter(n => {
      if (!n) return false
      const key =
        n.dedup_key ||
        n.movie_data?.dedup_key ||
        `${n.type}_${n.movie_data?.tmdb_id || (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [notifications])

  // TUR 1 Action: Move futured movie to 'todo'
  const handleMoveToTodo = async notif => {
    if (actionLockRef.current.has(notif.id)) return
    actionLockRef.current.add(notif.id)
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
          poster_path: data.poster_path,
          rating: data.rating || null,
          vote_count: data.vote_count || 0,
          release_date: data.release_date || null,
          genre: data.genre || null,
          media_type: data.media_type || 'movie',
          section: 'todo',
          note: ''
        })
      }

      setActionStates(prev => ({ ...prev, [notif.id]: 'moved' }))
      if (onMarkRead) await onMarkRead(notif.id)
      onAddMovieSuccess?.()
    } catch (err) {
      console.error('Error moving movie to todo:', err)
      actionLockRef.current.delete(notif.id)
      setActionStates(prev => ({ ...prev, [notif.id]: null }))
    }
  }

  // TUR 2 / Rec Action: Add new season / recommendation to board
  const handleAddMovieOrSeason = async notif => {
    if (!notif.movie_data || actionLockRef.current.has(notif.id)) return
    actionLockRef.current.add(notif.id)
    setActionStates(prev => ({ ...prev, [notif.id]: 'loading' }))

    try {
      const data = notif.movie_data
      const today = new Date().toISOString().slice(0, 10)
      const isFutured = data.release_date && data.release_date > today
      const targetSection = isFutured ? 'futured' : 'todo'
      const titleToSave = data.season_title || data.title

      await window.api.addMovie({
        title: titleToSave,
        tmdb_id: data.tmdb_id,
        imdb_id: data.imdb_id || null,
        poster_path: data.poster_path,
        rating: data.rating || null,
        vote_count: data.vote_count || 0,
        release_date: data.release_date || null,
        genre: data.genre || null,
        media_type: data.media_type || 'movie',
        section: targetSection,
        current_season: data.season_number || null,
        season_number: data.season_number || null,
        note: ''
      })

      setActionStates(prev => ({ ...prev, [notif.id]: 'added' }))
      if (onMarkRead) await onMarkRead(notif.id)
      if (notif.type === 'recommendation' && onDelete) await onDelete(notif.id)
      onAddMovieSuccess?.()
    } catch (err) {
      console.error('Error adding movie/season from notification:', err)
      actionLockRef.current.delete(notif.id)
      setActionStates(prev => ({ ...prev, [notif.id]: null }))
    }
  }

  const getEventType = notif => {
    return notif.movie_data?.event_type || notif.type
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 0,
        width: 'min(380px, calc(100vw - 20px))',
        maxHeight: 'min(520px, calc(100vh - 70px))',
        background: 'var(--bg-surface, #18181b)',
        border: '1px solid var(--border, #27272a)',
        borderRadius: 12,
        boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border, #27272a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card, #202023)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={16} color="var(--accent, #8b5cf6)" />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            {t('notifications.title', null, 'Bildirishnomalar')}
          </span>
          {uniqueNotifications.filter(n => !n.is_read).length > 0 && (
            <span
              style={{
                background: 'var(--accent, #8b5cf6)',
                color: '#fff',
                borderRadius: 10,
                padding: '1px 6px',
                fontSize: 11,
                fontWeight: 600
              }}
            >
              {uniqueNotifications.filter(n => !n.is_read).length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {uniqueNotifications.some(n => !n.is_read) && (
            <button
              onClick={onMarkAllRead}
              title={t('notifications.markAllRead', null, "Hammasini o'qilgan deb belgilash")}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
                borderRadius: 4
              }}
            >
              <CheckCheck size={14} />
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {uniqueNotifications.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13
            }}
          >
            {t('notifications.noNotifications', null, "Bildirishnomalar yo'q")}
          </div>
        ) : (
          uniqueNotifications.map(notif => {
            const evType = getEventType(notif)
            const status = actionStates[notif.id]
            const isMoved = status === 'moved'
            const isAdded = status === 'added'
            const isLoading = status === 'loading'
            const isDisabled = isLoading || isMoved || isAdded
            const timeAgo = formatRelativeTime(notif.created_at, language)

            return (
              <div
                key={notif.id}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: notif.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.06)',
                  border: `1px solid ${notif.is_read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(139, 92, 246, 0.2)'}`,
                  marginBottom: 8,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  transition: 'background 0.15s'
                }}
              >
                {/* Mini Poster or Icon */}
                {getPosterUrl(notif.movie_data?.poster_path) ? (
                  <img
                    src={getPosterUrl(notif.movie_data.poster_path)}
                    alt={notif.title}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                    style={{
                      width: 44,
                      height: 64,
                      objectFit: 'cover',
                      borderRadius: 6,
                      flexShrink: 0,
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background:
                        evType === 'premiere_alert' || evType === 'release_alert'
                          ? 'rgba(34, 197, 94, 0.15)'
                          : evType === 'new_season_alert'
                          ? 'rgba(139, 92, 246, 0.15)'
                          : evType === 'trailer_alert'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : evType === 'box_office_alert'
                          ? 'rgba(234, 179, 8, 0.15)'
                          : evType === 'episode_alert'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(168, 85, 247, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {evType === 'premiere_alert' || evType === 'release_alert' ? (
                      <Film size={18} color="#22c55e" />
                    ) : evType === 'new_season_alert' ? (
                      <Tv size={18} color="#a855f7" />
                    ) : evType === 'trailer_alert' ? (
                      <Play size={18} color="#ef4444" />
                    ) : evType === 'box_office_alert' ? (
                      <DollarSign size={18} color="#eab308" />
                    ) : evType === 'episode_alert' ? (
                      <Tv size={18} color="#3b82f6" />
                    ) : (
                      <Sparkles size={18} color="#a855f7" />
                    )}
                  </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {notif.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      {!notif.is_read && (
                        <button
                          onClick={() => onMarkRead(notif.id)}
                          title={t('notifications.markRead', null, "O'qilgan deb belgilash")}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 2
                          }}
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(notif.id)}
                        title={t('common.delete', null, "O'chirish")}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 2
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {notif.message && (
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                  )}

                  {/* Relative Timestamp */}
                  {timeAgo && (
                    <div
                      style={{
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        opacity: 0.8
                      }}
                    >
                      <Clock size={11} />
                      <span>{timeAgo}</span>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {/* TUR 1: Premiere Alert Action Button ("To Do'ga o'tkazish") */}
                    {(evType === 'premiere_alert' || (notif.type === 'release_alert' && evType !== 'new_season_alert')) && (
                      <button
                        onClick={() => handleMoveToTodo(notif)}
                        disabled={isDisabled}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: isMoved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.85)',
                          color: isMoved ? '#4ade80' : '#ffffff',
                          border: isMoved ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: isDisabled ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.2s'
                        }}
                      >
                        {isMoved ? <Check size={12} /> : <ArrowRight size={12} />}
                        <span>{isMoved ? "To Do'ga o'tkazildi" : isLoading ? '...' : "To Do'ga o'tkazish"}</span>
                      </button>
                    )}

                    {/* TUR 2: New Season Alert Action Button ("To Do'ga qo'shish") */}
                    {evType === 'new_season_alert' && (
                      <button
                        onClick={() => handleAddMovieOrSeason(notif)}
                        disabled={isDisabled}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: isAdded ? 'rgba(168, 85, 247, 0.15)' : 'var(--accent, #8b5cf6)',
                          color: isAdded ? '#c084fc' : '#ffffff',
                          border: isAdded ? '1px solid rgba(168, 85, 247, 0.3)' : 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: isDisabled ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.2s'
                        }}
                      >
                        {isAdded ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isAdded ? "To Do'ga qo'shildi" : isLoading ? '...' : "To Do'ga qo'shish"}</span>
                      </button>
                    )}

                    {/* Recommendation Action Button */}
                    {evType === 'recommendation' && (
                      <button
                        onClick={() => handleAddMovieOrSeason(notif)}
                        disabled={isDisabled}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: isAdded ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent, #8b5cf6)',
                          color: isAdded ? '#34d399' : '#fff',
                          border: isAdded ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: isDisabled ? 'default' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.2s'
                        }}
                      >
                        {isAdded ? <Check size={12} /> : <Plus size={12} />}
                        <span>{isAdded ? "Qo'shildi" : isLoading ? '...' : t('common.add', null, "Qo'shish")}</span>
                      </button>
                    )}

                    {/* Trailer Alert Action Link */}
                    {evType === 'trailer_alert' && notif.movie_data?.video_key && (
                      <a
                        href={`https://www.youtube.com/watch?v=${notif.movie_data.video_key}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '4px 10px',
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
                          textDecoration: 'none',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                      >
                        <Play size={12} />
                        <span>{t('notifications.watchTrailer', null, 'Treylerni ko\'rish')}</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
