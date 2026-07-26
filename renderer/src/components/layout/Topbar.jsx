import React, { useState, useEffect, useRef } from 'react'
import { RefreshCw, Settings, Power, Film, Bell } from 'lucide-react'
import NotificationPanel from './NotificationPanel.jsx'

export default function Topbar({ search, onSearch, onSettings, onRefresh, refreshing, noteLabel, user, onLogout, onAddMovieSuccess }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const panelRef = useRef(null)

  const fetchNotifications = async () => {
    try {
      if (window.api && window.api.getNotifications) {
        const data = await window.api.getNotifications()
        if (Array.isArray(data)) {
          setNotifications(data)
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  const handleMarkRead = async (id) => {
    try {
      await window.api.markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('Error marking notification read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await window.api.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Error marking all notifications read:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await window.api.deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const handleRefreshClick = async () => {
    if (onRefresh) {
      await onRefresh()
      fetchNotifications()
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div
      className="topbar-sticky"
      style={{
        height: 52,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'relative',
        flexShrink: 0,
        WebkitAppRegion: 'drag',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
          <span className="font-logo" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
            notelab
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            / <Film size={14} color="var(--accent)" /> Movies
          </span>
        </span>
      </div>

      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 'min(680px, 45vw)', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <input
          type="search"
          name="notelab_search_field_query"
          className="topbar-search-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-form-type="other"
          value={search || ''}
          onChange={e => {
            const val = e.target.value
            if (user?.email && (val === user.email || val.trim() === user.email.trim())) {
              return
            }
            onSearch(val)
          }}
          placeholder="Qidirish..."
          style={{
            WebkitAppRegion: 'no-drag',
            borderRadius: 9999,
            padding: '6px 14px',
            fontSize: 13,
            width: '100%',
            fontFamily: 'inherit',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag', zIndex: 10 }}>
        {/* Refresh tugmasi */}
        {onRefresh && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleRefreshClick}
              disabled={refreshing}
              title="Filmlar ma'lumotlarini yangilash"
              style={{
                WebkitAppRegion: 'no-drag',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 7,
                color: refreshing ? 'var(--accent)' : 'var(--text-secondary)',
                width: 34, height: 34,
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (!refreshing) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>
        )}

        {/* Notification Bell button */}
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            title="Xabarnomalar"
            style={{
              WebkitAppRegion: 'no-drag',
              background: showNotifications ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
              border: showNotifications ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 7,
              color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
              width: 34, height: 34,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              if (!showNotifications) {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={e => {
              if (!showNotifications) {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)'
              }
            }}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 700,
                  height: 16,
                  minWidth: 16,
                  padding: '0 4px',
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--bg-surface)',
                  lineHeight: 1,
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationPanel
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onDelete={handleDelete}
              onAddMovieSuccess={() => {
                if (onAddMovieSuccess) onAddMovieSuccess()
                fetchNotifications()
              }}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>

        {/* Settings tugmasi */}
        <button
          onClick={onSettings}
          title="Sozlamalar"
          style={{
            WebkitAppRegion: 'no-drag',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 7,
            color: 'var(--text-secondary)',
            width: 34, height: 34,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Settings size={15} />
        </button>

        {/* User Email / Name display (Logout moved to Settings tab 4) */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
