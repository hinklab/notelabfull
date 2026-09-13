import React from 'react'
import {
  Shield,
  Zap,
  Crown,
  ShieldCheck,
  Star,
  Globe,
  Swords,
  Sun,
  Scale,
  Compass,
  Orbit,
  Footprints,
  Target,
  ShieldAlert,
  Award,
  Flame,
  Lock
} from 'lucide-react'

// Metallic color themes for the 3 tiers
const TIER_THEMES = {
  gold: {
    label: 'Gold',
    gradient: 'linear-gradient(135deg, #fffbeb 0%, #fef08a 25%, #eab308 60%, #ca8a04 100%)',
    bg: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 50%, #854d0e 100%)',
    rim: 'linear-gradient(135deg, #fffbeb, #ca8a04)',
    border: '#ca8a04',
    iconColor: '#ffffff',
    glow: '0 0 16px rgba(234, 179, 8, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.7)',
    textBadge: '#ca8a04'
  },
  silver: {
    label: 'Silver',
    gradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 60%, #64748b 100%)',
    bg: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #94a3b8 50%, #475569 100%)',
    rim: 'linear-gradient(135deg, #ffffff, #64748b)',
    border: '#64748b',
    iconColor: '#ffffff',
    glow: '0 0 16px rgba(100, 116, 139, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.85)',
    textBadge: '#64748b'
  },
  bronze: {
    label: 'Bronze',
    gradient: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 25%, #ea580c 60%, #9a3412 100%)',
    bg: 'radial-gradient(circle at 35% 30%, #fed7aa 0%, #ea580c 50%, #7c2d12 100%)',
    rim: 'linear-gradient(135deg, #ffedd5, #9a3412)',
    border: '#9a3412',
    iconColor: '#ffffff',
    glow: '0 0 14px rgba(234, 88, 12, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.65)',
    textBadge: '#9a3412'
  }
}

// Resolve universe & tier to the appropriate thematic Lucide icon
function getThematicIcon(universeKey, tier) {
  const u = String(universeKey || '').toLowerCase()
  const t = String(tier || 'bronze').toLowerCase()

  // 1. Marvel Cinematic Universe
  if (u === 'mcu') {
    if (t === 'gold') return Crown // Infinity Master
    if (t === 'silver') return Zap // Avenger
    return Shield // Path of Heroes / Captain Shield
  }

  // 2. DC Extended Universe
  if (u === 'dceu') {
    if (t === 'gold') return Globe // Multiverse Master
    if (t === 'silver') return Star // Justice League
    return ShieldCheck // Dawn of Justice
  }

  // 3. DC Universe (Gods & Monsters)
  if (u === 'dcu') {
    if (t === 'gold') return Scale // Truth and Justice
    if (t === 'silver') return Sun // New Chapter / Superman Hope
    return Swords // Gods and Monsters
  }

  // 4. Star Wars
  if (u === 'star_wars') {
    if (t === 'gold') return Orbit // Force Master / Galaxy
    if (t === 'silver') return Swords // Jedi Knight
    return Compass // Padawan Finder
  }

  // 5. Kurtlar Vadisi
  if (u === 'kurtlar_vadisi') {
    if (t === 'gold') return Crown // The Baron
    if (t === 'silver') return Target // Council Member
    return Footprints // The Wolf
  }

  // 6. Resident Evil
  if (u === 'resident_evil') {
    if (t === 'gold') return Flame // Umbrella's End / Cleansing Fire
    if (t === 'silver') return Award // S.T.A.R.S. Operative
    return ShieldAlert // Survivor
  }

  // Fallback defaults
  if (t === 'gold') return Crown
  if (t === 'silver') return Star
  return Shield
}

export default function BadgeIcon({
  universeKey,
  tier = 'bronze',
  isUnlocked = true,
  size = 40,
  className = '',
  style = {}
}) {
  const theme = TIER_THEMES[tier] || TIER_THEMES.bronze
  const IconComponent = getThematicIcon(universeKey, tier)

  const iconSize = Math.round(size * 0.52)
  const borderWidth = Math.max(1.5, Math.round(size * 0.05))

  if (!isUnlocked) {
    return (
      <div
        className={`badge-icon badge-icon-locked ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--bg-card, #18181b)',
          border: `${borderWidth}px solid var(--border, rgba(255, 255, 255, 0.15))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          opacity: 0.7,
          filter: 'grayscale(0.9)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)',
          ...style
        }}
        title="Qulflangan"
      >
        <IconComponent size={iconSize} color="var(--text-muted, #71717a)" strokeWidth={1.8} />
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: Math.max(14, Math.round(size * 0.36)),
            height: Math.max(14, Math.round(size * 0.36)),
            borderRadius: '50%',
            background: 'var(--bg-surface, #18181b)',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Lock size={Math.max(8, Math.round(size * 0.2))} color="var(--text-muted, #a1a1aa)" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`badge-icon badge-icon-unlocked ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: theme.bg,
        border: `${borderWidth}px solid ${theme.border}`,
        boxShadow: theme.glow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
        cursor: 'default',
        ...style
      }}
    >
      {/* Outer bevel rim reflection */}
      <div
        style={{
          position: 'absolute',
          inset: 1,
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          pointerEvents: 'none'
        }}
      />
      {/* Center Thematic Icon */}
      <IconComponent
        size={iconSize}
        color={theme.iconColor}
        strokeWidth={2.1}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
        }}
      />
    </div>
  )
}
