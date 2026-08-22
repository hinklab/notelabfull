import React, { useState, useEffect, useRef } from 'react'
import { RefreshCw, Settings, Power, Film, Bell, HelpCircle, Sparkles } from 'lucide-react'
import NotificationPanel from './NotificationPanel.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'

export default function Topbar({ search, onSearch, onSettings, onOpenSurvey, onRefresh, refreshing, noteLabel, user, onLogout, onAddMovieSuccess, activeView = 'movies', onViewChange }) {
  const [currentTheme, setCurrentTheme] = React.useState(() => {
    return document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
  });

  React.useEffect(() => {
    const updateTheme = () => {
      const t = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark';
      setCurrentTheme(t);
    };
    window.addEventListener('storage', updateTheme);
    window.addEventListener('notelab_theme_changed', updateTheme);

    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('storage', updateTheme);
      window.removeEventListener('notelab_theme_changed', updateTheme);
      observer.disconnect();
    };
  }, []);
  const { t } = useLanguage()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const panelRef = useRef(null)

  const fetchNotifications = async () => {
    try {
      if (window.api && window.api.getNotifications) {
        const data = await window.api.getNotifications()
        if (Array.isArray(data)) {
          const seen = new Set()
          const unique = data.filter(n => {
            if (!n) return false
            const key = `${n.type}_${n.movie_data?.tmdb_id || (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim()}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          setNotifications(unique)
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

  const SAMPLE_TITLES = [
    'Inception',
    'Interstellar',
    'The Dark Knight',
    'Breaking Bad',
    'The Mentalist',
    'Oppenheimer',
    'Game of Thrones',
    'Stranger Things',
    'Avengers: Endgame',
    'Sherlock'
  ]

  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(t('common.search'))

  useEffect(() => {
    const searchPrefix = t('common.search').replace('...', '')
    if (isSearchFocused || search) {
      setAnimatedPlaceholder(t('common.search'))
      return
    }

    let titleIdx = 0
    let charIdx = 0
    let isDeleting = false
    let timer = null

    const tick = () => {
      const currentTitle = SAMPLE_TITLES[titleIdx % SAMPLE_TITLES.length]

      if (!isDeleting) {
        charIdx++
        setAnimatedPlaceholder(`${searchPrefix}: "${currentTitle.slice(0, charIdx)}"`)

        if (charIdx >= currentTitle.length) {
          isDeleting = true
          timer = setTimeout(tick, 1800)
        } else {
          timer = setTimeout(tick, 70)
        }
      } else {
        charIdx--
        setAnimatedPlaceholder(charIdx > 0 ? `${searchPrefix}: "${currentTitle.slice(0, charIdx)}"` : t('common.search'))

        if (charIdx <= 0) {
          isDeleting = false
          titleIdx++
          timer = setTimeout(tick, 400)
        } else {
          timer = setTimeout(tick, 45)
        }
      }
    }

    timer = setTimeout(tick, 400)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isSearchFocused, search, t])

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
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexShrink: 0,
        WebkitAppRegion: 'drag',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'no-drag' }}>
          <img src={currentTheme === "light" ? "/saqlab-logo-b.png" : "/saqlab-logo-w.png"} alt="saqlab" style={{ height: 20, width: "auto", objectFit: "contain", display: "block" }} />

          {/* Navigation View Toggle: Movies vs Space */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--bg-input, rgba(255,255,255,0.06))',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '2px',
            gap: 2,
          }}>
            <button
              type="button"
              onClick={() => onViewChange && onViewChange('movies')}
              style={{
                border: 'none',
                background: activeView === 'movies' ? 'var(--accent, #7c3aed)' : 'transparent',
                color: activeView === 'movies' ? '#ffffff' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Film size={13} />
              <span>{t('nav.movies')}</span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange && onViewChange('space')}
              style={{
                border: 'none',
                background: activeView === 'space' ? 'var(--accent, #7c3aed)' : 'transparent',
                color: activeView === 'space' ? '#ffffff' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={13} />
              <span>{t('nav.space')}</span>
            </button>
          </div>
        </span>
      </div>

      <div style={{ flex: '1 1 auto', minWidth: 160, maxWidth: 480, margin: '0 12px', display: 'flex', justifyContent: 'center' }}>
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
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          onChange={e => {
            const val = e.target.value
            if (user?.email && (val === user.email || val.trim() === user.email.trim())) {
              return
            }
            onSearch(val)
          }}
          placeholder={isSearchFocused || search ? "Qidirish..." : (animatedPlaceholder || "Qidirish...")}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, WebkitAppRegion: 'no-drag', zIndex: 10 }}>
        {/* Refresh tugmasi */}
        {onRefresh && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleRefreshClick}
              disabled={refreshing}
              title={t('common.retry')}
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
            title={t('notifications.title')}
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
          title={t('settings.title')}
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
          <div className="topbar-user-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
