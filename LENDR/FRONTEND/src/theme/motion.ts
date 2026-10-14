/**
 * LENDR Central Motion & Interaction Tokens
 *
 * Design System Specifications:
 * - Palette: Forest Green (#114b3f), Terracotta (#d96543), Cream (#fbf9f5)
 * - Durations:
 *     - Fast feedback: 120ms - 150ms
 *     - Standard transitions: 200ms - 240ms
 *     - Panels & Drawers: 260ms - 300ms
 * - Easing:
 *     - Decelerate (Entrance / Hover): cubic-bezier(0.16, 1, 0.3, 1)
 *     - Accelerate (Exit): cubic-bezier(0.3, 0, 0.8, 0.15)
 *     - Symmetrical: cubic-bezier(0.4, 0, 0.2, 1)
 *
 * Respects prefers-reduced-motion across all utilities.
 */

export const motionTokens = {
  duration: {
    instant: 0,
    fast: 0.14,      // 140ms: buttons, toggles, badges
    standard: 0.22,  // 220ms: screen switches, filters, cards
    panel: 0.28,     // 280ms: modals, drawers, popovers
    slow: 0.36,      // 360ms: image zoom, expanders
  },
  easing: {
    standard: [0.16, 1, 0.3, 1] as const,
    enter: [0.05, 0.7, 0.1, 1] as const,
    exit: [0.3, 0, 0.8, 0.15] as const,
    springSoft: { type: 'spring', damping: 25, stiffness: 350 } as const,
    springBrisk: { type: 'spring', damping: 28, stiffness: 420 } as const,
  },
};

/**
 * Screen transition animation variants for smooth page changes without layout lag
 */
export const screenTransitionVariants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.standard,
      ease: motionTokens.easing.standard,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.exit,
    },
  },
};

/**
 * Modal backdrop and card spring variants
 */
export const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: motionTokens.duration.fast, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: motionTokens.duration.fast, ease: 'easeIn' },
  },
};

export const modalCardVariants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.panel,
      ease: motionTokens.easing.standard,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 4,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.exit,
    },
  },
};

/**
 * Drawer slide-in from right edge variants
 */
export const drawerSlideVariants = {
  hidden: {
    x: '100%',
    opacity: 0.8,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: motionTokens.duration.panel,
      ease: motionTokens.easing.standard,
    },
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.exit,
    },
  },
};

/**
 * Interactive button tap & hover micro-interactions
 */
export const buttonInteractiveProps = {
  whileHover: {
    scale: 1.015,
    transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.standard },
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.standard },
  },
};

/**
 * Check if the user environment has requested reduced motion
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
