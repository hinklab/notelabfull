import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { User, Sun, Moon, LogOut, X, Check, Globe, MapPin, RefreshCw, MessageCircle, ExternalLink } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useLanguage } from '../../context/LanguageContext.jsx'
import { getStoredUserLocation, storeUserLocation, requestBrowserGeolocation } from '../../services/geo.js'
import { TelegramIcon, InstagramIcon } from '../common/SocialIcons.jsx'

export default function SettingsModal({ onClose, onOpenSurvey }) {
  const { user, updateUser, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'appearance' | 'logout'

  // Tab 1: Profile state
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Tab 2: Theme & Location state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [geoData, setGeoData] = useState(() => getStoredUserLocation())
  const [geoLoading, setGeoLoading] = useState(false)

  const handleRefreshGeo = async () => {
    setGeoLoading(true)
    try {
      const updated = await requestBrowserGeolocation()
      setGeoData(updated)
    } finally {
      setGeoLoading(false)
    }
  }

  const handleSelectCountry = (countryCode, countryName) => {
    const updated = storeUserLocation({
      ...geoData,
      countryCode,
      countryName
    })
    setGeoData(updated)
  }

  const handleSaveProfile = async () => {
    if (profileSaving) return
    setProfileSaving(true)
    try {
      const res = await window.api.updateProfile({
        first_name: firstName,
        last_name: lastName
      })
      if (res.success && res.user) {
        updateUser(res.user)
      }
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      console.error('Failed to update profile:', err)
      alert(t('common.error') + ': ' + (err.message || 'Error'))
    } finally {
      setProfileSaving(false)
    }
  }

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new CustomEvent('notelab_theme_changed', { detail: newTheme }));
  }

  const tabs = [
    { id: 'profile', label: t('settings.profile', null, 'Profil'), icon: User },
    { id: 'appearance', label: t('settings.appearance', null, "Ko'rinish"), icon: theme === 'dark' ? Moon : Sun },
    { id: 'contact', label: t('settings.contact', null, "Bog'lanish"), icon: MessageCircle, color: '#38bdf8' },
    { id: 'logout', label: t('settings.logout', null, 'Chiqish'), icon: LogOut, color: '#ef4444' },
  ]

  const tabIndexMap = { profile: 0, appearance: 1, contact: 2, logout: 3 }
  const activeIndex = tabIndexMap[activeTab] ?? 0

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface, #161616)',
          border: '1px solid var(--border, #2a2a2a)',
          borderRadius: 16,
          width: 'min(640px, 94vw)',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 25px 70px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--text-primary, #efefef)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border, #2a2a2a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('settings.title')}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #71717a)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border, #2a2a2a)',
            background: 'var(--bg-base, #0b0b0b)',
            padding: '4px 12px 0 12px',
            gap: 4,
            overflowX: 'auto',
          }}
        >
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: active ? 'var(--bg-surface, #161616)' : 'transparent',
                  color: active ? (tab.color || 'var(--accent, #7c3aed)') : 'var(--text-muted, #71717a)',
                  borderTop: active ? '2px solid ' + (tab.color || 'var(--accent, #7c3aed)') : '2px solid transparent',
                  borderLeft: active ? '1px solid var(--border, #2a2a2a)' : '1px solid transparent',
                  borderRight: active ? '1px solid var(--border, #2a2a2a)' : '1px solid transparent',
                  borderBottom: active ? '1px solid var(--bg-surface, #161616)' : 'none',
                  borderRadius: '8px 8px 0 0',
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  flex: '1 1 0',
                  minWidth: 'max-content',
                  transition: 'all 0.2s ease',
                  marginBottom: -1,
                }}
              >
                <Icon size={15} color={active ? (tab.color || 'var(--accent)') : undefined} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Modal Scrollable Content Container */}
        <div
          style={{
            flex: 1,
            maxHeight: 'calc(80vh - 110px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 24,
            boxSizing: 'border-box',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          {/* TAB 1: Profil */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {t('settings.email')}
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={user?.email || ''}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input, #1e1e1e)',
                    border: '1px solid var(--border, #2a2a2a)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: 'var(--text-muted, #71717a)',
                    fontSize: 13,
                    cursor: 'not-allowed',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Ism
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Ismingiz"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #1e1e1e)',
                      border: '1px solid var(--border, #2a2a2a)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      color: 'var(--text-primary, #efefef)',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Familiya
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Familiyangiz"
                    style={{
                      width: '100%',
                      background: 'var(--bg-input, #1e1e1e)',
                      border: '1px solid var(--border, #2a2a2a)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      color: 'var(--text-primary, #efefef)',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  style={{
                    background: 'var(--accent, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: profileSaving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                    opacity: profileSaving ? 0.7 : 1,
                  }}
                >
                  {profileSaved ? (
                    <>
                      <Check size={15} /> {t('common.success')}
                    </>
                  ) : (
                    profileSaving ? t('common.loading') : t('common.save')
                  )}
                </button>
              </div>

              {/* Qiziqishlar so'rovnomasi bo'limi */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {t('onboarding.welcomeTitle')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {t('onboarding.welcomeDesc')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenSurvey?.()
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(124, 58, 237, 0.1)',
                    border: '1.5px solid var(--accent)',
                    borderRadius: 10,
                    padding: '12px 18px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.15)',
                  }}
                >
                  <User size={16} color="var(--accent)" />
                  <span>{t('onboarding.submit')}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Ko'rinish & Til */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Language Selection Section */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={16} color="var(--accent)" />
                  <span>{t('settings.language')}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {t('settings.languageDesc')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { code: 'uz', label: "O'zbekcha", tag: 'UZ' },
                    { code: 'ru', label: 'Русский', tag: 'RU' },
                    { code: 'en', label: 'English', tag: 'EN' }
                  ].map(langItem => {
                    const isLangActive = language === langItem.code
                    return (
                      <button
                        key={langItem.code}
                        type="button"
                        onClick={() => setLanguage(langItem.code)}
                        style={{
                          background: isLangActive ? 'rgba(124,58,237,0.18)' : 'var(--bg-input)',
                          border: isLangActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '10px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          color: isLangActive ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: 12,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          background: isLangActive ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                          color: isLangActive ? '#fff' : 'var(--text-secondary)',
                          padding: '2px 8px',
                          borderRadius: 6
                        }}>
                          {langItem.tag}
                        </span>
                        <span>{langItem.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Theme Selection Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {t('settings.theme')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  {t('settings.themeDesc')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('dark')}
                    style={{
                      background: theme === 'dark' ? 'rgba(124,58,237,0.18)' : 'var(--bg-input)',
                      border: theme === 'dark' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: theme === 'dark' ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Moon size={16} /> {t('settings.darkTheme')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange('light')}
                    style={{
                      background: theme === 'light' ? 'rgba(124,58,237,0.18)' : 'var(--bg-input)',
                      border: theme === 'light' ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      color: theme === 'light' ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    <Sun size={16} /> {t('settings.lightTheme')}
                  </button>
                </div>
              </div>

              {/* Location & Country Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={16} color="#ef4444" />
                    <span>{t('geo.location', null, 'Joylashuv')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshGeo}
                    disabled={geoLoading}
                    title={t('geo.detectLocation', null, 'Joylashuvni yangilash')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: geoLoading ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <RefreshCw size={12} className={geoLoading ? 'animate-spin' : ''} />
                    <span>{geoLoading ? t('common.loading') : t('geo.detectLocation', null, 'Yangilash')}</span>
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {geoData.city ? `${geoData.city}, ${geoData.countryName || geoData.countryCode}` : (geoData.countryName || 'O\'zbekiston')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                  {[
                    { code: 'UZ', name: "O'zbekiston" },
                    { code: 'RU', name: 'Россия' },
                    { code: 'KZ', name: 'Қазақстан' },
                    { code: 'US', name: 'USA' }
                  ].map(c => {
                    const isSelected = geoData.countryCode === c.code
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c.code, c.name)}
                        style={{
                          background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-input)',
                          border: isSelected ? '1.5px solid #ef4444' : '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 4px',
                          color: isSelected ? '#f87171' : 'var(--text-primary)',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s'
                        }}
                      >
                        {c.code}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Biz bilan bog'lanish */}
          {activeTab === 'contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageCircle size={16} color="#38bdf8" />
                  <span>{t('settings.contact', null, "Biz bilan bog'lanish")}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {t('settings.contactDesc', null, "Savollar, takliflar va kino tavsiyalari bo'yicha rasmiy sahifalarimizga yozing:")}
                </div>
              </div>

              {/* Telegram Card */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: 'rgba(34, 158, 217, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <TelegramIcon size={22} color="#229ED9" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Telegram</span>
                      <span style={{ fontSize: 11, background: 'rgba(34, 158, 217, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        @saqlab_uz
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('settings.telegramChannel', null, "Rasmiy kanal & Guruh")}
                    </div>
                  </div>
                </div>

                <a
                  href="https://t.me/saqlab_uz"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#229ED9',
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                    transition: 'opacity 0.15s',
                    boxShadow: '0 2px 8px rgba(34, 158, 217, 0.3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span>{t('settings.telegramAction', null, "Ochish")}</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Instagram Card */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                transition: 'border-color 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: 'linear-gradient(45deg, rgba(240, 148, 51, 0.15), rgba(220, 39, 67, 0.15))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <InstagramIcon size={22} color="#e1306c" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Instagram</span>
                      <span style={{ fontSize: 11, background: 'rgba(225, 48, 108, 0.18)', color: '#f43f5e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        @saqlab.uz
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('settings.instagramPage', null, "Rasmiy Instagram sahifamiz")}
                    </div>
                  </div>
                </div>

                <a
                  href="https://www.instagram.com/saqlab.uz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                    transition: 'opacity 0.15s',
                    boxShadow: '0 2px 8px rgba(220, 39, 67, 0.3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span>{t('settings.instagramAction', null, "Ochish")}</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}

          {/* TAB 4: Chiqish */}
          {activeTab === 'logout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('settings.logout')}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {t('auth.loginSubtitle')}
              </p>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    logout()
                  }}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '11px 22px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                  }}
                >
                  <LogOut size={16} /> {t('settings.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/* Gemini API key field kept for future agent re-enablement:
function GeminiKeyField({ value, onChange, hasGemini }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        Gemini API kaliti (AI agent va izlash uchun)
      </div>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="AIza..."
        style={{
          width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13,
        }}
      />
    </div>
  )
}
*/

export function Modal({ title, onClose, children }) {
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface, #161616)', border: '1px solid var(--border, #2a2a2a)', borderRadius: 12,
        padding: '22px 24px', width: 440, maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)', color: 'var(--text-primary, #efefef)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary, #efefef)', display: 'flex', alignItems: 'center', gap: 8 }}>{title}</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #555)', cursor: 'pointer', fontSize: 18 }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
