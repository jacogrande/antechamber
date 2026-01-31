import { useCallback } from 'react'

/**
 * Hook for triggering subtle success feedback
 *
 * Provides professional micro-interactions that complement toast notifications
 * without being distracting. Respects prefers-reduced-motion.
 */
export function useCelebration() {
  const celebrate = useCallback((type: 'pulse' | 'glow' = 'pulse') => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      return
    }

    // For now, celebrations are handled by toast animations
    // This hook is preserved for future subtle micro-interactions
    // like haptic feedback, sound cues, or CSS-based animations

    switch (type) {
      case 'pulse':
        // Could trigger a subtle pulse animation on a target element
        break
      case 'glow':
        // Could trigger a brief glow effect
        break
    }
  }, [])

  return { celebrate }
}
