const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const { enrichTeamInfo } = require('./teamTranslations');
const SOURCE_NAME = 'espn-fifa-world-cup';
const TIMEOUT_MS = 12_000;
const RANGE_DAYS_BACK = 7;
const RANGE_DAYS_FORWARD = 21;

const chinaDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const chinaKickoffFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateParam(date) {
  const parts = chinaDateParts.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function buildScoreboardUrl(now = new Date()) {
  const start = toDateParam(addDays(now, -RANGE_DAYS_BACK));
  const end = toDateParam(addDays(now, RANGE_DAYS_FORWARD));
  const url = new URL(BASE_URL);
  url.searchParams.set('limit', '200');
  url.searchParams.set('dates', `${start}-${end}`);
  return url.toString();
}

function formatChinaKickoff(isoDate) {
  return chinaKickoffFormatter.format(new Date(isoDate)).replace(/\//g, '-');
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'FIFA-Show/0.1'
      }
    });

    if (!response.ok) {
      throw new Error(`ESPN returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function mapStatus(event) {
  const type = event.status?.type || {};
  const state = type.state;
  const name = String(type.name || '').toLowerCase();
  const description = String(type.description || '').toLowerCase();

  if (state === 'in') {
    return 'live';
  }

  if (state === 'post') {
    return 'finished';
  }

  if (name.includes('postponed') || description.includes('postponed')) {
    return 'postponed';
  }

  if (name.includes('cancel') || description.includes('cancel')) {
    return 'cancelled';
  }

  if (state === 'pre') {
    return 'scheduled';
  }

  return 'unknown';
}

function toTeamInfo(competitor) {
  const team = competitor?.team || {};
  const parsedScore = Number.parseInt(competitor?.score, 10);

  return enrichTeamInfo({
    id: String(team.id || competitor?.id || team.uid || 'unknown'),
    name: team.displayName || team.name || team.shortDisplayName || 'TBD',
    shortName: team.shortDisplayName || team.name || team.abbreviation || 'TBD',
    abbreviation: team.abbreviation || team.shortDisplayName || team.name || 'TBD',
    logo: team.logo || team.logos?.[0]?.href || null,
    score: Number.isFinite(parsedScore) ? parsedScore : null
  });
}

function normalizeEvent(event, fetchedAt, sourceUrl, leagueName, stageName) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((competitor) => competitor.homeAway === 'home') || competitors[0];
  const away = competitors.find((competitor) => competitor.homeAway === 'away') || competitors[1];
  const type = event.status?.type || {};

  return {
    id: String(event.id || event.uid),
    source: SOURCE_NAME,
    sourceUrl,
    competition: leagueName || 'FIFA World Cup',
    stage: event.season?.type?.name || stageName || null,
    status: mapStatus(event),
    statusText: type.shortDetail || type.detail || type.description || 'Scheduled',
    clock: event.status?.displayClock || null,
    startTimeUtc: event.date,
    startTimeChinaLabel: formatChinaKickoff(event.date),
    homeTeam: toTeamInfo(home),
    awayTeam: toTeamInfo(away),
    venue: competition.venue?.fullName || null,
    city: competition.venue?.address?.city || null,
    fetchedAt
  };
}

async function fetchMatches(options = {}) {
  const now = options.now || new Date();
  const sourceUrl = options.url || buildScoreboardUrl(now);
  const data = await fetchJson(sourceUrl);
  const events = Array.isArray(data.events) ? data.events : [];

  if (events.length === 0) {
    throw new Error('ESPN provider returned no World Cup events for the selected range');
  }

  const league = data.leagues?.[0] || {};
  const fetchedAt = new Date().toISOString();
  const stageName = league.season?.type?.name || null;

  return events
    .map((event) => normalizeEvent(event, fetchedAt, sourceUrl, league.name, stageName))
    .sort((a, b) => new Date(a.startTimeUtc) - new Date(b.startTimeUtc));
}

module.exports = {
  SOURCE_NAME,
  buildScoreboardUrl,
  fetchMatches
};
