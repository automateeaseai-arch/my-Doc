// Simulated reading history for the watch simulator (so early warning has something to learn
// from on day one), including demo stories: sugar rising over 5 days, blood pressure creeping up.
// Each person's pattern has a daily rhythm: sugar higher after meals, blood pressure higher in the morning.
const DAY = 86400000;
const TIMES = [7.5, 13.5, 18.5, 21.5]; // hours of the day readings are taken
const rnd = (a, b) => a + Math.random() * (b - a);
const noise = (s) => (Math.random() + Math.random() + Math.random() - 1.5) * s;

// In a story every reading stays inside the normal range (up to 138), so the warning
// clearly comes before any "high" alert would.
function value(k, hour, story, daysAgo) {
  const r = raw(k, hour, story, daysAgo);
  return story === k ? { ...r, v: Math.min(138, r.v) } : r;
}
function raw(k, hour, story, daysAgo) {
  // demo stories start 5 days ago and grow each day
  const grow = story && daysAgo <= 4 ? 5 - daysAgo : 0;
  if (k === 'sugar') { const meal = hour > 12 && hour < 20 ? 22 : 0; return { v: Math.round(102 + meal + noise(10) + (story === 'sugar' ? grow * 2.8 : 0)) }; }
  if (k === 'bp') { const s = Math.round((hour < 11 ? 128 : 121) + noise(6) + (story === 'bp' ? grow * 2.3 : 0)); return { v: s, v2: Math.round(s * rnd(0.62, 0.67)) }; }
  if (k === 'hr') return { v: Math.round(72 + (hour < 11 ? 4 : 0) + noise(5)) };
  return { v: Math.round(97 + noise(1.5)) };
}

// readings for the last `days` days (not today's future times), for the given metrics
export function makeHistory(metrics, { days = 13, story = null, now = Date.now() } = {}) {
  const out = [];
  for (let d = days; d >= 0; d--) {
    const base = new Date(now - d * DAY); base.setMinutes(0, 0, 0);
    for (const h of TIMES) {
      const at = new Date(base).setHours(Math.floor(h), (h % 1) * 60 + Math.floor(rnd(0, 20)));
      if (at > now) continue;
      for (const k of metrics) out.push({ k, ...value(k, h, story, d), at });
    }
  }
  return out;
}
