import "server-only";

// Lightweight, deterministic-ish "AI" simulation used by the demo pipeline.
// Swap this out for a real LLM call (see /dashboard/integrations) when ready.

const FIRST_NAMES = [
  "Maria", "James", "Aisha", "Wei", "Sofia", "Daniel", "Priya", "Lucas",
  "Emma", "Noah", "Olivia", "Ethan", "Grace", "Miguel", "Chloe", "Ryan",
];
const LAST_NAMES = [
  "Reyes", "Carter", "Patel", "Nguyen", "Rossi", "Kim", "Johnson", "Alvarez",
  "Brown", "Davis", "Moore", "Chen", "Garcia", "Wilson", "Thompson", "Lee",
];

const JOBS = [
  "kitchen remodel", "roof replacement", "bathroom renovation", "new fence install",
  "deck build", "window replacement", "solar panel install", "HVAC replacement",
  "driveway paving", "siding replacement",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDemoLead() {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const phone = `(${100 + Math.floor(Math.random() * 800)}) 555-${String(
    Math.floor(Math.random() * 10000)
  ).padStart(4, "0")}`;
  const email = `${name.toLowerCase().replace(" ", ".")}@example.com`;
  const source = pick(["CRM", "AI_CHAT", "SMS", "WEBSITE"] as const);
  const job = pick(JOBS);
  return { name, phone, email, source, job };
}

export function generateInboundMessage(job: string) {
  return `Hi, I saw your ad and I'm interested in getting a quote for a ${job}. What's the next step?`;
}

export function generateAiReply(name: string, job: string) {
  const firstName = name.split(" ")[0];
  return `Hi ${firstName}! Thanks for reaching out about your ${job}. I can get you a free, no-obligation estimate — do you have a few minutes for a quick call today or tomorrow?`;
}

export function generateFollowUpInbound() {
  return pick([
    "Yes, that works. Give me a call.",
    "Sure, I'm free this afternoon.",
    "Sounds good, please call me.",
  ]);
}

export function generateCallSummary(job: string) {
  return pick([
    `Discussed scope of ${job}, homeowner is ready to move forward. Scheduled an on-site estimate.`,
    `Walked through pricing ranges for ${job}. Customer wants to compare one more quote but is very interested.`,
    `Confirmed timeline and budget for ${job}. Booking an in-person estimate this week.`,
  ]);
}

export function nextBusinessDayAt(hour: number, daysAhead = 1) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date;
}
