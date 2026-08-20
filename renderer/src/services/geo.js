// Geolocation and Country Detection Service for Notelab

const GEO_STORAGE_KEY = 'notelab_user_geo';
const GEO_PROMPT_DISMISSED_KEY = 'notelab_geo_prompt_dismissed';

export const DEFAULT_GEO = {
  countryCode: 'UZ',
  countryName: 'Uzbekistan',
  city: 'Tashkent',
  lat: 41.311081,
  lon: 69.240562,
  isDefault: true
};

export function getStoredUserLocation() {
  try {
    const raw = localStorage.getItem(GEO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.countryCode) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_GEO;
}

export function isGeoPromptDismissed() {
  try {
    return localStorage.getItem(GEO_PROMPT_DISMISSED_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function setGeoPromptDismissed(dismissed = true) {
  try {
    localStorage.setItem(GEO_PROMPT_DISMISSED_KEY, dismissed ? 'true' : 'false');
  } catch (e) {}
}

export function storeUserLocation(geoData) {
  try {
    const data = {
      countryCode: (geoData.countryCode || 'UZ').toUpperCase(),
      countryName: geoData.countryName || (geoData.countryCode === 'UZ' ? 'Uzbekistan' : geoData.countryCode),
      city: geoData.city || 'Tashkent',
      lat: Number(geoData.lat) || DEFAULT_GEO.lat,
      lon: Number(geoData.lon) || DEFAULT_GEO.lon,
      method: geoData.method || 'ip',
      timestamp: Date.now(),
      isDefault: false
    };
    localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('notelab_geo_changed', { detail: data }));
    return data;
  } catch (e) {
    return DEFAULT_GEO;
  }
}

export async function detectLocationByIP() {
  try {
    const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3500) });
    if (r.ok) {
      const d = await r.json();
      if (d.country_code) {
        return storeUserLocation({
          countryCode: d.country_code,
          countryName: d.country_name || d.country,
          city: d.city || '',
          lat: d.latitude || DEFAULT_GEO.lat,
          lon: d.longitude || DEFAULT_GEO.lon,
          method: 'ip'
        });
      }
    }
  } catch (e) {}

  try {
    const r2 = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3500) });
    if (r2.ok) {
      const d2 = await r2.json();
      if (d2.success && d2.country_code) {
        return storeUserLocation({
          countryCode: d2.country_code,
          countryName: d2.country || d2.country_code,
          city: d2.city || '',
          lat: d2.latitude || DEFAULT_GEO.lat,
          lon: d2.longitude || DEFAULT_GEO.lon,
          method: 'ip'
        });
      }
    }
  } catch (e) {}

  return getStoredUserLocation();
}

export async function requestBrowserGeolocation() {
  if (!navigator.geolocation) {
    return detectLocationByIP();
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        let countryCode = 'UZ';
        let countryName = 'Uzbekistan';
        let city = '';

        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            signal: AbortSignal.timeout(4000),
            headers: { 'Accept-Language': 'en' }
          });
          if (r.ok) {
            const data = await r.json();
            const addr = data.address || {};
            countryCode = (addr.country_code || 'UZ').toUpperCase();
            countryName = addr.country || countryName;
            city = addr.city || addr.town || addr.village || addr.state || '';
          }
        } catch (e) {
          const ipData = await detectLocationByIP();
          countryCode = ipData.countryCode || 'UZ';
          countryName = ipData.countryName || 'Uzbekistan';
          city = ipData.city || '';
        }

        const res = storeUserLocation({
          countryCode,
          countryName,
          city,
          lat,
          lon,
          method: 'gps'
        });
        setGeoPromptDismissed(true);
        resolve(res);
      },
      async (err) => {
        console.warn('Browser geolocation denied or timed out, using IP:', err?.message);
        setGeoPromptDismissed(true);
        const ipRes = await detectLocationByIP();
        resolve(ipRes);
      },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 1000 * 60 * 60 }
    );
  });
}