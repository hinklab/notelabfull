import React from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { ArrowUpRight, Clapperboard } from 'lucide-react';
import { MarvelLogo, DCLogo, StarWarsLogo, NetflixLogo, WarnerBrosLogo, HBOLogo } from '../components/landing/BrandLogos.jsx';

export default function LandingPage({ onNavigate }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#191a23', fontFamily: "'Space Grotesk', 'Onest', 'Manrope', 'Golos Text', -apple-system, sans-serif" }}>
      
      {/* ═══════════════════════════════════════════════ */}
      {/* 1. TOP NAVBAR                                   */}
      {/* ═══════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div className="landing-nav-inner" style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img
              src="/saqlab-logo-b.png"
              alt="saqlab"
              style={{ height: 26, width: 'auto', objectFit: 'contain' }}
              draggable="false"
            />
          </div>

          {/* Right: Language Pill & Auth Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            
            {/* Language Selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 3,
              gap: 2,
              width: 116,
              boxSizing: 'border-box'
            }}>
              {[
                { code: 'uz', label: "UZ" },
                { code: 'ru', label: "RU" },
                { code: 'en', label: "EN" }
              ].map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  style={{
                    width: 34,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    background: language === lang.code ? '#191a23' : 'transparent',
                    color: language === lang.code ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box'
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Login Link */}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px 6px',
                width: 76,
                minWidth: 76,
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: '#191a23',
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                boxSizing: 'border-box'
              }}
            >
              {t('landing.login', 'Kirish')}
            </button>

            {/* Sign Up Outline Button */}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              style={{
                background: 'transparent',
                border: '1.5px solid #191a23',
                borderRadius: 14,
                padding: '9px 12px',
                width: 175,
                minWidth: 175,
                textAlign: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: '#191a23',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#191a23';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#191a23';
              }}
            >
              {t('landing.signUp', "Ro'yxatdan o'tish")}
            </button>

          </div>

        </div>
      </header>

      {/* ═══════════════════════════════════════════════ */}
      {/* 2. HERO SECTION (Positivus 2-Column Split)      */}
      {/* ═══════════════════════════════════════════════ */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 32px' }}>
        <div className="landing-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 40, alignItems: 'center' }}>
          
          {/* Left Column */}
          <div className="landing-hero-left" style={{ textAlign: 'left' }}>
            <h1 style={{
              fontSize: 'clamp(32px, 3.8vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#191a23',
              marginBottom: 20,
              minHeight: 155,
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              {t('landing.heroTitle', 'Kinematografiya olamingizni mukammal boshqaring')}
            </h1>

            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15.5,
              lineHeight: 1.6,
              color: '#475569',
              marginBottom: 32,
              maxWidth: 440,
              minHeight: 76,
              display: 'flex',
              alignItems: 'flex-start'
            }}>
              {t('landing.heroSubtitle', "Franshizalar xronologiyasi, aqlli ko'p tilli qidiruv va shaxsiy kinotaqvim — barchasi bitta minimalist platformada.")}
            </p>

            <button
              type="button"
              onClick={() => onNavigate('register')}
              style={{
                background: '#191a23',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                padding: '16px 24px',
                width: 175,
                minWidth: 175,
                fontSize: 15.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 12px rgba(25, 26, 35, 0.15)',
                boxSizing: 'border-box'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#000000'}
              onMouseLeave={e => e.currentTarget.style.background = '#191a23'}
            >
              <span>{t('landing.getStarted', 'Boshlash')}</span>
              <ArrowUpRight size={18} />
            </button>
          </div>

          {/* Right Column: High Quality Native Video Player */}
          <div className="landing-video-card" style={{
            background: '#ffffff',
            border: '1.5px solid #191a23',
            borderRadius: 36,
            boxShadow: '0 6px 0px #191a23',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            aspectRatio: '16 / 9',
            width: '100%'
          }}>
            <video
              src="/saqlab-video.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: 'scale(1.40)',
                transformOrigin: 'center center'
              }}
            />
          </div>

        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* 3. FRANCHISE BRAND LOGOS STRIP                  */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="landing-brand-strip" style={{
          marginTop: 64,
          paddingTop: 36,
          paddingBottom: 20,
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 32,
          color: '#191a23',
          opacity: 0.75,
          userSelect: 'none'
        }}>
          <div title="Marvel Studios" style={{ transition: 'opacity 0.2s', cursor: 'default' }}><MarvelLogo height={26} /></div>
          <div title="DC Universe" style={{ transition: 'opacity 0.2s', cursor: 'default' }}><DCLogo height={30} /></div>
          <div title="Star Wars" style={{ transition: 'opacity 0.2s', cursor: 'default' }}><StarWarsLogo height={26} /></div>
          <div title="Netflix" style={{ transition: 'opacity 0.2s', cursor: 'default' }}><NetflixLogo height={24} /></div>
          <div title="Warner Bros" style={{ transition: 'opacity 0.2s', cursor: 'default' }}><WarnerBrosLogo height={30} /></div>
          <div title="HBO" style={{ transition: 'opacity 0.2s', cursor: 'default' }}><HBOLogo height={24} /></div>
        </div>

      </main>

      {/* ═══════════════════════════════════════════════ */}
      {/* 4. SERVICES 2x2 BENTO GRID                      */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="xizmatlar" style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        
        {/* Header with Lime Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 48 }}>
          <span style={{
            background: '#b9ff66',
            color: '#191a23',
            fontSize: 26,
            fontWeight: 800,
            padding: '4px 14px',
            borderRadius: 8,
            letterSpacing: '-0.02em'
          }}>
            {t('landing.servicesBadge', 'Xizmatlar')}
          </span>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            color: '#475569',
            maxWidth: 560,
            lineHeight: 1.5,
            margin: 0,
            minHeight: 46
          }}>
            {t('landing.servicesDesc', 'Platformamiz sizga sevimli kino va seriallaringizni mukammal tartibda boshqarish uchun keng imkoniyatlarni taqdim etadi.')}
          </p>
        </div>

        {/* 2x2 Bento Cards */}
        <div className="landing-bento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 32 }}>
          
          {/* Card 1: Grey/White Card with Lime Pills */}
          <div style={{
            background: '#f3f3f3',
            border: '1.5px solid #191a23',
            borderRadius: 36,
            boxShadow: '0 6px 0px #191a23',
            padding: 36,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.15s ease'
          }}>
            <div>
              <div style={{ marginBottom: 12, minHeight: 68 }}>
                <span style={{
                  background: '#b9ff66',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block',
                  marginBottom: 4
                }}>
                  {t('landing.feature1Pill1', 'Kinoolamlar')}
                </span><br />
                <span style={{
                  background: '#b9ff66',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block'
                }}>
                  {t('landing.feature1Pill2', 'Xronologiyasi')}
                </span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: '#334155', lineHeight: 1.6, margin: 0, minHeight: 70 }}>
                {t('landing.feature1Desc', "MCU, Star Wars, DC, John Wick kabi katta kinoolamlarni voqealar xronologiyasi bo'yicha tartibli tomosha qiling.")}
              </p>
            </div>

            <div
              onClick={() => onNavigate('register')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, cursor: 'pointer', width: 'fit-content' }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#191a23',
                color: '#b9ff66',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ArrowUpRight size={18} />
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#191a23' }}>{t('landing.learnMore', 'Batafsil')}</span>
            </div>
          </div>

          {/* Card 2: Dark Card with White Pills */}
          <div style={{
            background: '#191a23',
            color: '#ffffff',
            border: '1.5px solid #191a23',
            borderRadius: 36,
            boxShadow: '0 6px 0px #191a23',
            padding: 36,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.15s ease'
          }}>
            <div>
              <div style={{ marginBottom: 12, minHeight: 68 }}>
                <span style={{
                  background: '#ffffff',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block',
                  marginBottom: 4
                }}>
                  {t('landing.feature2Pill1', "Aqlli Ko'p Tilli")}
                </span><br />
                <span style={{
                  background: '#ffffff',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block'
                }}>
                  {t('landing.feature2Pill2', 'Qidiruv Tizimi')}
                </span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: '#cbd5e1', lineHeight: 1.6, margin: 0, minHeight: 70 }}>
                {t('landing.feature2Desc', "O'zbek, rus va ingliz tillarida qidiring. Tizim avtomatik tarjima qilib, eng oxirgi rasmiy treylerlarni topadi.")}
              </p>
            </div>

            <div
              onClick={() => onNavigate('register')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, cursor: 'pointer', width: 'fit-content' }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#ffffff',
                color: '#191a23',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ArrowUpRight size={18} />
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#ffffff' }}>{t('landing.trySearch', "Sinab ko'rish")}</span>
            </div>
          </div>

          {/* Card 3: Dark Card with White Pills */}
          <div style={{
            background: '#191a23',
            color: '#ffffff',
            border: '1.5px solid #191a23',
            borderRadius: 36,
            boxShadow: '0 6px 0px #191a23',
            padding: 36,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.15s ease'
          }}>
            <div>
              <div style={{ marginBottom: 12, minHeight: 68 }}>
                <span style={{
                  background: '#ffffff',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block',
                  marginBottom: 4
                }}>
                  {t('landing.feature3Pill1', 'Shaxsiy Kinotaqvim')}
                </span><br />
                <span style={{
                  background: '#ffffff',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block'
                }}>
                  {t('landing.feature3Pill2', 'Kanban Doska')}
                </span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: '#cbd5e1', lineHeight: 1.6, margin: 0, minHeight: 70 }}>
                {t('landing.feature3Desc', "Kutilayotgan, ko'riladigan va ko'rilgan filmlaringizni oson boshqaring va o'z baholaringizni qo'ying.")}
              </p>
            </div>

            <div
              onClick={() => onNavigate('register')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, cursor: 'pointer', width: 'fit-content' }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#ffffff',
                color: '#191a23',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ArrowUpRight size={18} />
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#ffffff' }}>{t('landing.createList', "Ro'yxat tuzish")}</span>
            </div>
          </div>

          {/* Card 4: Grey/White Card with Lime Pills */}
          <div style={{
            background: '#f3f3f3',
            border: '1.5px solid #191a23',
            borderRadius: 36,
            boxShadow: '0 6px 0px #191a23',
            padding: 36,
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.15s ease'
          }}>
            <div>
              <div style={{ marginBottom: 12, minHeight: 68 }}>
                <span style={{
                  background: '#b9ff66',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block',
                  marginBottom: 4
                }}>
                  {t('landing.feature4Pill1', 'Agelab AI')}
                </span><br />
                <span style={{
                  background: '#b9ff66',
                  color: '#191a23',
                  fontSize: 20,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-block'
                }}>
                  {t('landing.feature4Pill2', 'Tavsiyalar')}
                </span>
              </div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14.5, color: '#334155', lineHeight: 1.6, margin: 0, minHeight: 70 }}>
                {t('landing.feature4Desc', "Sun'iy intellekt orqali siz yoqtirgan janr va qiziqishlaringizga mos eng sara filmlarni kashf eting.")}
              </p>
            </div>

            <div
              onClick={() => onNavigate('register')}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, cursor: 'pointer', width: 'fit-content' }}
            >
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#191a23',
                color: '#b9ff66',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ArrowUpRight size={18} />
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#191a23' }}>{t('landing.getRecs', 'Tavsiya olish')}</span>
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* 5. CALLOUT BANNER BOX                           */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="landing-callout-box" style={{
          background: '#f3f3f3',
          border: '1.5px solid #191a23',
          borderRadius: 36,
          boxShadow: '0 6px 0px #191a23',
          padding: '48px 56px',
          marginTop: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32
        }}>
          <div style={{ textAlign: 'left', maxWidth: 520 }}>
            <h3 style={{ fontSize: 28, fontWeight: 800, color: '#191a23', marginBottom: 12, letterSpacing: '-0.02em', minHeight: 36 }}>
              {t('landing.ctaTitle', 'Kinolar olamini tartibga keltiramiz')}
            </h3>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#475569', lineHeight: 1.6, marginBottom: 24, minHeight: 48 }}>
              {t('landing.ctaSubtitle', "Bugunoq o'zingizning shaxsiy kino bazangizni yarating va barcha yangiliklardan xabardor bo'ling.")}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('register')}
              style={{
                background: '#191a23',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t('landing.ctaButton', 'Bepul boshlash')}
            </button>
          </div>

          <div className="landing-callout-icon" style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: '#b9ff66',
            border: '2px solid #191a23',
            boxShadow: '0 4px 0px #191a23',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clapperboard size={44} color="#191a23" />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* 6. STATS BLACK BANNER                           */}
        {/* ═══════════════════════════════════════════════ */}
        <div id="statistika" style={{ marginTop: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <span style={{
              background: '#b9ff66',
              color: '#191a23',
              fontSize: 24,
              fontWeight: 800,
              padding: '3px 12px',
              borderRadius: 8
            }}>
              {t('landing.statsBadge', 'Statistika')}
            </span>
          </div>

          <div className="landing-stats-grid" style={{
            background: '#191a23',
            color: '#ffffff',
            borderRadius: 36,
            padding: '48px 56px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 32
          }}>
            <div className="landing-stat-item" style={{ paddingRight: 24, borderRight: '1px solid #334155' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#b9ff66', marginBottom: 8 }}>{t('landing.stat1Title', '150+')}</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0, minHeight: 70 }}>
                {t('landing.stat1Desc', "Marvel, Star Wars, DC, Harry Potter, John Wick va barcha mashhur franshizalar xronologiyasi to'liq kiritilgan.")}
              </p>
            </div>

            <div className="landing-stat-item" style={{ paddingRight: 24, paddingLeft: 12, borderRight: '1px solid #334155' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#b9ff66', marginBottom: 8 }}>{t('landing.stat2Title', '3 ta Til')}</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0, minHeight: 70 }}>
                {t('landing.stat2Desc', "O'zbek, rus va ingliz tillarida bir zumda aqlli qidiruv va avtomatik tarjima.")}
              </p>
            </div>

            <div className="landing-stat-item" style={{ paddingLeft: 12 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#b9ff66', marginBottom: 8 }}>{t('landing.stat3Title', '100%')}</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0, minHeight: 70 }}>
                {t('landing.stat3Desc', "Reklamasiz, bepul va o'zingizga qulay shaxsiy kino makoni.")}
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* 7. FOOTER                                       */}
      {/* ═══════════════════════════════════════════════ */}
      <footer style={{
        background: '#191a23',
        color: '#ffffff',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: '48px 48px 32px',
        marginTop: 64
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 32,
          borderBottom: '1px solid #334155'
        }}>
          <img src="/saqlab-logo-w.png" alt="saqlab" style={{ height: 22, width: 'auto', objectFit: 'contain' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14, fontWeight: 600 }}>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
            >
              {t('landing.login', 'Kirish')}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('register')}
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
            >
              {t('landing.signUp', "Ro'yxatdan o'tish")}
            </button>
          </div>
        </div>

        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          paddingTop: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b'
        }}>
          <span>© {new Date().getFullYear()} saqlab. {t('landing.footerRights', 'Barcha huquqlar himoyalangan.')}</span>
          <span style={{ color: '#b9ff66', fontWeight: 600 }}>{t('landing.footerTagline', 'saqlab • Cinematic Universe Ecosystem')}</span>
        </div>
      </footer>

    </div>
  );
}
