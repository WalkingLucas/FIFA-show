const IDLE_REFRESH_INTERVAL_MS = 60 * 60_000;
const LIVE_REFRESH_INTERVAL_MS = 10 * 60_000;
const MATCH_DETAIL_REFRESH_INTERVAL_MS = 60_000;
const FAVORITES_KEY = 'fifa-show:favorites:v2';
const PREDICTIONS_KEY = 'fifa-show:predictions:v1';

const TEXT = {
  worldCup: '\u4e16\u754c\u676f',
  scores: '\u6bd4\u5206',
  favorites: '\u6536\u85cf',
  stats: '\u699c\u5355',
  team: '\u7403\u961f',
  match: '\u9884\u6d4b',
  history: '\u5386\u53f2',
  schedule: '\u8d5b\u7a0b',
  cache: '\u7f13\u5b58',
  updated: '\u66f4\u65b0',
  notUpdated: '\u672a\u66f4\u65b0',
  refreshing: '\u5237\u65b0\u4e2d',
  refreshFailed: '\u5237\u65b0\u5931\u8d25',
  statsRefreshFailed: '\u699c\u5355\u5237\u65b0\u5931\u8d25',
  detailRefreshFailed: '\u8be6\u60c5\u5237\u65b0\u5931\u8d25',
  noMatches: '\u6682\u65e0\u6bd4\u8d5b\u6570\u636e',
  noStats: '\u6682\u65e0\u699c\u5355\u6570\u636e',
  noMatchEvents: '\u6682\u65e0\u8be6\u60c5\u4e8b\u4ef6',
  statsLoading: '\u699c\u5355\u8bfb\u53d6\u4e2d',
  detailLoading: '\u8be6\u60c5\u8bfb\u53d6\u4e2d',
  noFavorites: '\u8fd8\u6ca1\u6709\u6536\u85cf\u7403\u961f\uff0c\u70b9\u6bd4\u8d5b\u53f3\u4fa7\u661f\u6807\u5373\u53ef',
  selectTeam: '\u8bf7\u9009\u62e9\u7403\u961f',
  beijingTime: '\u5317\u4eac\u65f6\u95f4',
  previousScores: '\u66f4\u65e9\u6bd4\u8d5b',
  futureScores: '\u672a\u6765\u6bd4\u8d5b',
  backToScores: '\u8fd4\u56de\u6bd4\u5206',
  viewRecord: '\u67e5\u770b\u6218\u7ee9',
  favoriteTeam: '\u6536\u85cf\u7403\u961f',
  unfavorite: '\u53d6\u6d88\u6536\u85cf',
  favoriteBoth: '\u6536\u85cf\u53cc\u65b9\u5e76\u67e5\u770b\u6218\u7ee9',
  unfavoriteBoth: '\u53d6\u6d88\u6536\u85cf\u53cc\u65b9\u5e76\u67e5\u770b\u6536\u85cf\u9875',
  detail: '\u8be6\u60c5',
  live: '\u76f4\u64ad',
  noSummaryStats: 'ESPN \u6682\u672a\u8fd4\u56de\u53ef\u6c47\u603b\u699c\u5355',
  nextMatch: '\u4e0b\u4e00\u573a',
  homeWin: '\u4e3b\u80dc',
  draw: '\u5e73',
  awayWin: '\u5ba2\u80dc',
  predictionSaved: '\u5df2\u9884\u6d4b',
  predictionOpen: '\u5c1a\u672a\u9884\u6d4b',
  predictionSettled: '\u5df2\u7ed3\u7b97',
  predictionPending: '\u672a\u5f00\u8d5b',
  predictionWaiting: '\u672a\u7ed3\u7b97',
  correct: '\u731c\u4e2d',
  wrong: '\u672a\u4e2d',
  accuracy: '\u547d\u4e2d\u7387',
  settled: '\u7ed3\u7b97',
  predicted: '\u5df2\u9884\u6d4b',
  goal: '\u8fdb\u7403',
  ownGoal: '\u4e4c\u9f99',
  scorer: '\u8fdb\u7403',
  assist: '\u52a9\u653b',
  assistBy: '\u52a9\u653b',
  substitution: '\u6362\u4eba',
  discipline: '\u7eaa\u5f8b',
  fun: '\u8da3\u5473',
  predict: '\u9884\u6d4b',
  yellow: '\u9ec4\u724c',
  red: '\u7ea2\u724c',
  foul: '\u72af\u89c4',
  bigScore: '\u5927\u6bd4\u5206',
  cleanSheet: '\u96f6\u5c01',
  starOn: '\u2605',
  starOff: '\u2606'
};

let refreshTimerId = null;
let matchDetailTimerId = null;
let matchDetailInFlightId = null;
let contentScrollKey = '';

const state = {
  view: 'scores',
  pageOffset: 0,
  statsCategory: 'goals',
  selectedTeam: null,
  selectedMatch: null,
  matches: [],
  stats: null,
  matchDetails: {},
  source: '',
  updatedAt: null,
  stale: false,
  error: null,
  statsError: null,
  matchDetailError: null,
  favorites: loadSet(FAVORITES_KEY),
  predictions: loadObject(PREDICTIONS_KEY),
  compactMode: false,
  refreshing: false,
  statsLoading: false,
  matchDetailLoading: false
};

const elements = {
  widget: document.getElementById('widget'),
  content: document.getElementById('content'),
  meta: document.getElementById('meta'),
  message: document.getElementById('message'),
  liveDot: document.getElementById('liveDot'),
  viewTitle: document.getElementById('viewTitle'),
  navPrev: document.getElementById('navPrev'),
  navNext: document.getElementById('navNext'),
  titleButton: document.getElementById('titleButton'),
  tabs: [...document.querySelectorAll('.tab-button')]
};

const chinaUpdateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function loadSet(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function loadObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
}

function savePredictions() {
  localStorage.setItem(PREDICTIONS_KEY, JSON.stringify(state.predictions));
}

function hasLiveMatches() {
  return state.matches.some((match) => match.status === 'live');
}

function nextRefreshIntervalMs() {
  return hasLiveMatches() ? LIVE_REFRESH_INTERVAL_MS : IDLE_REFRESH_INTERVAL_MS;
}

function scheduleNextAutoRefresh() {
  if (refreshTimerId) {
    clearTimeout(refreshTimerId);
  }

  refreshTimerId = setTimeout(() => {
    refreshMatches({ force: true, auto: true });
  }, nextRefreshIntervalMs());
}

function clearMatchDetailTimer() {
  if (matchDetailTimerId) {
    clearTimeout(matchDetailTimerId);
    matchDetailTimerId = null;
  }
}

function currentSelectedMatch() {
  if (!state.selectedMatch) {
    return null;
  }

  return state.matches.find((item) => item.id === state.selectedMatch.id) || state.selectedMatch;
}

function scheduleMatchDetailRefresh() {
  clearMatchDetailTimer();
  const match = currentSelectedMatch();

  if (state.view !== 'match' || match?.status !== 'live') {
    return;
  }

  matchDetailTimerId = setTimeout(() => {
    refreshMatchDetail(match, { force: true, silent: true });
  }, MATCH_DETAIL_REFRESH_INTERVAL_MS);
}

function teamKeys(team) {
  return [
    team?.id,
    team?.name,
    team?.nameZh,
    team?.shortName,
    team?.abbreviation,
    team?.displayLabel
  ].filter(Boolean).map((value) => String(value).toLowerCase());
}

function teamsMatch(a, b) {
  const bKeys = new Set(teamKeys(b));
  return teamKeys(a).some((key) => bKeys.has(key));
}

function isFavoriteTeam(team) {
  return teamKeys(team).some((key) => state.favorites.has(key));
}

function isFavoriteMatch(match) {
  return isFavoriteTeam(match.homeTeam) || isFavoriteTeam(match.awayTeam);
}

function setFavoriteTeam(team, shouldFavorite) {
  for (const key of teamKeys(team)) {
    if (shouldFavorite) {
      state.favorites.add(key);
    } else {
      state.favorites.delete(key);
    }
  }
}

function toggleFavoriteTeam(team) {
  setFavoriteTeam(team, !isFavoriteTeam(team));
  saveFavorites();
  render();
}

function toggleFavoriteMatch(match) {
  const makeFavorite = !isFavoriteMatch(match);
  setFavoriteTeam(match.homeTeam, makeFavorite);
  setFavoriteTeam(match.awayTeam, makeFavorite);
  saveFavorites();
  state.view = 'favorites';
  state.pageOffset = 0;
  render();
}

function byTimeAsc(a, b) {
  return new Date(a.startTimeUtc) - new Date(b.startTimeUtc);
}

function byTimeDesc(a, b) {
  return new Date(b.startTimeUtc) - new Date(a.startTimeUtc);
}

function visibleMessageText() {
  if (state.view === 'match') {
    return state.matchDetailError || state.error;
  }

  return state.view === 'stats'
    ? state.statsError || state.error
    : state.error;
}

function desiredRows(extraRows = 0) {
  const messageRows = visibleMessageText() ? 1 : 0;
  return Math.max(1, (state.compactMode ? 4 : 6) - extraRows - messageRows);
}

function finishedMatches() {
  return state.matches
    .filter((match) => match.status === 'finished')
    .sort(byTimeDesc);
}

function upcomingMatches() {
  const now = Date.now();
  return state.matches
    .filter((match) => match.status === 'scheduled' && new Date(match.startTimeUtc).getTime() >= now - 5 * 60_000)
    .sort(byTimeAsc);
}

function scorePageLimits() {
  const rows = desiredRows();
  return {
    min: -Math.ceil(finishedMatches().length / rows),
    max: Math.ceil(upcomingMatches().length / rows)
  };
}

function clampPageOffset() {
  if (state.view !== 'scores') {
    return;
  }

  const limits = scorePageLimits();
  state.pageOffset = Math.max(limits.min, Math.min(limits.max, state.pageOffset));
}

function canGoPrev() {
  if (state.view !== 'scores') {
    return true;
  }

  return state.pageOffset > scorePageLimits().min;
}

function canGoNext() {
  return state.view === 'scores' && state.pageOffset < scorePageLimits().max;
}

function selectScoreMatches() {
  const rows = desiredRows();

  if (state.pageOffset < 0) {
    const page = Math.abs(state.pageOffset) - 1;
    return finishedMatches().slice(page * rows, (page + 1) * rows);
  }

  if (state.pageOffset > 0) {
    const page = state.pageOffset - 1;
    return upcomingMatches().slice(page * rows, (page + 1) * rows);
  }

  const now = Date.now();
  const live = state.matches
    .filter((match) => match.status === 'live')
    .sort(byTimeAsc);
  const finished = state.matches
    .filter((match) => match.status === 'finished' && new Date(match.startTimeUtc).getTime() <= now)
    .sort(byTimeDesc)
    .slice(0, 2);
  const upcoming = upcomingMatches().slice(0, 3);

  return [...live, ...finished, ...upcoming].slice(0, rows);
}

function statusLabel(match) {
  if (match.status === 'live') {
    return match.clock || match.statusText || 'LIVE';
  }

  if (match.status === 'finished') {
    return 'FT';
  }

  if (match.status === 'scheduled') {
    return match.startTimeChinaLabel;
  }

  return match.statusText || match.status;
}

function scoreLabel(match) {
  if (match.status === 'scheduled') {
    return 'vs';
  }

  const homeScore = match.homeTeam.score ?? '-';
  const awayScore = match.awayTeam.score ?? '-';
  return `${homeScore}-${awayScore}`;
}

function teamLabel(team) {
  return team.displayLabel || `${team.nameZh || team.name || team.shortName}(${team.abbreviation || 'TBD'})`;
}

function matchLabel(match) {
  return `${teamLabel(match.homeTeam)} vs ${teamLabel(match.awayTeam)}`;
}

function openTeam(team) {
  clearMatchDetailTimer();
  state.selectedTeam = team;
  state.selectedMatch = null;
  state.view = 'team';
  state.pageOffset = 0;
  state.matchDetailError = null;
  state.matchDetailLoading = false;
  render();
}

function openMatch(match) {
  clearMatchDetailTimer();
  state.selectedMatch = match;
  state.selectedTeam = null;
  state.view = 'match';
  state.pageOffset = 0;
  state.matchDetailError = null;
  state.matchDetailLoading = false;
  render();

  if (match.status !== 'scheduled') {
    refreshMatchDetail(match, { force: match.status === 'live' });
  }
}

function setView(view) {
  if (view !== 'match') {
    clearMatchDetailTimer();
  }

  state.view = view;
  state.pageOffset = 0;
  state.selectedMatch = null;
  state.selectedTeam = null;
  state.matchDetailError = null;
  state.matchDetailLoading = false;

  if (view === 'stats' && !state.stats && !state.statsLoading) {
    refreshStats({ force: false });
  }

  render();
}

function render() {
  clampPageOffset();
  const previousScrollKey = contentScrollKey;
  const previousScrollTop = elements.content.scrollTop;
  elements.widget.classList.toggle('compact', state.compactMode);
  elements.liveDot.classList.toggle('active', hasLiveMatches());
  elements.content.classList.toggle('scrollable', isScrollableContent());
  renderTopbar();
  renderMessage();
  elements.content.replaceChildren(...renderContent());

  contentScrollKey = getContentScrollKey();
  if (previousScrollKey === contentScrollKey) {
    elements.content.scrollTop = previousScrollTop;
  } else {
    elements.content.scrollTop = 0;
  }
}

function isScrollableContent() {
  const match = currentSelectedMatch();
  return state.view === 'match' && match?.status !== 'scheduled';
}

function getContentScrollKey() {
  const match = currentSelectedMatch();
  return match ? `${state.view}:${match.id}` : state.view;
}

function renderTopbar() {
  const updateText = state.updatedAt
    ? chinaUpdateFormatter.format(new Date(state.updatedAt))
    : TEXT.notUpdated;

  elements.meta.textContent = `${state.stale ? TEXT.cache : TEXT.updated} ${updateText}`;
  elements.navPrev.disabled = !canGoPrev();
  elements.navPrev.title = state.view === 'scores' ? TEXT.previousScores : TEXT.backToScores;
  elements.navNext.disabled = !canGoNext();
  elements.navNext.title = state.view === 'scores' ? TEXT.futureScores : '';

  const titles = {
    scores: state.pageOffset < 0 ? `${TEXT.history} ${Math.abs(state.pageOffset)}` : state.pageOffset > 0 ? `${TEXT.schedule} ${state.pageOffset}` : TEXT.worldCup,
    favorites: TEXT.favorites,
    stats: TEXT.stats,
    team: state.selectedTeam ? teamLabel(state.selectedTeam) : TEXT.team,
    match: state.selectedMatch?.status === 'scheduled' ? TEXT.predict : TEXT.detail
  };

  elements.viewTitle.textContent = titles[state.view] || TEXT.worldCup;
  for (const tab of elements.tabs) {
    const active = tab.dataset.view === state.view
      || (state.view === 'team' && tab.dataset.view === 'favorites')
      || (state.view === 'match' && tab.dataset.view === 'scores');
    tab.classList.toggle('active', active);
  }
}

function renderMessage() {
  const message = visibleMessageText();

  if (message) {
    elements.message.textContent = message;
    elements.message.classList.remove('hidden');
  } else {
    elements.message.textContent = '';
    elements.message.classList.add('hidden');
  }
}

function renderContent() {
  if (state.view === 'favorites') {
    return renderFavoritesView();
  }

  if (state.view === 'team') {
    return renderTeamView();
  }

  if (state.view === 'stats') {
    return renderStatsView();
  }

  if (state.view === 'match') {
    return renderMatchView();
  }

  return renderScoreView();
}

function renderScoreView() {
  const matches = selectScoreMatches();
  if (matches.length === 0) {
    return [emptyNode(TEXT.noMatches)];
  }

  return matches.map((match) => renderMatchRow(match));
}

function renderMatchRow(match, options = {}) {
  const showFavorite = options.showFavorite !== false;
  const row = document.createElement('div');
  row.className = 'match-row';
  row.title = `${matchLabel(match)}\n${TEXT.beijingTime} ${match.startTimeChinaLabel}\n${match.statusText}`;
  row.addEventListener('click', () => openMatch(match));

  const status = document.createElement('div');
  status.className = `status ${match.status}`;
  status.textContent = statusLabel(match);

  const home = teamButton(match.homeTeam);
  const score = document.createElement('div');
  score.className = 'score';
  score.textContent = scoreLabel(match);
  const away = teamButton(match.awayTeam);

  const favorite = document.createElement('button');
  favorite.className = `favorite-button ${isFavoriteMatch(match) ? 'active' : ''}`;
  favorite.type = 'button';
  favorite.textContent = isFavoriteMatch(match) ? TEXT.starOn : TEXT.starOff;
  favorite.title = isFavoriteMatch(match) ? TEXT.unfavoriteBoth : TEXT.favoriteBoth;
  favorite.disabled = !showFavorite;
  favorite.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFavoriteMatch(match);
  });

  row.append(status, home, score, away, favorite);
  return row;
}

function teamButton(team) {
  const button = document.createElement('button');
  button.className = `team-button ${isFavoriteTeam(team) ? 'favorite' : ''}`;
  button.type = 'button';
  button.textContent = teamLabel(team);
  button.title = `${TEXT.viewRecord} ${teamLabel(team)}`;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    openTeam(team);
  });
  return button;
}

function getTeamMatches(team) {
  return state.matches.filter((match) => teamsMatch(match.homeTeam, team) || teamsMatch(match.awayTeam, team));
}

function teamSide(match, team) {
  if (teamsMatch(match.homeTeam, team)) {
    return { team: match.homeTeam, opponent: match.awayTeam, home: true };
  }

  if (teamsMatch(match.awayTeam, team)) {
    return { team: match.awayTeam, opponent: match.homeTeam, home: false };
  }

  return null;
}

function teamRecord(team) {
  const record = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    nextMatch: null
  };

  const matches = getTeamMatches(team);
  for (const match of matches) {
    const side = teamSide(match, team);
    if (!side) {
      continue;
    }

    if (match.status === 'scheduled') {
      if (!record.nextMatch || new Date(match.startTimeUtc) < new Date(record.nextMatch.startTimeUtc)) {
        record.nextMatch = match;
      }
      continue;
    }

    if (match.status !== 'finished' && match.status !== 'live') {
      continue;
    }

    const goalsFor = side.team.score ?? 0;
    const goalsAgainst = side.opponent.score ?? 0;
    record.played += 1;
    record.goalsFor += goalsFor;
    record.goalsAgainst += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      record.wins += 1;
    } else if (goalsFor < goalsAgainst) {
      record.losses += 1;
    } else {
      record.draws += 1;
    }
  }

  return record;
}

function recordText(record) {
  return `${record.played}\u573a ${record.wins}\u80dc${record.draws}\u5e73${record.losses}\u8d1f \u8fdb${record.goalsFor}\u5931${record.goalsAgainst}`;
}

function allKnownTeams() {
  const teams = new Map();
  for (const match of state.matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      teams.set(team.abbreviation || team.id || team.name, team);
    }
  }
  return [...teams.values()];
}

function favoriteTeams() {
  return allKnownTeams()
    .filter((team) => isFavoriteTeam(team))
    .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b), 'zh-CN'));
}

function renderFavoritesView() {
  const teams = favoriteTeams();
  if (teams.length === 0) {
    return [emptyNode(TEXT.noFavorites)];
  }

  return teams.slice(0, desiredRows()).map((team) => {
    const row = document.createElement('div');
    row.className = 'favorite-team-row';

    const summary = document.createElement('button');
    summary.className = 'team-summary';
    summary.type = 'button';
    summary.title = `${TEXT.viewRecord} ${teamLabel(team)}`;
    summary.addEventListener('click', () => openTeam(team));

    const name = document.createElement('span');
    name.className = 'team-summary-name';
    name.textContent = teamLabel(team);

    const record = document.createElement('span');
    record.className = 'team-summary-record';
    record.textContent = recordText(teamRecord(team));

    summary.append(name, record);

    const favorite = document.createElement('button');
    favorite.className = 'favorite-button active';
    favorite.type = 'button';
    favorite.textContent = TEXT.starOn;
    favorite.title = TEXT.unfavorite;
    favorite.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavoriteTeam(team);
    });

    row.append(summary, favorite);
    return row;
  });
}

function renderTeamView() {
  if (!state.selectedTeam) {
    return [emptyNode(TEXT.selectTeam)];
  }

  const team = state.selectedTeam;
  const record = teamRecord(team);
  const head = document.createElement('div');
  head.className = 'team-detail-head';

  const info = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'team-name';
  name.textContent = teamLabel(team);
  const line = document.createElement('div');
  line.className = 'team-record';
  line.textContent = record.nextMatch
    ? `${recordText(record)} ${TEXT.nextMatch} ${record.nextMatch.startTimeChinaLabel}`
    : recordText(record);
  info.append(name, line);

  const favorite = document.createElement('button');
  favorite.className = `favorite-button ${isFavoriteTeam(team) ? 'active' : ''}`;
  favorite.type = 'button';
  favorite.textContent = isFavoriteTeam(team) ? TEXT.starOn : TEXT.starOff;
  favorite.title = isFavoriteTeam(team) ? TEXT.unfavorite : TEXT.favoriteTeam;
  favorite.addEventListener('click', () => toggleFavoriteTeam(team));
  head.append(info, favorite);

  const matches = getTeamMatches(team)
    .sort((a, b) => {
      const aStatus = a.status === 'live' ? 0 : a.status === 'finished' ? 1 : 2;
      const bStatus = b.status === 'live' ? 0 : b.status === 'finished' ? 1 : 2;
      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }
      return a.status === 'finished'
        ? new Date(b.startTimeUtc) - new Date(a.startTimeUtc)
        : new Date(a.startTimeUtc) - new Date(b.startTimeUtc);
    })
    .slice(0, desiredRows(1));

  return [head, ...matches.map((match) => renderMatchRow(match, { showFavorite: false }))];
}

function predictionFor(match) {
  return state.predictions[match.id] || null;
}

function actualOutcome(match) {
  if (match.status !== 'finished') {
    return null;
  }

  const homeScore = match.homeTeam.score;
  const awayScore = match.awayTeam.score;

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return null;
  }

  if (homeScore > awayScore) {
    return 'home';
  }
  if (homeScore < awayScore) {
    return 'away';
  }
  return 'draw';
}

function predictionLabel(value, match) {
  if (value === 'home') {
    return `${TEXT.homeWin} ${teamLabel(match.homeTeam)}`;
  }
  if (value === 'away') {
    return `${TEXT.awayWin} ${teamLabel(match.awayTeam)}`;
  }
  return TEXT.draw;
}

function savePrediction(match, pick) {
  state.predictions[match.id] = {
    matchId: match.id,
    pick,
    homeTeam: teamLabel(match.homeTeam),
    awayTeam: teamLabel(match.awayTeam),
    kickoff: match.startTimeUtc,
    createdAt: new Date().toISOString()
  };
  savePredictions();
  render();
}

function predictionSummary() {
  const entries = Object.values(state.predictions);
  let settled = 0;
  let correct = 0;

  for (const prediction of entries) {
    const match = state.matches.find((item) => item.id === prediction.matchId);
    const outcome = match ? actualOutcome(match) : null;
    if (!outcome) {
      continue;
    }
    settled += 1;
    if (prediction.pick === outcome) {
      correct += 1;
    }
  }

  return {
    predicted: entries.length,
    settled,
    correct,
    accuracy: settled ? Math.round((correct / settled) * 100) : null
  };
}

function renderMatchView() {
  const match = currentSelectedMatch();

  if (!match) {
    return [emptyNode(TEXT.noMatches)];
  }

  const rows = [];
  const header = document.createElement('div');
  header.className = 'match-detail-head';
  header.append(
    detailLine(matchLabel(match), scoreLabel(match)),
    detailLine(`${TEXT.beijingTime} ${match.startTimeChinaLabel}`, statusLabel(match))
  );
  rows.push(header);

  const prediction = predictionFor(match);
  const outcome = actualOutcome(match);

  if (match.status === 'scheduled') {
    const buttons = document.createElement('div');
    buttons.className = 'prediction-actions';
    for (const pick of ['home', 'draw', 'away']) {
      const button = document.createElement('button');
      button.className = `prediction-button ${prediction?.pick === pick ? 'active' : ''}`;
      button.type = 'button';
      button.textContent = pick === 'home' ? TEXT.homeWin : pick === 'away' ? TEXT.awayWin : TEXT.draw;
      button.title = predictionLabel(pick, match);
      button.addEventListener('click', () => savePrediction(match, pick));
      buttons.append(button);
    }
    rows.push(buttons);
    rows.push(noteNode(prediction ? `${TEXT.predictionSaved}: ${predictionLabel(prediction.pick, match)}` : TEXT.predictionOpen));
  } else {
    const detailRows = renderMatchDetailRows(match);

    if (detailRows.length > 0) {
      rows.push(...detailRows);
    } else if (state.matchDetailLoading) {
      rows.push(noteNode(TEXT.detailLoading));
    } else {
      rows.push(noteNode(TEXT.noMatchEvents));
    }

    if (prediction && rows.length < desiredRows()) {
      const status = outcome
        ? prediction.pick === outcome ? TEXT.correct : TEXT.wrong
        : TEXT.predictionWaiting;
      const prefix = outcome ? TEXT.predictionSettled : TEXT.predictionSaved;
      rows.push(noteNode(`${prefix}: ${predictionLabel(prediction.pick, match)} ${status}`));
    }
  }

  return match.status === 'scheduled' ? rows.slice(0, desiredRows()) : rows;
}

function renderMatchDetailRows(match) {
  const detail = state.matchDetails[match.id];
  if (!detail) {
    return [];
  }

  const events = selectMatchDetailEvents(match, detail);
  return events
    .map((event) => matchEventRow(event));
}

function selectMatchDetailEvents(match, detail) {
  const majorEvents = Array.isArray(detail.events) ? detail.events : [];
  const commentary = Array.isArray(detail.commentary) ? detail.commentary : [];
  return [...majorEvents, ...commentary].sort((a, b) => eventSortValue(b) - eventSortValue(a));
}

function eventSortValue(event) {
  const wallclockMs = Date.parse(event.wallclock || '');
  if (Number.isFinite(wallclockMs)) {
    return wallclockMs;
  }

  return Number(event.order || 0);
}

function matchEventRow(event) {
  const row = document.createElement('div');
  row.className = `match-event-row ${event.kind || ''}`;

  const minute = document.createElement('span');
  minute.className = 'event-minute';
  minute.textContent = event.minute || '--';

  const kind = document.createElement('span');
  kind.className = 'event-kind';
  kind.textContent = eventKindLabel(event);

  const text = document.createElement('span');
  text.className = 'event-text';
  text.textContent = eventText(event);
  text.title = event.text || text.textContent;

  row.append(minute, kind, text);
  return row;
}

function eventKindLabel(event) {
  if (event.kind === 'goal') {
    return event.ownGoal ? TEXT.ownGoal : TEXT.goal;
  }

  if (event.kind === 'yellow-card') {
    return TEXT.yellow;
  }

  if (event.kind === 'red-card') {
    return TEXT.red;
  }

  if (event.kind === 'substitution') {
    return TEXT.substitution;
  }

  return TEXT.live;
}

function eventText(event) {
  if (event.kind === 'goal') {
    const scorer = event.player || event.shortText || TEXT.goal;
    return event.assist
      ? `${scorer} · ${TEXT.assistBy} ${event.assist}`
      : scorer;
  }

  if (event.kind === 'yellow-card' || event.kind === 'red-card') {
    return event.player || event.shortText || event.text || eventKindLabel(event);
  }

  if (event.kind === 'substitution') {
    if (event.playerIn || event.playerOut) {
      return `${event.playerIn || '?'} ← ${event.playerOut || '?'}`;
    }
    return event.shortText || event.text || TEXT.substitution;
  }

  return event.shortText || event.text || TEXT.live;
}

function detailLine(left, right) {
  const row = document.createElement('div');
  row.className = 'detail-line';

  const leftNode = document.createElement('span');
  leftNode.className = 'detail-left';
  leftNode.textContent = left;

  const rightNode = document.createElement('span');
  rightNode.className = 'detail-right';
  rightNode.textContent = right;

  row.append(leftNode, rightNode);
  return row;
}

function noteNode(text) {
  const node = document.createElement('div');
  node.className = 'note';
  node.textContent = text;
  return node;
}

function renderStatsView() {
  if (state.statsLoading && !state.stats) {
    return [emptyNode(TEXT.statsLoading)];
  }

  const tabs = statsSubtabs();
  if (state.statsCategory === 'predictions') {
    return [tabs, ...renderPredictionStats()].slice(0, desiredRows());
  }

  if (!state.stats) {
    return [tabs, emptyNode(TEXT.noStats)];
  }

  const rows = {
    goals: renderPlayerStats(TEXT.scorer, state.stats.topScorers || []),
    assists: renderPlayerStats(TEXT.assist, state.stats.topAssists || []),
    discipline: [
      ...renderPlayerStats(TEXT.yellow, state.stats.topYellowCards || [], 2),
      ...renderPlayerStats(TEXT.red, state.stats.topRedCards || [], 1),
      ...renderPlayerStats(TEXT.foul, state.stats.topFouls || [], 3)
    ],
    fun: [
      ...(state.stats.highestScores || []).slice(0, 3).map((item) => statRow(TEXT.bigScore, `${item.label} ${item.score}`, item.totalGoals)),
      ...(state.stats.cleanSheets || []).slice(0, 3).map((item) => statRow(TEXT.cleanSheet, item.teamLabel, item.value))
    ]
  }[state.statsCategory] || [];

  if (rows.length === 0) {
    return [tabs, emptyNode(TEXT.noSummaryStats)];
  }

  return [tabs, ...rows].slice(0, desiredRows());
}

function statsSubtabs() {
  const wrap = document.createElement('div');
  wrap.className = 'stats-subtabs';
  const options = [
    ['goals', TEXT.scorer],
    ['assists', TEXT.assist],
    ['discipline', TEXT.discipline],
    ['fun', TEXT.fun],
    ['predictions', TEXT.predict]
  ];

  for (const [value, label] of options) {
    const button = document.createElement('button');
    button.className = `stats-subtab ${state.statsCategory === value ? 'active' : ''}`;
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      state.statsCategory = value;
      render();
    });
    wrap.append(button);
  }

  return wrap;
}

function renderPlayerStats(kind, players, limit = 5) {
  return players
    .slice(0, limit)
    .map((player) => statRow(kind, `${player.name} (${player.teamAbbreviation})`, player.value));
}

function renderPredictionStats() {
  const summary = predictionSummary();
  const rows = [
    statRow(TEXT.predicted, TEXT.predict, summary.predicted),
    statRow(TEXT.settled, TEXT.correct, `${summary.correct}/${summary.settled}`),
    statRow(TEXT.accuracy, TEXT.predict, summary.accuracy === null ? '--' : `${summary.accuracy}%`)
  ];

  const recent = Object.values(state.predictions)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 2);

  for (const prediction of recent) {
    const match = state.matches.find((item) => item.id === prediction.matchId);
    const outcome = match ? actualOutcome(match) : null;
    const result = outcome ? prediction.pick === outcome ? TEXT.correct : TEXT.wrong : TEXT.predictionPending;
    rows.push(statRow(TEXT.predict, `${prediction.homeTeam} vs ${prediction.awayTeam}`, result));
  }

  return rows;
}

function statRow(kind, name, value) {
  const row = document.createElement('div');
  row.className = 'stat-row';

  const kindNode = document.createElement('div');
  kindNode.className = 'stat-kind';
  kindNode.textContent = kind;

  const nameNode = document.createElement('div');
  nameNode.className = 'stat-name';
  nameNode.textContent = name;

  const valueNode = document.createElement('div');
  valueNode.className = 'stat-value';
  valueNode.textContent = value;

  row.append(kindNode, nameNode, valueNode);
  return row;
}

function emptyNode(text) {
  const node = document.createElement('div');
  node.className = 'empty';
  node.textContent = text;
  return node;
}

async function refreshMatches(options = {}) {
  if (state.refreshing) {
    return;
  }

  state.refreshing = true;
  elements.meta.textContent = TEXT.refreshing;

  try {
    const result = await window.fifaShow.refreshMatches(options);
    state.matches = Array.isArray(result.matches) ? result.matches : [];
    state.source = result.source || '';
    state.updatedAt = result.updatedAt || null;
    state.stale = Boolean(result.stale);
    state.error = result.error || null;

    if (state.selectedMatch) {
      state.selectedMatch = state.matches.find((match) => match.id === state.selectedMatch.id) || state.selectedMatch;
    }
  } catch (error) {
    state.stale = true;
    state.error = `${TEXT.refreshFailed}: ${error.message}`;
  } finally {
    state.refreshing = false;
    render();
    scheduleNextAutoRefresh();

    const match = currentSelectedMatch();
    if (state.view === 'match' && match?.status !== 'scheduled') {
      refreshMatchDetail(match, { force: match.status === 'live', silent: true });
    }
  }
}

async function refreshStats(options = {}) {
  if (state.statsLoading) {
    return;
  }

  state.statsLoading = true;
  state.statsError = null;
  render();

  try {
    const result = await window.fifaShow.refreshStats(options);
    state.stats = result;
    state.statsError = result.error || null;
  } catch (error) {
    state.statsError = `${TEXT.statsRefreshFailed}: ${error.message}`;
  } finally {
    state.statsLoading = false;
    render();
  }
}

async function refreshMatchDetail(match, options = {}) {
  if (!match || match.status === 'scheduled') {
    clearMatchDetailTimer();
    return;
  }

  if (matchDetailInFlightId === match.id) {
    return;
  }

  const hasCachedDetail = Boolean(state.matchDetails[match.id]);
  const silent = Boolean(options.silent || hasCachedDetail);
  matchDetailInFlightId = match.id;

  if (!silent) {
    state.matchDetailLoading = true;
    state.matchDetailError = null;
    render();
  }

  try {
    const result = await window.fifaShow.refreshMatchDetail({
      eventId: match.id,
      force: Boolean(options.force),
      live: match.status === 'live'
    });

    state.matchDetails[match.id] = result;
    if (currentSelectedMatch()?.id === match.id) {
      state.matchDetailError = result.error || null;
    }
  } catch (error) {
    if (currentSelectedMatch()?.id === match.id) {
      state.matchDetailError = `${TEXT.detailRefreshFailed}: ${error.message}`;
    }
  } finally {
    if (matchDetailInFlightId === match.id) {
      matchDetailInFlightId = null;
    }

    if (currentSelectedMatch()?.id === match.id) {
      state.matchDetailLoading = false;
      render();
      scheduleMatchDetailRefresh();
    }
  }
}

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  window.fifaShow.showContextMenu();
});

elements.navPrev.addEventListener('click', () => {
  if (state.view === 'scores') {
    if (canGoPrev()) {
      state.pageOffset -= 1;
    }
  } else {
    setView('scores');
    return;
  }
  render();
});

elements.navNext.addEventListener('click', () => {
  if (canGoNext()) {
    state.pageOffset += 1;
    render();
  }
});

elements.titleButton.addEventListener('click', () => setView('scores'));

for (const tab of elements.tabs) {
  tab.addEventListener('click', () => setView(tab.dataset.view));
}

window.fifaShow.onRefreshCommand(() => {
  refreshMatches({ force: true });
  if (state.view === 'stats') {
    refreshStats({ force: true });
  }
  const match = currentSelectedMatch();
  if (state.view === 'match' && match?.status !== 'scheduled') {
    refreshMatchDetail(match, { force: true });
  }
});

window.fifaShow.onCompactMode((compactMode) => {
  state.compactMode = compactMode;
  render();
});

window.fifaShow.getAppState().then((appState) => {
  state.compactMode = Boolean(appState.compactMode);
  render();
});

refreshMatches({ force: true });
