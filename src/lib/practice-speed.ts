// Stroke animation has two speeds: normal 0.5× and, with Preferences' "Slower stroke
// animation" switch on, 0.25×. Any other saved value (e.g. an old 1×) falls back to 0.5×.
export const SPEEDS = [0.25, 0.5];
export const DEFAULT_SPEED_INDEX = 1; // 0.5×
export const SLOW_SPEED = 0.25;

// "0.25×", "0.5×" — the label shown on each speed button.
export const speedLabel = (speed: number) => `${speed}×`;

// The speed Practice uses for a saved preference value.
export const strokeSpeed = (saved: number | undefined) => saved === SLOW_SPEED ? SLOW_SPEED : 0.5;
