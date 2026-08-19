import React, { useState, useRef } from 'react'
import { Bell, Film, Sparkles, Check, CheckCheck, Trash2, Plus, X, Play, Tv, DollarSign, ExternalLink } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function NotificationPanel({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onAddMovieSuccess,
  onClose
}) {
  const { t } = useLanguage()
  const [addingIds, setAddingIds] = useState({})
  const addingRef = useRef(new Set())

  const handleAddMovie = async (notif) => {
    if (!notif.movie_data || addingRef.current.has(notif.id)) return
    addingRef.current.add(notif.id)
    setAddingIds(prev => ({ ...prev, [notif.id]: 'loading' }))

    try {
      const data = notif.movie_data
      const today = new Date().toISOString().slice(0, 10)
      const isFutured = data.release_date && data.release_date > today
      const targetSection = isFutured ? 'futured' : 'todo'

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
        section: targetSection,
        note: ''
      })

      setAddingIds(prev => ({ ...prev, [notif.id]: 'added' }))
      if (onMarkRead) await onMarkRead(notif.id)
      if (onDelete) await onDelete(notif.id)
      onAddMovieSuccess?.()
    } catch (err) {
      console.error('Error adding movie from notification:', err)
      addingRef.current.delete(notif.id)
      setAddingIds(prev => ({ ...prev, [notif.id]: null }))
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 0,
        width: 360,
        maxHeight: 480,
        background: 'var(--bg-surface, #18181b)',
        border: '1px solid var(--border, #27272a)',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
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
            {t('notifications.title')}
          </span>
          {notifications.filter(n => !n.is_read).length > 0 && (
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
              {notifications.filter(n => !n.is_read).length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={onMarkAllRead}
              title={t('notifications.markAllRead')}
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
        {notifications.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13
            }}
          >
            {t('notifications.noNotifications')}
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              style={{
                padding: 10,
                borderRadius: 8,
                background: notif.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.06)',
                border: `1px solid ${notif.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.15)'}`,
                marginBottom: 6,
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                transition: 'background 0.15s'
              }}
            >
              {/* Image or Icon */}
              {notif.movie_data?.poster_path ? (
                <img
                  src={notif.movie_data.poster_path}
                  alt={notif.title}
                  style={{
                    width: 42,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 6,
                    flexShrink: 0
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background:
                      notif.type === 'release_alert'
                        ? 'rgba(34, 197, 94, 0.12)'
                        : notif.type === 'trailer_alert'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : notif.type === 'box_office_alert'
                        ? 'rgba(234, 179, 8, 0.12)'
                        : notif.type === 'episode_alert'
                        ? 'rgba(59, 130, 246, 0.12)'
                        : 'rgba(168, 85, 247, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {notif.type === 'release_alert' ? (
                    <Film size={18} color="#22c55e" />
                  ) : notif.type === 'trailer_alert' ? (
                    <Play size={18} color="#ef4444" />
                  ) : notif.type === 'box_office_alert' ? (
                    <DollarSign size={18} color="#eab308" />
                  ) : notif.type === 'episode_alert' ? (
                    <Tv size={18} color="#3b82f6" />
                  ) : (
                    <Sparkles size={18} color="#a855f7" />
                  )}
                </div>
              )}

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    {notif.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    {!notif.is_read && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        title={t('notifications.markAllRead')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(notif.id)}
                      title={t('common.delete')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 2,
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

                {/* Recommendation Add Button */}
                {notif.type === 'recommendation' && notif.movie_data && (() => {
                  const status = addingIds[notif.id]
                  const isLoading = status === 'loading'
                  const isAdded = status === 'added'
                  const isDisabled = isLoading || isAdded

                  return (
                    <button
                      onClick={() => handleAddMovie(notif)}
                      disabled={isDisabled}
                      style={{
                        marginTop: 8,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: isAdded ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent)',
                        color: isAdded ? '#34d399' : '#fff',
                        border: isAdded ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        opacity: isDisabled ? 0.7 : 1,
                        transition: 'background 0.2s, opacity 0.2s',
                      }}
                    >
                      {isAdded ? <Check size={12} /> : <Plus size={12} />}
                      <span>{isAdded ? t('common.added', null, 'Qo\'shildi') : isLoading ? '...' : t('common.add')}</span>
                    </button>
                  )
                })()}

                {/* Trailer Alert Link Button */}
                {notif.type === 'trailer_alert' && notif.movie_data?.video_key && (
                  <a
                    href={`https://www.youtube.com/watch?v=${notif.movie_data.video_key}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      marginTop: 8,
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
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                  >
                    <Play size={12} />
                    <span>{t('notifications.watchTrailer', null, 'Treylerni tomosha qilish')}</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
