/**
 * Unified match structure consumed by the renderer.
 *
 * @typedef {'live' | 'finished' | 'scheduled' | 'postponed' | 'cancelled' | 'unknown'} MatchStatus
 *
 * @typedef {Object} TeamInfo
 * @property {string} id
 * @property {string} name
 * @property {string} nameZh
 * @property {string} shortName
 * @property {string} abbreviation
 * @property {string} displayLabel
 * @property {string | null} logo
 * @property {number | null} score
 *
 * @typedef {Object} Match
 * @property {string} id
 * @property {string} source
 * @property {string} sourceUrl
 * @property {string} competition
 * @property {string | null} stage
 * @property {MatchStatus} status
 * @property {string} statusText
 * @property {string | null} clock
 * @property {string} startTimeUtc
 * @property {string} startTimeChinaLabel
 * @property {TeamInfo} homeTeam
 * @property {TeamInfo} awayTeam
 * @property {string | null} venue
 * @property {string | null} city
 * @property {string} fetchedAt
 */

module.exports = {};
