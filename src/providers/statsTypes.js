/**
 * ESPN event-derived tournament stats consumed by the renderer.
 *
 * @typedef {Object} PlayerStat
 * @property {string} name
 * @property {string} teamName
 * @property {string} teamNameZh
 * @property {string} teamAbbreviation
 * @property {number} value
 *
 * @typedef {Object} TournamentStats
 * @property {string} source
 * @property {string} updatedAt
 * @property {PlayerStat[]} topScorers
 * @property {PlayerStat[]} topAssists
 * @property {PlayerStat[]} topYellowCards
 * @property {PlayerStat[]} topRedCards
 * @property {PlayerStat[]} topFouls
 * @property {Array<{teamLabel: string, value: number}>} cleanSheets
 * @property {Array<{label: string, totalGoals: number, score: string}>} highestScores
 * @property {string[]} notes
 */

module.exports = {};
