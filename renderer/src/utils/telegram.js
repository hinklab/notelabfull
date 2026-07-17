// Telegram Mini App integration
// https://core.telegram.org/bots/webapps

let tg = null;
let webApp = null;

// Check if running in Telegram WebApp
export function isTelegramWebApp() {
  return window.Telegram?.WebApp != null;
}

// Initialize Telegram WebApp
export function initTelegram() {
  if (!isTelegramWebApp()) {
    return null;
  }

  webApp = window.Telegram.WebApp;
  tg = window.Telegram;

  // Configure WebApp
  webApp.ready();
  webApp.expand();

  // Set header color to match app
  webApp.setHeaderColor('#0b0b0b');
  webApp.setBackgroundColor('#0b0b0b');

  console.log('Telegram WebApp initialized:', {
    version: webApp.version,
    platform: webApp.platform,
    colorScheme: webApp.colorScheme,
  });

  return webApp;
}

// Get Telegram user data
export function getTelegramUser() {
  if (!webApp) return null;
  
  const initData = webApp.initDataUnsafe;
  return {
    id: initData.user?.id,
    username: initData.user?.username,
    firstName: initData.user?.first_name,
    lastName: initData.user?.last_name,
    languageCode: initData.user?.language_code,
    // Auth data for backend verification
    authDate: initData.auth_date,
    hash: initData.hash,
  };
}

// Get init data for backend auth
export function getInitData() {
  return webApp?.initData || null;
}

// Show main button (Telegram native button)
export function showMainButton(text, onClick, color = '#7c3aed') {
  if (!webApp?.MainButton) return;

  webApp.MainButton.setText(text);
  webApp.MainButton.setParams({ color });
  webApp.MainButton.onClick(onClick);
  webApp.MainButton.show();
}

export function hideMainButton() {
  webApp?.MainButton?.hide();
}

// Show back button
export function showBackButton(onClick) {
  if (!webApp?.BackButton) return;

  webApp.BackButton.onClick(onClick);
  webApp.BackButton.show();
}

export function hideBackButton() {
  webApp?.BackButton?.hide();
}

// Show alert using Telegram UI
export function showAlert(message) {
  webApp?.showAlert?.(message);
}

// Show confirm dialog
export function showConfirm(message, callback) {
  webApp?.showConfirm?.(message, callback);
}

// Close WebApp
export function closeWebApp() {
  webApp?.close?.();
}

// Haptic feedback
export function hapticFeedback(type = 'light') {
  const feedback = webApp?.HapticFeedback;
  if (!feedback) return;

  switch (type) {
    case 'light':
      feedback.impactOccurred('light');
      break;
    case 'medium':
      feedback.impactOccurred('medium');
      break;
    case 'heavy':
      feedback.impactOccurred('heavy');
      break;
    case 'success':
      feedback.notificationOccurred('success');
      break;
    case 'error':
      feedback.notificationOccurred('error');
      break;
    default:
      feedback.impactOccurred('light');
  }
}

export { tg, webApp };
