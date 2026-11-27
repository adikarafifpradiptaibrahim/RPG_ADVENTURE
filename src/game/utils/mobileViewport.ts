import { useState, useEffect } from 'react';

export interface MobileViewportState {
  isTouchDevice: boolean;
  isMobileUi: boolean;
  isMobileLandscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export function isTouchCapableDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints ?? 0) > 0 ||
      Boolean(window.matchMedia?.('(pointer: coarse)')?.matches)
    );
  } catch {
    return false;
  }
}

export function getMobileViewportSnapshot(): MobileViewportState {
  if (typeof window === 'undefined') {
    return {
      isTouchDevice: false,
      isMobileUi: false,
      isMobileLandscape: false,
      viewportWidth: 1280,
      viewportHeight: 720,
    };
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouch = isTouchCapableDevice();
  const isLandscape = w > h;
  const isShortScreen = h <= 580;

  // Mobile landscape UI applies for short landscape screens (<= 580px tall)
  // or touch devices under compact dimensions, while preserving Desktop (min-height >= 600px & non-touch).
  const isMobileLandscape = isLandscape && (h <= 580 || (isTouch && w <= 1024 && h <= 620));
  const isMobileUi =
    h <= 560 ||
    isMobileLandscape ||
    w <= 767 ||
    (isTouch && w <= 1024 && (h <= 620 || isShortScreen));

  return {
    isTouchDevice: isTouch,
    isMobileUi,
    isMobileLandscape,
    viewportWidth: w,
    viewportHeight: h,
  };
}

export function useMobileViewport(): MobileViewportState {
  const [state, setState] = useState<MobileViewportState>(() => getMobileViewportSnapshot());

  useEffect(() => {
    const update = () => {
      const next = getMobileViewportSnapshot();
      setState((prev) =>
        prev.isTouchDevice === next.isTouchDevice &&
        prev.isMobileUi === next.isMobileUi &&
        prev.isMobileLandscape === next.isMobileLandscape &&
        prev.viewportWidth === next.viewportWidth &&
        prev.viewportHeight === next.viewportHeight
          ? prev
          : next
      );
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return state;
}
