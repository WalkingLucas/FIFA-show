const SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';
const SOURCE_NAME = 'espn-fifa-world-cup-summary';
const TIMEOUT_MS = 12_000;
const MAX_COMMENTARY_ITEMS = 80;

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

function eventTypeText(event) {
  return `${event.type?.text || ''} ${event.type?.type || ''}`.toLowerCase();
}

function commentaryTypeText(item) {
  const play = item.play || {};
  return `${play.type?.text || ''} ${play.type?.type || ''}`.toLowerCase();
}

function isGoalEvent(event) {
  return Boolean(event.scoringPlay) || eventTypeText(event).includes('goal');
}

function isOwnGoal(event) {
  const text = String(event.text || '').toLowerCase();
  return eventTypeText(event).includes('own') || text.startsWith('own goal');
}

function isCardEvent(event) {
  const typeText = eventTypeText(event);
  return typeText.includes('yellow card')
    || typeText.includes('yellow-card')
    || typeText.includes('red card')
    || typeText.includes('red-card');
}

function isSubstitutionEvent(event) {
  return eventTypeText(event).includes('substitution');
}

function isImportantCommentary(item) {
  const typeText = commentaryTypeText(item);
  return typeText.includes('shot')
    || typeText.includes('corner')
    || typeText.includes('offside')
    || typeText.includes('foul')
    || typeText.includes('free kick')
    || typeText.includes('penalty');
}

function displayMinute(source) {
  return source.clock?.displayValue || source.time?.displayValue || '';
}

function eventOrder(source, fallbackIndex) {
  return Number(source.clock?.value ?? source.time?.value ?? fallbackIndex);
}

function getParticipantName(source, index = 0) {
  return source.participants?.[index]?.athlete?.displayName || null;
}

function getScorerName(event) {
  const participant = getParticipantName(event, 0);
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

  const participant = getParticipantName(event, 1);
  if (participant) {
    return participant;
  }

  const assisted = String(event.text || '').match(/Assisted by ([^\.]+?)(?: with| following|,|\.|$)/i);
  return assisted?.[1]?.trim() || null;
}

function getCardedPlayerName(event) {
  const participant = getParticipantName(event, 0);
  if (participant) {
    return participant;
  }

  const textMatch = String(event.text || '').match(/^(.+?) \([^)]+\) is shown/i);
  return textMatch?.[1]?.trim() || null;
}

function parseSubstitutionText(text) {
  const match = String(text || '').match(/Substitution,\s*[^.]+\.?\s*(.+?) replaces (.+?)\.?$/i);
  return {
    playerIn: match?.[1]?.trim() || null,
    playerOut: match?.[2]?.trim() || null
  };
}

function normalizeKeyEvent(event, index) {
  const base = {
    id: String(event.id || `event-${index}`),
    minute: displayMinute(event),
    period: event.period?.number || null,
    teamName: event.team?.displayName || null,
    text: event.text || event.shortText || '',
    shortText: event.shortText || '',
    wallclock: event.wallclock || null,
    order: eventOrder(event, index)
  };

  if (isGoalEvent(event)) {
    return {
      ...base,
      kind: 'goal',
      ownGoal: isOwnGoal(event),
      player: getScorerName(event),
      assist: getAssisterName(event)
    };
  }

  if (isCardEvent(event)) {
    const typeText = eventTypeText(event);
    return {
      ...base,
      kind: typeText.includes('red') ? 'red-card' : 'yellow-card',
      player: getCardedPlayerName(event)
    };
  }

  if (isSubstitutionEvent(event)) {
    return {
      ...base,
      kind: 'substitution',
      ...parseSubstitutionText(event.text)
    };
  }

  return null;
}

function normalizeCommentary(item, index) {
  const play = item.play || {};
  return {
    id: String(play.id || `commentary-${item.sequence || index}`),
    kind: 'commentary',
    minute: displayMinute(item),
    period: play.period?.number || null,
    teamName: play.team?.displayName || null,
    text: item.text || play.text || '',
    shortText: play.shortText || '',
    wallclock: play.wallclock || null,
    order: Number(item.sequence ?? eventOrder(item, index))
  };
}

function normalizeSummary(data, eventId, sourceUrl) {
  const keyEvents = (data.keyEvents || [])
    .map((event, index) => normalizeKeyEvent(event, index))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  const commentary = (data.commentary || [])
    .filter((item) => item.text && isImportantCommentary(item))
    .map((item, index) => normalizeCommentary(item, index))
    .filter((item) => item.text)
    .sort((a, b) => b.order - a.order)
    .slice(0, MAX_COMMENTARY_ITEMS);

  return {
    source: SOURCE_NAME,
    sourceUrl,
    eventId: String(eventId),
    updatedAt: new Date().toISOString(),
    statusText: data.header?.competitions?.[0]?.status?.type?.shortDetail || null,
    events: keyEvents,
    commentary
  };
}

async function fetchMatchDetail(eventId) {
  if (!eventId) {
    throw new Error('Missing ESPN event id');
  }

  const sourceUrl = buildSummaryUrl(eventId);
  const data = await fetchJson(sourceUrl);
  return normalizeSummary(data, eventId, sourceUrl);
}

module.exports = {
  SOURCE_NAME,
  buildSummaryUrl,
  fetchMatchDetail
};
