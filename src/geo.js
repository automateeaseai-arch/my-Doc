// Location helpers shared by the phone and the watch simulator. Free services only:
// OpenStreetMap map tiles, routes from the OSM routing servers (OSRM), street names
// from Nominatim. All are used lightly and the app keeps working if they are unreachable.

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
// metres between two { lat, lng }
export function distance(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// compass direction from a to b, in words
export function direction(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];
}
export const metres = (m) => (m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km');
export const walkMinutes = (m) => Math.max(1, Math.round(m / 80)); // about 4.8 km/h
// a point `m` metres from p in direction `deg`
export function offset(p, m, deg) {
  const d = m / R, b = rad(deg), la = rad(p.lat), lo = rad(p.lng);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: (la2 * 180) / Math.PI, lng: (lo2 * 180) / Math.PI };
}

// Walking route along real streets: { points: [{lat,lng}], metres, minutes } or null.
export async function walkingRoute(from, to) {
  const pair = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  for (const url of [
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${pair}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/foot/${pair}?overview=full&geometries=geojson`
  ]) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(url, { signal: ctl.signal });
      clearTimeout(t);
      const j = await r.json(), route = j.routes && j.routes[0];
      if (route) return { points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })), metres: route.distance, minutes: Math.round(route.duration / 60) };
    } catch { /* try the next server */ }
  }
  return null;
}

// Street address for a point: { address, short } or null. Nominatim first, then Photon.
export async function streetName(p) {
  return (await nominatim(p)) || (await photon(p));
}
async function photon(p) {
  try {
    const j = await (await fetch(`https://photon.komoot.io/reverse?lat=${p.lat}&lon=${p.lng}&lang=en`)).json();
    const a = (j.features && j.features[0] && j.features[0].properties) || {};
    const road = [a.housenumber, a.street || a.name].filter(Boolean).join(' ');
    const area = a.district || a.locality || a.city || '';
    if (!road && !area) return null;
    return { address: [road, area, a.city !== area ? a.city : ''].filter(Boolean).join(', '), short: [road || 'Near ' + area, road ? area : ''].filter(Boolean).join(', ') };
  } catch { return null; }
}
async function nominatim(p) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
    const j = await r.json(), a = j.address || {};
    const road = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(' ');
    const area = a.suburb || a.neighbourhood || a.city_district || a.town || a.city || '';
    if (!road && !area) return null;
    return { address: [road, area, a.city || a.state].filter(Boolean).join(', '), short: [road || 'Near ' + area, road ? area : ''].filter(Boolean).join(', ') };
  } catch { return null; }
}

// Open turn-by-turn directions in the phone's maps app (Google Maps works on Android and iPhone).
export const navigateUrl = (to, mode = 'walking') => `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=${mode}`;
