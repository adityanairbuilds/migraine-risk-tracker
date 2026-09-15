// pulls weather from open-meteo (free, no api key) and turns it into a
// risk score. not a real medical thing, just a point system, see README

export interface WeatherFeatures {
  pressureDelta: number;
  humidity: number;
  tempSwing: number;
}

export interface RiskResult {
  score: number;
  level: "Low" | "Medium" | "High";
  factors: string[];
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
}

export async function geocodeCity(query: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    name: `${r.name}, ${r.admin1 || r.country}`,
    lat: r.latitude,
    lon: r.longitude,
  };
}

export interface HourlyData {
  time: string[];
  pressure: number[];
  humidity: number[];
  temp: number[];
}

export async function fetchHourly(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=pressure_msl,relative_humidity_2m,temperature_2m&past_days=2&forecast_days=2&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    time: data.hourly.time,
    pressure: data.hourly.pressure_msl,
    humidity: data.hourly.relative_humidity_2m,
    temp: data.hourly.temperature_2m,
  };
}

export function closestIndex(times: string[], target: Date): number {
  let best = 0;
  let bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  });
  return best;
}

function getFeaturesFromWindow(h: HourlyData, startIdx: number, endIdx: number) {
  const pressureDelta = +(h.pressure[startIdx] - h.pressure[endIdx]).toFixed(1);
  const humidity = h.humidity[endIdx];
  const window = h.temp.slice(startIdx, endIdx + 1);
  const tempSwing = +(Math.max(...window) - Math.min(...window)).toFixed(1);
  return { pressureDelta, humidity, tempSwing };
}

// for logging what actually happened today
export async function fetchTodaysActualFeatures(lat: number, lon: number) {
  const h = await fetchHourly(lat, lon);
  const nowIdx = closestIndex(h.time, new Date());
  const past24Idx = Math.max(0, nowIdx - 24);
  return getFeaturesFromWindow(h, past24Idx, nowIdx);
}

// for the risk alert (next 24 hrs)
export async function fetchNext24hForecastFeatures(lat: number, lon: number) {
  const h = await fetchHourly(lat, lon);
  const nowIdx = closestIndex(h.time, new Date());
  const futureIdx = Math.min(h.time.length - 1, nowIdx + 24);
  return getFeaturesFromWindow(h, nowIdx, futureIdx);
}

// for backfilling a past date
export async function fetchHistoricalFeatures(lat: number, lon: number, dateStr: string) {
  const start = new Date(dateStr);
  const prev = new Date(start);
  prev.setDate(prev.getDate() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${fmt(prev)}&end_date=${fmt(start)}` +
    `&hourly=pressure_msl,relative_humidity_2m,temperature_2m&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  const h: HourlyData = {
    time: data.hourly.time,
    pressure: data.hourly.pressure_msl,
    humidity: data.hourly.relative_humidity_2m,
    temp: data.hourly.temperature_2m,
  };

  let endIdx = h.time.lastIndexOf(`${dateStr}T23:00`);
  if (endIdx === -1) endIdx = h.time.length - 1;
  const startIdx = Math.max(0, endIdx - 24);
  return getFeaturesFromWindow(h, startIdx, endIdx);
}

export function scoreRisk(f: WeatherFeatures): RiskResult {
  let score = 0;
  const factors: string[] = [];

  if (f.pressureDelta >= 6) {
    score += 3;
    factors.push(`Rapid pressure drop: ${f.pressureDelta} hPa (+3)`);
  } else if (f.pressureDelta >= 3) {
    score += 2;
    factors.push(`Moderate pressure drop: ${f.pressureDelta} hPa (+2)`);
  } else if (f.pressureDelta >= 1.5) {
    score += 1;
    factors.push(`Slight pressure drop: ${f.pressureDelta} hPa (+1)`);
  } else {
    factors.push(`Pressure change: ${f.pressureDelta} hPa (0)`);
  }

  if (f.humidity >= 80) {
    score += 2;
    factors.push(`High humidity: ${f.humidity}% (+2)`);
  } else if (f.humidity >= 65) {
    score += 1;
    factors.push(`Elevated humidity: ${f.humidity}% (+1)`);
  } else {
    factors.push(`Humidity: ${f.humidity}% (0)`);
  }

  if (f.tempSwing >= 8) {
    score += 2;
    factors.push(`Large temp swing: ${f.tempSwing}°C (+2)`);
  } else if (f.tempSwing >= 4) {
    score += 1;
    factors.push(`Moderate temp swing: ${f.tempSwing}°C (+1)`);
  } else {
    factors.push(`Temp swing: ${f.tempSwing}°C (0)`);
  }

  let level: RiskResult["level"] = "Low";
  if (score >= 4) level = "High";
  else if (score >= 2) level = "Medium";

  return { score, level, factors };
}
