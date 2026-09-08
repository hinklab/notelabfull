const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { readDB, getUserSettings, saveUserSettings } = require('../services/database');

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

function getSupabase() {
  try {
    return require('../services/supabase');
  } catch {
    return null;
  }
}

// 15 Curated Badges catalogue (5 universes x 3 tiers)
const BADGES_CATALOGUE = [
  // MCU
  {
    id: 'mcu_bronze',
    universe_key: 'mcu',
    universe_name: 'Marvel Cinematic Universe',
    tier: 'bronze',
    threshold: 25,
    title: "MCU: Qahramonlik Yo'li",
    title_en: 'MCU: Path of Heroes',
    description: "MCU koinotidagi kamida 25% film va seriallarni ko'rdingiz.",
    icon: '🥉'
  },
  {
    id: 'mcu_silver',
    universe_key: 'mcu',
    universe_name: 'Marvel Cinematic Universe',
    tier: 'silver',
    threshold: 60,
    title: 'MCU: Qasoskor',
    title_en: 'MCU: Avenger',
    description: "MCU koinotidagi 60% dan ortiq elementlarni ko'rib chiqdingiz.",
    icon: '🥈'
  },
  {
    id: 'mcu_gold',
    universe_key: 'mcu',
    universe_name: 'Marvel Cinematic Universe',
    tier: 'gold',
    threshold: 100,
    title: 'MCU: Cheksizlik Sohibi',
    title_en: 'MCU: Master of Infinity',
    description: "Tabriklaymiz! MCU koinotidagi barcha film va seriallarni to'liq ko'rib tugatdingiz!",
    icon: '🥇'
  },

  // DCEU
  {
    id: 'dceu_bronze',
    universe_key: 'dceu',
    universe_name: 'DC Extended Universe',
    tier: 'bronze',
    threshold: 25,
    title: 'DCEU: Adolat Boshlanishi',
    title_en: 'DCEU: Dawn of Justice',
    description: "DCEU olamidagi kamida 25% filmlarni ko'rib chiqdingiz.",
    icon: '🥉'
  },
  {
    id: 'dceu_silver',
    universe_key: 'dceu',
    universe_name: 'DC Extended Universe',
    tier: 'silver',
    threshold: 60,
    title: 'DCEU: Adolat Ligasi',
    title_en: 'DCEU: Justice League',
    description: "DCEU olamidagi 60% dan ortiq filmlarni ko'rib chiqdingiz.",
    icon: '🥈'
  },
  {
    id: 'dceu_gold',
    universe_key: 'dceu',
    universe_name: 'DC Extended Universe',
    tier: 'gold',
    threshold: 100,
    title: 'DCEU: Multikoinot Hukmdori',
    title_en: 'DCEU: Multiverse Master',
    description: "DCEU (2013–2023) franshizasidagi barcha filmlarni 100% to'liq ko'rib chiqdingiz!",
    icon: '🥇'
  },

  // Star Wars
  {
    id: 'star_wars_bronze',
    universe_key: 'star_wars',
    universe_name: 'Star Wars Universe',
    tier: 'bronze',
    threshold: 25,
    title: 'Star Wars: Padavan',
    title_en: 'Star Wars: Padawan',
    description: "Yulduzlar Jangi sagasining kamida 25% filmlarini ko'rdingiz.",
    icon: '🥉'
  },
  {
    id: 'star_wars_silver',
    universe_key: 'star_wars',
    universe_name: 'Star Wars Universe',
    tier: 'silver',
    threshold: 60,
    title: 'Star Wars: Jedi Ritsari',
    title_en: 'Star Wars: Jedi Knight',
    description: "Yulduzlar Jangi olamining 60% dan ortig'ini zabt etdingiz.",
    icon: '🥈'
  },
  {
    id: 'star_wars_gold',
    universe_key: 'star_wars',
    universe_name: 'Star Wars Universe',
    tier: 'gold',
    threshold: 100,
    title: 'Star Wars: Kuch Ustasi',
    title_en: 'Star Wars: Force Master',
    description: "Kuch siz bilan! Barcha Star Wars kanon filmlarini 100% to'liq ko'rdingiz!",
    icon: '🥇'
  },

  // Kurtlar Vadisi
  {
    id: 'kurtlar_vadisi_bronze',
    universe_key: 'kurtlar_vadisi',
    universe_name: 'Kurtlar Vadisi Universe',
    tier: 'bronze',
    threshold: 25,
    title: "Kurtlar Vadisi: Bo'ri",
    title_en: 'Valley of the Wolves: Wolf',
    description: "Kurtlar Vadisi dostonining 25% qismlarini ko'rib chiqdingiz.",
    icon: '🥉'
  },
  {
    id: 'kurtlar_vadisi_silver',
    universe_key: 'kurtlar_vadisi',
    universe_name: 'Kurtlar Vadisi Universe',
    tier: 'silver',
    threshold: 60,
    title: "Kurtlar Vadisi: Kengash A'zosi",
    title_en: 'Valley of the Wolves: Council Member',
    description: "Kurtlar Vadisi olamining 60% dan ko'prog'ini tomosha qildingiz.",
    icon: '🥈'
  },
  {
    id: 'kurtlar_vadisi_gold',
    universe_key: 'kurtlar_vadisi',
    universe_name: 'Kurtlar Vadisi Universe',
    tier: 'gold',
    threshold: 100,
    title: 'Kurtlar Vadisi: Baron',
    title_en: 'Valley of the Wolves: The Baron',
    description: "Bu shunchaki kino emas, bu hayot! Barcha serial va filmlarini 100% to'liq ko'rdingiz!",
    icon: '🥇'
  },

  // DCU
  {
    id: 'dcu_bronze',
    universe_key: 'dcu',
    universe_name: 'DC Universe (Gods and Monsters)',
    tier: 'bronze',
    threshold: 25,
    title: 'DCU: Xudolar va Maxluqlar',
    title_en: 'DCU: Gods and Monsters',
    description: "Yangi James Gunn DCU olamidagi dastlabki loyihalarni ko'rib chiqdingiz.",
    icon: '🥉'
  },
  {
    id: 'dcu_silver',
    universe_key: 'dcu',
    universe_name: 'DC Universe (Gods and Monsters)',
    tier: 'silver',
    threshold: 60,
    title: 'DCU: Yangi Davr',
    title_en: 'DCU: New Chapter',
    description: "DCU olamidagi loyihalarning 60% dan ortig'ini tomosha qildingiz.",
    icon: '🥈'
  },
  {
    id: 'dcu_gold',
    universe_key: 'dcu',
    universe_name: 'DC Universe (Gods and Monsters)',
    tier: 'gold',
    threshold: 100,
    title: 'DCU: Haqiqat va Adolat',
    title_en: 'DCU: Truth and Justice',
    description: "Yangi DCU olamidagi barcha loyihalarni 100% to'liq ko'rib bo'ldingiz!",
    icon: '🥇'
  }
];

function loadFranchiseUniverses() {
  try {
    const filePath = path.join(__dirname, '../../data/franchise-universes.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed reading franchise-universes.json:', e.message);
  }
  return {};
}

async function getAllUserMovies(userId) {
  const db = readDB();
  const localMovies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);
  const supabase = getSupabase();
  if (!supabase) return localMovies;

  try {
    const { data: cloudMovies } = await supabase.from('movies').select('*').eq('user_id', userId);
    if (Array.isArray(cloudMovies) && cloudMovies.length > 0) {
      const mergedMap = new Map();
      localMovies.forEach(m => mergedMap.set(String(m.id), m));
      cloudMovies.forEach(m => mergedMap.set(String(m.id), { ...mergedMap.get(String(m.id)), ...m }));
      return Array.from(mergedMap.values());
    }
  } catch (e) {}

  return localMovies;
}

// Fetch stored unlocked badges from Supabase or local storage
async function getStoredUnlockedBadges(userId) {
  const supabase = getSupabase();
  let supabaseBadges = [];

  if (supabase && userId) {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('id', `gamification_${userId}`)
        .maybeSingle();

      if (data && data.settings && Array.isArray(data.settings.unlocked_badges)) {
        supabaseBadges = data.settings.unlocked_badges;
      }
    } catch (err) {
      console.warn('Failed to fetch gamification badges from Supabase:', err.message);
    }
  }

  const db = readDB();
  const settings = getUserSettings(userId, db);
  const localBadges = Array.isArray(settings.unlocked_badges) ? settings.unlocked_badges : [];

  // Deduplicate and merge by badge id
  const map = new Map();
  [...localBadges, ...supabaseBadges].forEach(b => {
    if (b && b.id) {
      map.set(b.id, b);
    }
  });

  return Array.from(map.values());
}

// Save unlocked badges to Supabase and local storage
async function saveStoredUnlockedBadges(userId, badges) {
  const db = readDB();
  saveUserSettings(userId, { unlocked_badges: badges }, db);

  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      await supabase.from('user_settings').upsert({
        id: `gamification_${userId}`,
        user_id: userId,
        settings: { unlocked_badges: badges },
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('Failed to persist gamification badges to Supabase:', err.message);
    }
  }
}

// Calculate progress for the 5 curated universes and evaluate badge unlocks
async function computeGamificationProgress(userId) {
  const userMovies = await getAllUserMovies(userId);
  const universes = loadFranchiseUniverses();

  const curatedKeys = ['mcu', 'dceu', 'star_wars', 'kurtlar_vadisi', 'dcu'];
  const progressMap = {};

  curatedKeys.forEach(uKey => {
    const uCfg = universes[uKey] || {};
    const items = uCfg.chronological_order || [];
    const total = items.length;
    let inBoardCount = 0;
    let doneCount = 0;

    items.forEach(item => {
      const rawId = typeof item === 'object' ? item.id : item;
      const isStringId = typeof rawId === 'string' && rawId.includes('_s');
      const baseTmdbId = (typeof item === 'object' && item.tmdb_id) ? item.tmdb_id : (isStringId ? parseInt(rawId.split('_s')[0], 10) : Number(rawId));
      const seasonNumber = (typeof item === 'object' && item.season_number) ? item.season_number : (isStringId ? parseInt(rawId.split('_s')[1], 10) : null);

      const match = userMovies.find(m => {
        if (Number(m.tmdb_id) !== baseTmdbId) return false;
        if (seasonNumber) {
          const titleMatch = m.title && m.title.match(/(?:—|-|\b)\s*(?:Season|mavsum|sezon|s)\s*(\d+)\b/i);
          if (titleMatch) {
            return parseInt(titleMatch[1], 10) === seasonNumber;
          }
          return true;
        }
        return true;
      });

      if (match) {
        inBoardCount++;
        if (match.section === 'done') {
          doneCount++;
        }
      }
    });

    const percent = total > 0 ? Math.min(100, Math.round((doneCount / total) * 100)) : 0;

    let highestBadge = null;
    if (percent === 100) highestBadge = 'gold';
    else if (percent >= 60) highestBadge = 'silver';
    else if (percent >= 25) highestBadge = 'bronze';

    progressMap[uKey] = {
      key: uKey,
      name: uCfg.name || uKey,
      total,
      in_board: inBoardCount,
      done: doneCount,
      percent,
      highest_badge: highestBadge
    };
  });

  // Load existing badges
  const existingBadges = await getStoredUnlockedBadges(userId);
  const existingIds = new Set(existingBadges.map(b => b.id));
  const newlyUnlocked = [];

  // Check unlocks against catalogue
  BADGES_CATALOGUE.forEach(badgeDef => {
    const universeProgress = progressMap[badgeDef.universe_key];
    if (!universeProgress) return;

    if (universeProgress.percent >= badgeDef.threshold) {
      if (!existingIds.has(badgeDef.id)) {
        const unlockedBadge = {
          id: badgeDef.id,
          universe_key: badgeDef.universe_key,
          universe_name: badgeDef.universe_name,
          tier: badgeDef.tier,
          title: badgeDef.title,
          description: badgeDef.description,
          icon: badgeDef.icon,
          threshold: badgeDef.threshold,
          percent_achieved: universeProgress.percent,
          unlocked_at: new Date().toISOString()
        };
        existingBadges.push(unlockedBadge);
        existingIds.add(badgeDef.id);
        newlyUnlocked.push(unlockedBadge);
      }
    }
  });

  // Save if new badges were unlocked
  if (newlyUnlocked.length > 0) {
    await saveStoredUnlockedBadges(userId, existingBadges);
  }

  return {
    universes: progressMap,
    unlocked_badges: existingBadges,
    newly_unlocked: newlyUnlocked
  };
}

// GET /api/gamification/progress
router.get('/progress', async (req, res) => {
  try {
    const userId = req.userId || DEFAULT_USER_ID;
    const result = await computeGamificationProgress(userId);
    res.json(result);
  } catch (err) {
    console.error('Gamification progress error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gamification/badges - Complete catalogue with unlocked state
router.get('/badges', async (req, res) => {
  try {
    const userId = req.userId || DEFAULT_USER_ID;
    const progressResult = await computeGamificationProgress(userId);
    const unlockedMap = new Map(progressResult.unlocked_badges.map(b => [b.id, b]));

    const fullCatalogue = BADGES_CATALOGUE.map(badge => {
      const unlockedInfo = unlockedMap.get(badge.id);
      const universeProgress = progressResult.universes[badge.universe_key] || { percent: 0, done: 0, total: 0 };
      return {
        ...badge,
        unlocked: !!unlockedInfo,
        unlocked_at: unlockedInfo ? unlockedInfo.unlocked_at : null,
        current_percent: universeProgress.percent,
        needed_percent: badge.threshold
      };
    });

    res.json({
      badges: fullCatalogue,
      universes: progressResult.universes,
      total_badges: BADGES_CATALOGUE.length,
      unlocked_count: progressResult.unlocked_badges.length,
      unlocked_badges: progressResult.unlocked_badges,
      newly_unlocked: progressResult.newly_unlocked
    });
  } catch (err) {
    console.error('Gamification badges error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
