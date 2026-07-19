import React from 'react'

export default function Topbar({ search, onSearch, onSettings, onRefresh, refreshing, onBack, noteLabel, user, onLogout }) {
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
        {onBack && (
          <button
            onClick={onBack}
            style={{
              WebkitAppRegion: 'no-drag',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 16,
              cursor: 'pointer',
              padding: '6px 10px',
            }}
          >
            ←
          </button>
        )}
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, WebkitAppRegion: 'no-drag' }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
            notelab
          </span>
          {noteLabel ? (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, lineHeight: '18px' }}>/ {noteLabel}</span>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.5, color: 'var(--text-primary)', fontWeight: 500, lineHeight: '18px' }}>(hinklab production)</span>
          )}
        </span>
      </div>

      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 680, display: 'flex', justifyContent: 'center' }}>
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Qidirish..."
          style={{
            WebkitAppRegion: 'no-drag',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 9999,
            padding: '6px 14px',
            color: 'var(--text-primary)',
            fontSize: 13,
            width: '100%',
            outline: 'none',
            fontFamily: 'Space Grotesk',
            textAlign: 'center',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
        {/* Barcha filmlarni yangilash tugmasi */}
        {onRefresh && <div style={{ position: 'relative' }}>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title=""
            style={{
              WebkitAppRegion: 'no-drag',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 7,
              color: refreshing ? 'var(--accent)' : 'var(--text-secondary)',
              width: 34,
              height: 34,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, border-color 0.15s',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              if (!refreshing) {
                e.currentTarget.style.borderColor = 'var(--border-hover)'
                e.currentTarget.nextSibling.style.opacity = '1'
                e.currentTarget.nextSibling.style.pointerEvents = 'none'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.opacity = '0'
            }}
          >
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              lineHeight: 1,
            }}>↻</span>
          </button>
          {/* Tooltip */}
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: '#1e1e1e', border: '1px solid var(--border)',
            borderRadius: 6, padding: '4px 10px',
            fontSize: 11, color: 'var(--text-secondary)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            opacity: 0, transition: 'opacity 0.15s',
            zIndex: 100,
          }}>
            Filmlar ma'lumotlarini yangilash
          </div>
        </div>}

        {/* Sozlamalar tugmasi */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={onSettings}
            title=""
            style={{
              WebkitAppRegion: 'no-drag',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 7,
              color: 'var(--text-secondary)',
              width: 34,
              height: 34,
              cursor: 'pointer',
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-hover)'
              e.currentTarget.nextSibling.style.opacity = '1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.nextSibling.style.opacity = '0'
            }}
          >
            ⚙
          </button>
          {/* Tooltip */}
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: '#1e1e1e', border: '1px solid var(--border)',
            borderRadius: 6, padding: '4px 10px',
            fontSize: 11, color: 'var(--text-secondary)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            opacity: 0, transition: 'opacity 0.15s',
            zIndex: 100,
          }}>
            Sozlamalar
          </div>
        </div>

        {/* User + Logout */}
        {user && onLogout && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </span>
            <button
              onClick={onLogout}
              title="Chiqish"
              style={{
                WebkitAppRegion: 'no-drag',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 7,
                color: 'var(--text-muted)',
                width: 34,
                height: 34,
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#ef4444'
                e.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              ⏻
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
