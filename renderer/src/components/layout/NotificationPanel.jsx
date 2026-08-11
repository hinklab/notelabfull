import React, { useState, useRef } from 'react'
import { Bell, Film, Sparkles, Check, CheckCheck, Trash2, Plus, X } from 'lucide-react'

export default function NotificationPanel({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onAddMovieSuccess,
  onClose
}) {
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
        rating: data.rating,
        release_date: data.release_date,
        genre: data.genre,
        section: targetSection
      })

      setAddingIds(prev => ({ ...prev, [notif.id]: 'added' }))
      if (onMarkRead) await onMarkRead(notif.id)
      if (onDelete) await onDelete(notif.id)
      if (onAddMovieSuccess) onAddMovieSuccess()
    } catch (err) {
      console.error('Error adding movie from recommendation:', err)
      addingRef.current.delete(notif.id)
      setAddingIds(prev => ({ ...prev, [notif.id]: null }))
      alert('Filmni qo\'shishda xatolik: ' + (err.message || 'Xatolik yuz berdi'))
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 370,
        maxHeight: 480,
        background: 'var(--bg-surface, #18181b)',
        border: '1px solid var(--border, #27272a)',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'var(--text-primary, #f4f4f5)',
        fontSize: 13,
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
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <Bell size={16} color="var(--accent, #8b5cf6)" />
          <span>Xabarnomalar</span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 11,
                background: 'var(--accent, #8b5cf6)',
                color: '#fff',
                padding: '1px 6px',
                borderRadius: 9999,
                fontWeight: 700,
              }}
            >
              {unreadCount} yangi
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Barchasini o'qilgan deb belgilash"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #71717a)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <CheckCheck size={14} />
              <span>O'qildi</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #71717a)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ overflowY: 'auto', flex: 1, padding: 8 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted, #71717a)' }}>
            <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div>Hozircha xabarnomalar yo'q</div>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              style={{
                padding: 10,
                borderRadius: 8,
                marginBottom: 6,
                background: notif.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.06)',
                border: notif.is_read ? '1px solid transparent' : '1px solid rgba(139, 92, 246, 0.2)',
                display: 'flex',
                gap: 10,
                transition: 'background 0.15s',
              }}
            >
              {/* Poster Thumbnail or Icon */}
              {notif.movie_data?.poster_path ? (
                <img
                  src={notif.movie_data.poster_path}
                  alt=""
                  style={{
                    width: 42,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 6,
                    flexShrink: 0,
                    border: '1px solid var(--border, #27272a)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: notif.type === 'release_alert' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {notif.type === 'release_alert' ? (
                    <Film size={18} color="#22c55e" />
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
                        title="O'qilgan deb belgilash"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(notif.id)}
                      title="O'chirish"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
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
                        background: isAdded ? '#22c55e' : 'var(--accent, #8b5cf6)',
                        color: '#fff',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        opacity: isDisabled ? 0.7 : 1,
                        transition: 'background 0.2s, opacity 0.2s',
                      }}
                    >
                      {isAdded ? <Check size={13} /> : <Plus size={13} />}
                      <span>{isLoading ? 'Qo\'shilmoqda...' : (isAdded ? 'Qo\'shildi' : 'Qo\'shish')}</span>
                    </button>
                  )
                })()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
