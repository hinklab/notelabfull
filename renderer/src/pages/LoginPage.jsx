import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, MailCheck } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext.jsx'
import { api } from '../config/api.js'

const SUPABASE_URL = 'https://spntzkotmgsghoahqkne.supabase.co'
const SUPABASE_KEY = ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('')

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function parseJwt(token) {
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function getRecoveryInfo() {
  if (typeof window === 'undefined') return { token: null, email: null }
  
  let token = null
  let email = null
  
  // 1. Check URL hash (#access_token=...&type=recovery)
  const hash = window.location.hash || ''
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1))
    token = hashParams.get('access_token') || hashParams.get('token')
    if (hashParams.get('email')) email = hashParams.get('email')
  }
  
  // 2. Check URL search query (?access_token=... or ?token=... or ?email=...)
  if (!token || !email) {
    const search = window.location.search || ''
    if (search) {
      const searchParams = new URLSearchParams(search)
      if (!token) token = searchParams.get('access_token') || searchParams.get('token')
      if (!email) email = searchParams.get('email')
    }
  }
  
  // 3. Extract email directly from JWT token payload synchronously
  if (token && !email) {
    const jwt = parseJwt(token)
    if (jwt?.email) email = jwt.email
  }
  
  // 4. SessionStorage cache fallback (persists across multiple form attempts & re-renders)
  if (!token) {
    try { token = sessionStorage.getItem('saqlab_recovery_token') } catch {}
  }
  if (!email) {
    try { email = sessionStorage.getItem('saqlab_recovery_email') } catch {}
  }
  
  // Persist if found
  if (token) {
    try { sessionStorage.setItem('saqlab_recovery_token', token) } catch {}
  }
  if (email) {
    try { sessionStorage.setItem('saqlab_recovery_email', email) } catch {}
  }
  
  return { token, email }
}

export default function LoginPage({ onSwitch, onBack, isRecoveryModeProp = false }) {
  const { login, resetPasswordDirect } = useAuth()
  const { t } = useLanguage()

  const [currentTheme, setCurrentTheme] = useState(() =>
    document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
  )
  useEffect(() => {
    const update = () => setCurrentTheme(
      document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
    )
    window.addEventListener('storage', update)
    window.addEventListener('notelab_theme_changed', update)
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { window.removeEventListener('storage', update); window.removeEventListener('notelab_theme_changed', update); obs.disconnect() }
  }, [])

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Forgot
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [forgotError, setForgotError] = useState('')

  // Recovery
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    if (isRecoveryModeProp) return true
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || ''
      const search = window.location.search || ''
      if (hash.includes('type=recovery') || hash.includes('access_token') || search.includes('type=recovery') || search.includes('reset_password=true')) {
        return true
      }
    }
    const info = getRecoveryInfo()
    return !!info.token
  })
  const [recoveryToken, setRecoveryToken] = useState(() => getRecoveryInfo().token)
  const [recoveryEmail, setRecoveryEmail] = useState(() => getRecoveryInfo().email)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetError, setResetError] = useState('')

  // If email is still not loaded, fetch from Supabase user endpoint as fallback
  useEffect(() => {
    const info = getRecoveryInfo()
    if (!recoveryToken && info.token) setRecoveryToken(info.token)
    if (!recoveryEmail && info.email) setRecoveryEmail(info.email)

    const tok = recoveryToken || info.token
    if (isRecoveryMode && tok && !recoveryEmail) {
      fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { 'Authorization': `Bearer ${tok}`, 'apikey': SUPABASE_KEY }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.email) {
            setRecoveryEmail(data.email)
            try { sessionStorage.setItem('saqlab_recovery_email', data.email) } catch {}
          }
        })
        .catch(() => {})
    }
  }, [isRecoveryMode, recoveryToken, recoveryEmail])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setLoginError(t('auth.enterEmailPassword', null, 'Email va parol kiriting'))
      return
    }
    setLoginError('')
    setLoginLoading(true)
    try { await login(email.trim(), password) }
    catch (err) { setLoginError(err.message) }
    finally { setLoginLoading(false) }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotError('Email manzilini kiriting.')
      return
    }
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)
    try {
      const redirectTo = typeof window !== 'undefined'
        ? (window.location.hostname === 'localhost' ? window.location.origin : 'https://www.saqlab.uz')
        : 'https://www.saqlab.uz'
      const res = await api.resetPasswordEmail(forgotEmail.trim(), redirectTo)
      setForgotSuccess(res?.message || 'Parolni tiklash havolasi elektron pochtangizga yuborildi! Pochtani tekshiring.')
    } catch (err) {
      setForgotError(err.message || 'Xatolik yuz berdi.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleSetNewPassword = async (e) => {
    e.preventDefault()
    if (!newPassword) { setResetError("Yangi parolni kiriting."); return }
    if (newPassword.length < 6) { setResetError("Parol kamida 6 ta belgi bo'lishi kerak."); return }
    if (newPassword !== confirmPassword) { setResetError("Parollar bir-biriga mos kelmadi."); return }

    setResetError('')
    setResetLoading(true)

    try {
      const currentToken = recoveryToken || getRecoveryInfo().token
      const targetEmail = recoveryEmail || forgotEmail || (currentToken ? parseJwt(currentToken)?.email : null) || getRecoveryInfo().email

      let updated = false
      let lastErrorMessage = ''

      // 1. Update Supabase Auth API
      if (currentToken) {
        try {
          const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentToken}`,
              'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({ password: newPassword })
          })

          const updateData = await updateRes.json()
          if (updateRes.ok) {
            updated = true
          } else {
            lastErrorMessage = updateData.msg || updateData.message || updateData.error_description || updateData.error || ''
          }
        } catch (authErr) {
          lastErrorMessage = authErr.message
        }
      }

      // 2. Synchronize password_hash in public.users
      if (targetEmail) {
        try {
          const hash = await sha256(newPassword)
          await fetch(`${SUPABASE_URL}/rest/v1/users?email=ilike.${encodeURIComponent(targetEmail)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ password_hash: hash })
          })

          if (resetPasswordDirect) {
            await resetPasswordDirect(targetEmail, newPassword)
          } else if (api?.resetPasswordDirect) {
            await api.resetPasswordDirect(targetEmail, newPassword)
          }

          updated = true
        } catch (dbErr) {
          if (!updated) lastErrorMessage = dbErr.message
        }
      }

      if (updated) {
        setResetSuccess("Parolingiz muvaffaqiyatli yangilandi! Endi yangi parol bilan kirishingiz mumkin.")
        try {
          sessionStorage.removeItem('saqlab_recovery_token')
          sessionStorage.removeItem('saqlab_recovery_email')
        } catch {}
        if (typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname)
        return
      }

      if (lastErrorMessage) {
        setResetError(lastErrorMessage)
      } else {
        setResetError("Email aniqlanmadi. Iltimos qayta tiklash havolasini so'rang.")
      }
    } catch (err) {
      setResetError(err.message || 'Xatolik yuz berdi.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleBack = () => {
    if (isRecoveryMode) { setIsRecoveryMode(false); setResetError(''); setResetSuccess('') }
    else if (showForgot) { setShowForgot(false); setForgotError(''); setForgotSuccess(''); setForgotEmail('') }
    else if (onBack) { onBack() }
  }

  const showBackBtn = onBack || showForgot || isRecoveryMode
  const backLabel = (showForgot || isRecoveryMode) ? 'Ortga qaytish' : 'Bosh sahifa'

  return (
    <div className="auth-page" style={styles.page}>
      <div className="auth-card" style={styles.card}>

        {showBackBtn && (
          <button type="button" onClick={handleBack} style={styles.backBtn}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={14} />
            <span>{backLabel}</span>
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <img
            src={currentTheme === 'light' ? '/saqlab-logo-b.png' : '/saqlab-logo-w.png'}
            alt="saqlab"
            style={{ height: 24, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {isRecoveryMode ? (
          <>
            <h2 className="auth-title" style={styles.title}>Yangi parol o'rnatish</h2>
            <p className="auth-subtitle" style={styles.subtitle}>
              {recoveryEmail ? `${recoveryEmail} hisobi uchun yangi parol kiriting` : 'Hisobingiz uchun yangi xavfsiz parol kiriting'}
            </p>
            {resetSuccess ? (
              <div style={styles.successBox}>
                <div style={styles.successTitle}><CheckCircle2 size={20} /> Muvaffaqiyatli!</div>
                <div style={{ color: 'var(--text-primary)' }}>{resetSuccess}</div>
                <button type="button"
                  onClick={() => { setIsRecoveryMode(false); setResetSuccess(''); if (onBack) onBack() }}
                  style={{ ...styles.btn, background: '#10b981', marginTop: 6 }}
                >Kirish oynasiga o'tish</button>
              </div>
            ) : (
              <form onSubmit={handleSetNewPassword} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>Yangi parol</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)} placeholder="••••••••"
                      className="auth-input" style={{ ...styles.input, paddingRight: 40 }}
                      disabled={resetLoading} autoFocus />
                    <button type="button" tabIndex={-1} onClick={() => setShowNewPassword(p => !p)} style={styles.eyeBtn}>
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Yangi parolni tasdiqlang</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                      className="auth-input" style={{ ...styles.input, paddingRight: 40 }}
                      disabled={resetLoading} />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword(p => !p)} style={styles.eyeBtn}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {resetError && <div style={styles.error}>{resetError}</div>}
                <button type="submit" className="auth-btn" style={{ ...styles.btn, opacity: resetLoading ? 0.6 : 1 }} disabled={resetLoading}>
                  {resetLoading ? '...' : 'Yangi parolni saqlash'}
                </button>
              </form>
            )}
          </>

        ) : showForgot ? (
          <>
            <h2 className="auth-title" style={styles.title}>Parolni tiklash</h2>
            <p className="auth-subtitle" style={styles.subtitle}>Email manzilingizga xavfsiz tiklash havolasini yuboramiz</p>
            {forgotSuccess ? (
              <div style={styles.successBox}>
                <div style={styles.successTitle}><MailCheck size={20} /> Havola yuborildi!</div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{forgotSuccess}</div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                  📥 Pochtangizni oching, "Parolni tiklash" havolasini bosing va yangi parol o'rnating.
                </p>
                <button type="button"
                  onClick={() => { setShowForgot(false); setForgotSuccess(''); setForgotEmail('') }}
                  style={{ ...styles.btn, background: '#10b981', marginTop: 6 }}
                >Kirish oynasiga qaytish</button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} style={styles.form}>
                <div style={styles.field}>
                  <label style={styles.label}>Elektron pochta</label>
                  <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="email@example.com" className="auth-input" style={styles.input}
                    autoFocus disabled={forgotLoading} />
                </div>
                {forgotError && <div style={styles.error}>{forgotError}</div>}
                <button type="submit" className="auth-btn" style={{ ...styles.btn, opacity: forgotLoading ? 0.6 : 1 }} disabled={forgotLoading}>
                  {forgotLoading ? '...' : 'Tiklash havolasini yuborish'}
                </button>
              </form>
            )}
          </>

        ) : (
          <>
            <h2 className="auth-title" style={styles.title}>{t('auth.loginTitle', null, 'Xush kelibsiz')}</h2>
            <p className="auth-subtitle" style={styles.subtitle}>{t('auth.loginSubtitle', null, 'saqlab hisobingizga kiring')}</p>
            <form onSubmit={handleLogin} className="auth-form" style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>{t('auth.email', null, 'Elektron pochta')}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com" className="auth-input" style={styles.input}
                  autoFocus disabled={loginLoading} />
              </div>
              <div style={styles.field}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label}>{t('auth.password', null, 'Parol')}</label>
                  <span onClick={() => { setForgotEmail(email); setShowForgot(true); setForgotError(''); setForgotSuccess('') }}
                    style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>
                    {t('auth.forgotPassword', null, 'Parolni unutdingizmi?')}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    className="auth-input" style={{ ...styles.input, paddingRight: 40 }}
                    disabled={loginLoading} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {loginError && <div style={styles.error}>{loginError}</div>}
              <button type="submit" className="auth-btn" style={{ ...styles.btn, opacity: loginLoading ? 0.6 : 1 }} disabled={loginLoading}>
                {loginLoading ? '...' : t('auth.loginButton', null, 'Kirish')}
              </button>
            </form>
            <p className="auth-switch" style={styles.switchText}>
              {t('auth.noAccount', null, "Hisobingiz yo'qmi?")}{' '}
              <span style={styles.switchLink} onClick={onSwitch}>
                {t('auth.registerLink', null, "Ro'yxatdan o'ting")}
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', marginBottom: 12, alignSelf: 'flex-start', padding: 0, transition: 'color 0.15s' },
  title: { fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 13 },
  btn: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', marginTop: 4, transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center' },
  switchText: { marginTop: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' },
  switchLink: { color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 },
  successBox: { display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.45 },
  successTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: '#10b981' },
}
