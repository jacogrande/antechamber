import { useCallback } from 'react'
import confetti from 'canvas-confetti'

/**
 * Hook for triggering celebration animations
 *
 * Features:
 * - Confetti burst animation for major successes
 * - Respects prefers-reduced-motion media query
 * - Multiple celebration styles for different contexts
 */
export function useCelebration() {
  const celebrate = useCallback((type: 'confetti' | 'success' | 'subtle' = 'confetti') => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      return
    }

    switch (type) {
      case 'confetti':
        // Full confetti burst for major achievements
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FE5D34', '#14B8A6', '#F59E0B', '#A855F7'],
          disableForReducedMotion: true,
        })
        break

      case 'success':
        // Two-sided confetti for confirmations
        const end = Date.now() + 150 // Short duration

        const colors = ['#FE5D34', '#14B8A6']

        const frame = () => {
          confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
            disableForReducedMotion: true,
          })
          confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
            disableForReducedMotion: true,
          })

          if (Date.now() < end) {
            requestAnimationFrame(frame)
          }
        }
        frame()
        break

      case 'subtle':
        // Minimal confetti for small wins
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7, x: 0.5 },
          colors: ['#FE5D34', '#14B8A6'],
          disableForReducedMotion: true,
          scalar: 0.8,
        })
        break
    }
  }, [])

  return { celebrate }
}
