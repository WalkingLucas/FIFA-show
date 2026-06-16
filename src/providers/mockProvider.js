const SOURCE_NAME = 'local-mock-fallback';
const { enrichTeamInfo } = require('./teamTranslations');

const chinaKickoffFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function isoFromNow(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function formatChinaKickoff(isoDate) {
  return chinaKickoffFormatter.format(new Date(isoDate)).replace(/\//g, '-');
}

function team(id, name, abbreviation, score = null) {
  return enrichTeamInfo({
    id,
    name,
    shortName: abbreviation,
    abbreviation,
    logo: null,
    score
  });
}

function match(id, status, minutesFromNow, homeTeam, awayTeam, statusText) {
  const startTimeUtc = isoFromNow(minutesFromNow);

  return {
    id,
    source: SOURCE_NAME,
    sourceUrl: 'local://mock-fallback',
    competition: 'FIFA World Cup',
    stage: 'Fallback sample',
    status,
    statusText,
    clock: status === 'live' ? statusText : null,
    startTimeUtc,
    startTimeChinaLabel: formatChinaKickoff(startTimeUtc),
    homeTeam,
    awayTeam,
    venue: null,
    city: null,
    fetchedAt: new Date().toISOString()
  };
}

async function fetchMatches() {
  return [
    match('mock-live-1', 'live', -55, team('mock-cn', 'China PR', 'CHN', 1), team('mock-jpn', 'Japan', 'JPN', 1), "63'"),
    match('mock-ft-1', 'finished', -160, team('mock-mex', 'Mexico', 'MEX', 2), team('mock-can', 'Canada', 'CAN', 1), 'FT'),
    match('mock-ft-2', 'finished', -280, team('mock-usa', 'United States', 'USA', 0), team('mock-bra', 'Brazil', 'BRA', 2), 'FT'),
    match('mock-next-1', 'scheduled', 80, team('mock-fra', 'France', 'FRA'), team('mock-sen', 'Senegal', 'SEN'), 'Scheduled'),
    match('mock-next-2', 'scheduled', 210, team('mock-arg', 'Argentina', 'ARG'), team('mock-ger', 'Germany', 'GER'), 'Scheduled'),
    match('mock-next-3', 'scheduled', 330, team('mock-eng', 'England', 'ENG'), team('mock-por', 'Portugal', 'POR'), 'Scheduled')
  ];
}

module.exports = {
  SOURCE_NAME,
  fetchMatches
};
