const { getTeamZhName } = require('./teamTranslations');

const SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';
const SOURCE_NAME = 'espn-fifa-world-cup-summary';
const TIMEOUT_MS = 12_000;
const MAX_SUMMARIES = 42;
const BATCH_SIZE = 6;

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
      throw new Error(`ESPN summary returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildSummaryUrl(eventId) {
  const url = new URL(SUMMARY_URL);
  url.searchParams.set('event', eventId);
  return url.toString();
}

async function fetchEventSummary(eventId) {
  return fetchJson(buildSummaryUrl(eventId));
}

function teamLookup(matches) {
  const byName = new Map();

  for (const match of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      const names = [team.name, team.shortName, team.nameZh, team.displayLabel]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      for (const name of names) {
        byName.set(name, team);
      }
    }
  }

  return { byName };
}

function findTeam(displayName, lookup) {
  if (!displayName) {
    return null;
  }

  return lookup.byName.get(String(displayName).toLowerCase()) || null;
}

function isGoalEvent(event) {
  const typeText = `${event.type?.text || ''} ${event.type?.type || ''}`.toLowerCase();
  return Boolean(event.scoringPlay) || typeText.includes('goal');
}

function isOwnGoal(event) {
  const typeText = `${event.type?.text || ''} ${event.type?.type || ''}`.toLowerCase();
  return typeText.includes('own') || String(event.text || '').toLowerCase().startsWith('own goal');
}

function isCardEvent(event, color) {
  const typeText = `${event.type?.text || ''} ${event.type?.type || ''}`.toLowerCase();
  return typeText.includes(`${color} card`) || typeText.includes(`${color}-card`);
}

function isFoulCommentary(item) {
  const play = item.play || {};
  const typeText = `${play.type?.text || ''} ${play.type?.type || ''}`.toLowerCase();
  return typeText.includes('foul');
}

function getScorerName(event) {
  const participant = event.participants?.[0]?.athlete?.displayName;
  if (participant) {
    return participant;
  }

  const text = String(event.text || '');
  const ownGoal = text.match(/^Own Goal by ([^,\.]+)/i);
  if (ownGoal) {
    return ownGoal[1].trim();
  }

  const goalText = text.match(/Goal!.*?\. ([^(]+?) \(/i);
  return goalText?.[1]?.trim() || null;
}

function getAssisterName(event) {
  if (!/Assisted by/i.test(event.text || '')) {
    return null;
  }

  const participant = event.participants?.[1]?.athlete?.displayName;
  if (participant) {
    return participant;
  }

  const assisted = String(event.text || '').match(/Assisted by ([^\.]+?)(?: with| following|\.|$)/i);
  return assisted?.[1]?.trim() || null;
}

function getCardedPlayerName(event) {
  const participant = event.participants?.[0]?.athlete?.displayName;
  if (participant) {
    return participant;
  }

  const textMatch = String(event.text || '').match(/^(.+?) \([^)]+\) is shown/i);
  return textMatch?.[1]?.trim() || null;
}

function getFoulingPlayerName(item) {
  const play = item.play || {};
  const participant = play.participants?.[0]?.athlete?.displayName;
  if (participant) {
    return participant;
  }

  const shortTextMatch = String(play.shortText || item.text || '').match(/^(.+?) Foul/i);
  return shortTextMatch?.[1]?.trim() || null;
}

function incrementPlayer(map, name, team) {
  if (!name) {
    return;
  }

  const teamAbbreviation = team?.abbreviation || '';
  const key = `${name}|${teamAbbreviation}`;
  const existing = map.get(key) || {
    name,
    teamName: team?.name || '',
    teamNameZh: team ? getTeamZhName(team) : '',
    teamAbbreviation,
    value: 0
  };

  existing.value += 1;
  map.set(key, existing);
}

function sortedPlayerStats(map) {
  return [...map.values()]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function getTeamScore(match, team) {
  if (match.homeTeam.id === team.id || match.homeTeam.abbreviation === team.abbreviation) {
    return {
      for: match.homeTeam.score ?? 0,
      against: match.awayTeam.score ?? 0
    };
  }

  return {
    for: match.awayTeam.score ?? 0,
    against: match.homeTeam.score ?? 0
  };
}

function derivedMatchStats(matches) {
  const cleanSheets = new Map();
  const highestScores = [];

  for (const match of matches) {
    if (!['finished', 'live'].includes(match.status)) {
      continue;
    }

    const homeScore = match.homeTeam.score ?? 0;
    const awayScore = match.awayTeam.score ?? 0;
    highestScores.push({
      label: `${match.homeTeam.displayLabel} vs ${match.awayTeam.displayLabel}`,
      totalGoals: homeScore + awayScore,
      score: `${homeScore}-${awayScore}`
    });

    for (const team of [match.homeTeam, match.awayTeam]) {
      const scores = getTeamScore(match, team);
      if (scores.against === 0) {
        cleanSheets.set(team.displayLabel, (cleanSheets.get(team.displayLabel) || 0) + 1);
      }
    }
  }

  return {
    cleanSheets: [...cleanSheets.entries()]
      .map(([teamLabel, value]) => ({ teamLabel, value }))
      .sort((a, b) => b.value - a.value || a.teamLabel.localeCompare(b.teamLabel))
      .slice(0, 8),
    highestScores: highestScores
      .sort((a, b) => b.totalGoals - a.totalGoals || a.label.localeCompare(b.label))
      .slice(0, 5)
  };
}

async function fetchTournamentStats(matches) {
  const relevantMatches = matches
    .filter((match) => ['finished', 'live'].includes(match.status))
    .sort((a, b) => new Date(b.startTimeUtc) - new Date(a.startTimeUtc))
    .slice(0, MAX_SUMMARIES);

  const lookup = teamLookup(matches);
  const scorers = new Map();
  const assists = new Map();
  const yellowCards = new Map();
  const redCards = new Map();
  const fouls = new Map();
  let failedSummaries = 0;

  for (let index = 0; index < relevantMatches.length; index += BATCH_SIZE) {
    const batch = relevantMatches.slice(index, index + BATCH_SIZE);
    const summaries = await Promise.allSettled(batch.map((match) => fetchEventSummary(match.id)));

    summaries.forEach((result) => {
      if (result.status !== 'fulfilled') {
        failedSummaries += 1;
        return;
      }

      for (const event of result.value.keyEvents || []) {
        const eventTeam = findTeam(event.team?.displayName, lookup);

        if (isGoalEvent(event)) {
          if (!isOwnGoal(event)) {
            incrementPlayer(scorers, getScorerName(event), eventTeam);
          }
          incrementPlayer(assists, getAssisterName(event), eventTeam);
        }

        if (isCardEvent(event, 'yellow')) {
          incrementPlayer(yellowCards, getCardedPlayerName(event), eventTeam);
        }

        if (isCardEvent(event, 'red')) {
          incrementPlayer(redCards, getCardedPlayerName(event), eventTeam);
        }
      }

      for (const item of result.value.commentary || []) {
        if (!isFoulCommentary(item)) {
          continue;
        }
        const foulTeam = findTeam(item.play?.team?.displayName, lookup);
        incrementPlayer(fouls, getFoulingPlayerName(item), foulTeam);
      }
    });
  }

  const derived = derivedMatchStats(matches);
  const notes = [];

  if (failedSummaries > 0) {
    notes.push(`${failedSummaries} \u573a\u6bd4\u8d5b\u8be6\u60c5\u6682\u65f6\u8bfb\u53d6\u5931\u8d25\uff0c\u699c\u5355\u53ef\u80fd\u4e0d\u5b8c\u6574\u3002`);
  }

  if (scorers.size === 0) {
    notes.push('ESPN \u5f53\u524d\u672a\u8fd4\u56de\u53ef\u6c47\u603b\u7684\u8fdb\u7403\u4e8b\u4ef6\u3002');
  }

  return {
    source: SOURCE_NAME,
    updatedAt: new Date().toISOString(),
    topScorers: sortedPlayerStats(scorers),
    topAssists: sortedPlayerStats(assists),
    topYellowCards: sortedPlayerStats(yellowCards),
    topRedCards: sortedPlayerStats(redCards),
    topFouls: sortedPlayerStats(fouls),
    cleanSheets: derived.cleanSheets,
    highestScores: derived.highestScores,
    notes
  };
}

module.exports = {
  SOURCE_NAME,
  buildSummaryUrl,
  fetchTournamentStats
};
