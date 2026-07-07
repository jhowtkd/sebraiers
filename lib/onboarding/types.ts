export type OnboardingRole = 'user' | 'admin';

export interface TourStep {
  /** CSS selector of the target element. Must be unique inside its tour. */
  selector: string;
  /** Popover title (1 line, ≤ 60 chars). */
  title: string;
  /** Popover body (2-3 lines, ≤ 240 chars). */
  body: string;
  /** Preferred popover position relative to the target. */
  side?: 'top' | 'bottom' | 'left' | 'right';
}
