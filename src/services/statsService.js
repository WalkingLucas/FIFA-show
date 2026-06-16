const fs = require('node:fs/promises');
const path = require('node:path');
const statsProvider = require('../providers/espnMatchStatsProvider');

const STATS_CACHE_MS = 5 * 60_000;

class StatsService {
  constructor({ cacheDir, matchService }) {
    this.cacheFile = path.join(cacheDir, 'stats-cache.json');
    this.matchService = matchService;
    this.memory = null;
    this.lastAttemptMs = 0;
  }

  async getStats({ force = false } = {}) {
    const nowMs = Date.now();

    if (!force && this.memory && nowMs - this.lastAttemptMs < STATS_CACHE_MS) {
      return { ...this.memory };
    }

    this.lastAttemptMs = nowMs;

    try {
      const matchPayload = await this.matchService.getMatches({ force: false });
      const stats = await statsProvider.fetchTournamentStats(matchPayload.matches || []);
      const payload = {
        ...stats,
        stale: false,
        error: null
      };

      this.memory = payload;
      await this.writeCache(payload);
      return payload;
    } catch (error) {
      const cached = this.memory || await this.readCache();

      if (cached) {
        return {
          ...cached,
          stale: true,
          error: `榜单刷新失败，正在显示缓存：${error.message}`
        };
      }

      return {
        source: statsProvider.SOURCE_NAME,
        updatedAt: new Date().toISOString(),
        topScorers: [],
        topAssists: [],
        cleanSheets: [],
        highestScores: [],
        notes: ['榜单数据暂时不可用。'],
        stale: true,
        error: `榜单刷新失败：${error.message}`
      };
    }
  }

  async readCache() {
    try {
      const content = await fs.readFile(this.cacheFile, 'utf8');
      const parsed = JSON.parse(content);
      this.memory = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  async writeCache(payload) {
    await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
    await fs.writeFile(this.cacheFile, JSON.stringify(payload, null, 2), 'utf8');
  }
}

module.exports = {
  StatsService
};
