const { fetchMatches, buildScoreboardUrl } = require('../src/providers/espnWorldCupProvider');

function summarize(matches) {
  const now = Date.now();
  const live = matches.filter((match) => match.status === 'live');
  const finished = matches
    .filter((match) => match.status === 'finished' && new Date(match.startTimeUtc).getTime() <= now)
    .sort((a, b) => new Date(b.startTimeUtc) - new Date(a.startTimeUtc))
    .slice(0, 2);
  const upcoming = matches
    .filter((match) => match.status === 'scheduled' && new Date(match.startTimeUtc).getTime() >= now - 5 * 60_000)
    .sort((a, b) => new Date(a.startTimeUtc) - new Date(b.startTimeUtc))
    .slice(0, 3);

  return { live, finished, upcoming };
}

function printGroup(label, matches) {
  console.log(`\n${label}`);
  for (const match of matches) {
    console.log(`- ${match.startTimeChinaLabel} ${match.homeTeam.name} ${match.homeTeam.score ?? ''}-${match.awayTeam.score ?? ''} ${match.awayTeam.name} ${match.statusText}`);
  }
}

(async () => {
  console.log(`Provider URL: ${buildScoreboardUrl()}`);
  const matches = await fetchMatches();
  console.log(`Fetched ${matches.length} normalized matches.`);

  const groups = summarize(matches);
  printGroup('Live', groups.live);
  printGroup('Recent finished', groups.finished);
  printGroup('Upcoming', groups.upcoming);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
