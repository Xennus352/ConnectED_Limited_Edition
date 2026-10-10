/**
 * Animation utilities for the Rider Management page and other driver interfaces.
 * Uses CSS transitions and GSAP for smooth animations.
 */

/**
 * Fade-in animation with staggered children
 * @param elements - Array of refs to animate
 * @param delay - Delay between each element in ms
 */
export const fadeInStagger = (
  elements: React.RefObject<HTMLElement>[],
  delay = 100
) => {
  if (typeof window === "undefined") return;

  elements.forEach((el, index) => {
    const element = el.current;
    if (!element) return;
    setTimeout(() => {
      element.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      element.style.opacity = "1";
      element.style.transform = "translateY(0)";
    }, index * delay);
  });
};

/**
 * Pulse animation for notification badges
 * @param element - Ref to the element to animate
 */
export const pulseBadge = (element: React.RefObject<HTMLElement>) => {
  if (typeof window === "undefined") return;

  if (!element.current) return;

  element.current.style.animation = "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite";
};

/**
 * Slide-in from right animation
 * @param element - Ref to the element to animate
 */
export const slideInRight = (element: React.RefObject<HTMLElement>) => {
  if (typeof window === "undefined") return;

  if (!element.current) return;

  element.current.style.transition = "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
  element.current.style.transform = "translateX(0)";
  element.current.style.opacity = "1";
};

/**
 * Check if element is in viewport
 * @param element - Ref to the element to check
 * @returns boolean
 */
export const isInViewport = (element: React.RefObject<HTMLElement>) => {
  if (typeof window === "undefined") return false;

  if (!element.current) return false;

  const rect = element.current.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Generate a random color for rider avatars
 * @returns CSS color string
 */
export const generateAvatarColor = (): string => {
  const colors = [
    "bg-primary/20",
    "bg-secondary/20",
    "bg-success/20",
    "bg-info/20",
    "bg-warning/20",
    "bg-error/20",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Debounce function for resize/Scroll handlers
 * @param func - Function to debounce
 * @param wait - Wait time in ms
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Animation constants for consistent usage
 */
export const ANIMATION = {
  FADE_DURATION: 300,
  SLIDE_DURATION: 400,
  STAGGER_DELAY: 100,
  PULSE_DURATION: 2000,
  BOUNCE_DURATION: 500,
} as const;
