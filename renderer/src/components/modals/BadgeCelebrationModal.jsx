import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Award, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function BadgeCelebrationModal({ badges = [], onClose }) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!badges || badges.length === 0) return null;

  const currentBadge = badges[currentIndex] || badges[0];
  const isGold = currentBadge.tier === 'gold';
  const isSilver = currentBadge.tier === 'silver';

  const tierColor = isGold ? '#eab308' : (isSilver ? '#94a3b8' : '#cd7f32');
  const tierBg = isGold ? 'rgba(234, 179, 8, 0.15)' : (isSilver ? 'rgba(148, 163, 184, 0.15)' : 'rgba(205, 127, 50, 0.15)');
  const tierBorder = isGold ? 'rgba(234, 179, 8, 0.4)' : (isSilver ? 'rgba(148, 163, 184, 0.4)' : 'rgba(205, 127, 50, 0.4)');
  const tierGlow = isGold ? '0 0 35px rgba(234, 179, 8, 0.5)' : (isSilver ? '0 0 30px rgba(148, 163, 184, 0.4)' : '0 0 30px rgba(205, 127, 50, 0.4)');

  const handleNext = () => {
    if (currentIndex < badges.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100001,
        padding: 20,
        animation: 'fadeInModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes badgePop {
          0% { transform: scale(0.6) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.04); filter: brightness(1.2); }
        }
        @keyframes confettiParticle {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'linear-gradient(165deg, #1e1e24 0%, #121216 100%)',
          borderRadius: 24,
          border: `1.5px solid ${tierBorder}`,
          boxShadow: `0 24px 60px rgba(0,0,0,0.8), ${tierGlow}`,
          padding: '36px 28px 28px',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
          color: '#ffffff'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Confetti / Particle Decorative Sparkles */}
        <div style={{ position: 'absolute', top: 15, left: 20, pointerEvents: 'none', opacity: 0.7 }}>
          <Sparkles size={20} color={tierColor} />
        </div>
        <div style={{ position: 'absolute', top: 30, right: 25, pointerEvents: 'none', opacity: 0.7 }}>
          <Sparkles size={26} color={tierColor} />
        </div>
        <div style={{ position: 'absolute', bottom: 40, left: 30, pointerEvents: 'none', opacity: 0.5 }}>
          <Sparkles size={16} color={tierColor} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#a1a1aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#a1a1aa' }}
        >
          <X size={16} />
        </button>

        {/* Top Header pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: tierBg,
            border: `1px solid ${tierBorder}`,
            color: tierColor,
            padding: '5px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 20
          }}
        >
          <Sparkles size={13} />
          <span>{t('gamification.badgeUnlocked', null, 'Yangi Yutuq Ochildi!')}</span>
        </div>

        {/* Animated Badge Medal Icon */}
        <div
          style={{
            margin: '0 auto 20px',
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${tierBg} 0%, rgba(0,0,0,0.4) 100%)`,
            border: `2px solid ${tierColor}`,
            boxShadow: tierGlow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 50,
            animation: 'badgePop 0.6s cubic-bezier(0.16, 1, 0.3, 1), pulseGlow 2.5s infinite ease-in-out'
          }}
        >
          <span>{currentBadge.icon || '🎖️'}</span>
        </div>

        {/* Badge Title */}
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 6px', color: '#ffffff', letterSpacing: '-0.02em' }}>
          {currentBadge.title}
        </h2>

        {/* Universe Subtitle */}
        <div style={{ fontSize: 13, fontWeight: 700, color: tierColor, marginBottom: 12 }}>
          {currentBadge.universe_name} · {currentBadge.tier.toUpperCase()} {t('gamification.tier', null, 'Nishoni')}
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.5, margin: '0 0 24px', padding: '0 10px' }}>
          {currentBadge.description}
        </p>

        {/* Multi-badge tracker indicator if multiple unlocked */}
        {badges.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
            {badges.map((b, idx) => (
              <div
                key={b.id || idx}
                style={{
                  width: idx === currentIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: idx === currentIndex ? tierColor : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: 14,
            background: `linear-gradient(135deg, ${tierColor} 0%, #d97706 100%)`,
            color: '#ffffff',
            border: 'none',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: `0 4px 16px ${tierBg}`,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'none' }}
        >
          <CheckCircle2 size={18} />
          <span>
            {currentIndex < badges.length - 1
              ? t('gamification.nextBadge', null, 'Keyingi Yutuq')
              : t('gamification.celebrateAction', null, 'Ajoyib!')}
          </span>
        </button>
      </div>
    </div>,
    document.body
  );
}
