// The three animation speeds offered beside the writing practice, slowest to fastest.
// 0.5× (index 1) is the default, so a first visit reads the strokes without waiting.
export const SPEEDS = [0.25, 0.5, 1];
export const DEFAULT_SPEED_INDEX = 1; // 0.5×

// "0.25×", "0.5×", "1×" — the label shown on each speed button.
export const speedLabel = (speed: number) => `${speed}×`;
