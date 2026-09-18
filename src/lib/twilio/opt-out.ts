/**
 * STOP/START keyword handling per standard US carrier/TCPA conventions.
 * Twilio's own "Advanced Opt-Out" feature handles this at the carrier level
 * for some number types, but that's not something this app can rely on
 * existing or being configured correctly for every account — so it's
 * enforced here too, independent of Twilio's own behavior.
 */

const STOP_KEYWORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];
const START_KEYWORDS = ["start", "yes", "unstop"];

function normalize(body: string): string {
  return body.trim().toLowerCase().replace(/[.!?]+$/, "");
}

export function isStopKeyword(body: string): boolean {
  return STOP_KEYWORDS.includes(normalize(body));
}

export function isStartKeyword(body: string): boolean {
  return START_KEYWORDS.includes(normalize(body));
}
