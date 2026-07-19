import React from 'react'
import { ArrowLeft, RefreshCw, Settings, Power } from 'lucide-react'

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
              cursor: 'pointer',
              padding: '6px 8px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, WebkitAppRegion: 'no-drag' }}>
          {/* Logo — Space Grotesk da qoladi */}
          <span className="font-logo" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
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
            fontFamily: 'inherit',
            textAlign: 'center',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
        {/* Refresh tugmasi */}
        {onRefresh && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={onRefresh}
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
                width: 34, height: 34,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Power size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
