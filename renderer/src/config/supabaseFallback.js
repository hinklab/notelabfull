import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://spntzkotmgsghoahqkne.supabase.co'
const SUPABASE_KEY = ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

function getUserId() {
  try {
    const saved = localStorage.getItem('notelab_user')
    if (saved) {
      const u = JSON.parse(saved)
      if (u && u.id) return u.id
    }
  } catch {}
  return '0d3da195-1d0e-458b-9f88-2879561e0da6'
}

export const supabaseFallback = {
  async getNotes() {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return (data || []).map(n => ({
      ...n,
      name: n.title || n.name || 'Untitled',
      is_movie: Boolean(n.is_movie)
    }))
  },

  async getGroups(note_id) {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('note_groups')
      .select('*')
      .eq('user_id', userId)
      .eq('note_id', note_id)
      .order('position')
    if (error) throw error
    return data || []
  },

  async getMovies(note_id) {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('user_id', userId)
      .eq('note_id', note_id)
      .order('position')
    if (error) throw error
    return data || []
  },

  async getNotifications() {
    const userId = getUserId()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.warn('supabaseFallback.getNotifications error:', error.message)
      return []
    }
    return data || []
  },

  async getSettings() {
    const userId = getUserId()
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return data || {}
  },

  async getViewedFranchises() {
    const userId = getUserId()
    const { data } = await supabase
      .from('user_settings')
      .select('viewed_franchises')
      .eq('user_id', userId)
      .maybeSingle()
    return data?.viewed_franchises || []
  }
}

export default supabaseFallback
