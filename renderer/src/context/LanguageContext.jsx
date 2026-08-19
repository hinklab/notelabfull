import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext({
  language: 'uz',
  setLanguage: () => {},
  t: (key, fallback) => key
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('language');
      if (saved && ['uz', 'ru', 'en'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed reading language from localStorage:', e);
    }
    return 'uz';
  });

  const setLanguage = (lang) => {
    if (!['uz', 'ru', 'en'].includes(lang)) return;
    setLanguageState(lang);
    try {
      localStorage.setItem('language', lang);
      document.documentElement.setAttribute('lang', lang);
    } catch (e) {
      console.warn('Failed saving language to localStorage:', e);
    }
  };

  useEffect(() => {
    try {
      document.documentElement.setAttribute('lang', language);
    } catch (e) {}
  }, [language]);

  /**
   * Helper function to get translation string by path (e.g. 'common.save', 'space.addToColumn')
   * Supports interpolations: t('common.itemsCount', { count: 5 })
   */
  const t = (path, params = null, fallback = '') => {
    if (!path) return '';
    const keys = path.split('.');
    let cur = translations[language];

    for (const k of keys) {
      if (cur && cur[k] !== undefined) {
        cur = cur[k];
      } else {
        cur = null;
        break;
      }
    }

    // Fallback to uz or en if missing
    if (cur === null || cur === undefined) {
      let fallbackCur = translations['uz'];
      for (const k of keys) {
        if (fallbackCur && fallbackCur[k] !== undefined) {
          fallbackCur = fallbackCur[k];
        } else {
          fallbackCur = null;
          break;
        }
      }
      cur = fallbackCur !== null && fallbackCur !== undefined ? fallbackCur : (fallback || path);
    }

    if (typeof cur === 'string' && params && typeof params === 'object') {
      let res = cur;
      Object.keys(params).forEach(pKey => {
        res = res.replace(new RegExp(`\\{${pKey}\\}`, 'g'), params[pKey]);
      });
      return res;
    }

    return cur !== null && cur !== undefined ? cur : (fallback || path);
  };

  const [movieTranslations, setMovieTranslations] = useState(() => {
    try {
      const saved = localStorage.getItem('notelab_movie_translations_ru');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save translation cache to localStorage on updates (debounced/pruned)
  const saveTranslationsToStorage = (updated) => {
    try {
      localStorage.setItem('notelab_movie_translations_ru', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed saving movie translations to storage:', e);
    }
  };

  /**
   * Batch prefetch translations for an array of movies
   */
  const prefetchMovieTranslations = async (movies) => {
    if (language !== 'ru' || !Array.isArray(movies) || movies.length === 0) return;
    if (!window.api || !window.api.getMovieTranslations) return;

    const missing = [];
    movies.forEach(m => {
      if (m && m.tmdb_id && !movieTranslations[m.tmdb_id]) {
        missing.push({ tmdb_id: m.tmdb_id, media_type: m.media_type || 'movie' });
      }
    });

    if (missing.length === 0) return;

    try {
      const res = await window.api.getMovieTranslations(missing, 'ru');
      if (res && Object.keys(res).length > 0) {
        setMovieTranslations(prev => {
          const next = { ...prev, ...res };
          saveTranslationsToStorage(next);
          return next;
        });
      }
    } catch (err) {
      console.warn('Error prefetching movie translations:', err);
    }
  };

  /**
   * Fetch single movie translation if needed
   */
  const fetchSingleMovieTranslation = async (tmdbId, mediaType) => {
    if (language !== 'ru' || !tmdbId || movieTranslations[tmdbId]) return;
    if (!window.api || !window.api.getMovieDetails) return;

    try {
      const res = await window.api.getMovieDetails(tmdbId, mediaType || 'movie', 'ru');
      if (res && res.title) {
        setMovieTranslations(prev => {
          const next = { ...prev, [tmdbId]: res };
          saveTranslationsToStorage(next);
          return next;
        });
      }
    } catch (err) {
      console.warn(`Error fetching translation for tmdb_id ${tmdbId}:`, err);
    }
  };

  /**
   * Get localized title for a movie/item
   */
  const getMovieTitle = (movie) => {
    if (!movie) return '';
    if (language === 'ru' && movie.tmdb_id && movieTranslations[movie.tmdb_id]?.title) {
      return movieTranslations[movie.tmdb_id].title;
    }
    return movie.title || movie.name || '';
  };

  /**
   * Get localized overview for a movie/item
   */
  const getMovieOverview = (movie) => {
    if (!movie) return '';
    if (language === 'ru' && movie.tmdb_id && movieTranslations[movie.tmdb_id]?.overview) {
      return movieTranslations[movie.tmdb_id].overview;
    }
    return movie.overview || movie.note || '';
  };

  /**
   * Get localized genre for a movie/item
   */
  const getMovieGenre = (movie) => {
    if (!movie) return '';
    if (language === 'ru' && movie.tmdb_id && movieTranslations[movie.tmdb_id]?.genre) {
      return movieTranslations[movie.tmdb_id].genre;
    }
    return movie.genre || '';
  };

  /**
   * Get localized director for a movie/item
   */
  const getMovieDirector = (movie) => {
    if (!movie) return '';
    if (language === 'ru' && movie.tmdb_id && movieTranslations[movie.tmdb_id]?.director) {
      return movieTranslations[movie.tmdb_id].director;
    }
    return movie.director || '';
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      tmdbLocale: language === 'ru' ? 'ru-RU' : 'en-US',
      movieTranslations,
      prefetchMovieTranslations,
      fetchSingleMovieTranslation,
      getMovieTitle,
      getMovieOverview,
      getMovieGenre,
      getMovieDirector
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
