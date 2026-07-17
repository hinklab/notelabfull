import { useEffect, useState, useCallback } from 'react';
import {
  initTelegram,
  isTelegramWebApp,
  getTelegramUser,
  showMainButton,
  hideMainButton,
  showBackButton,
  hideBackButton,
  hapticFeedback,
  closeWebApp,
} from '../utils/telegram';

export function useTelegram() {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const webApp = initTelegram();
    
    if (webApp) {
      setIsInTelegram(true);
      setUser(getTelegramUser());
      setIsReady(true);
      
      // Haptic feedback on load
      hapticFeedback('light');
    }
  }, []);

  const setMainButton = useCallback((text, onClick, color) => {
    if (isInTelegram) {
      showMainButton(text, onClick, color);
    }
  }, [isInTelegram]);

  const removeMainButton = useCallback(() => {
    if (isInTelegram) {
      hideMainButton();
    }
  }, [isInTelegram]);

  const setBackButton = useCallback((onClick) => {
    if (isInTelegram) {
      showBackButton(onClick);
    }
  }, [isInTelegram]);

  const removeBackButton = useCallback(() => {
    if (isInTelegram) {
      hideBackButton();
    }
  }, [isInTelegram]);

  const vibrate = useCallback((type = 'light') => {
    if (isInTelegram) {
      hapticFeedback(type);
    }
  }, [isInTelegram]);

  const close = useCallback(() => {
    if (isInTelegram) {
      closeWebApp();
    }
  }, [isInTelegram]);

  return {
    isInTelegram,
    isReady,
    user,
    setMainButton,
    removeMainButton,
    setBackButton,
    removeBackButton,
    vibrate,
    close,
  };
}
