const fs = require('node:fs/promises');
const path = require('node:path');
const espnProvider = require('../providers/espnWorldCupProvider');
const mockProvider = require('../providers/mockProvider');

const MIN_REFRESH_INTERVAL_MS = 10 * 60_000;

class MatchService {
  constructor({ cacheDir }) {
    this.cacheFile = path.join(cacheDir, 'matches-cache.json');
    this.memory = null;
    this.lastAttemptMs = 0;
  }

  async getMatches({ force = false } = {}) {
    const nowMs = Date.now();

    if (!force && this.memory && nowMs - this.lastAttemptMs < MIN_REFRESH_INTERVAL_MS) {
      return { ...this.memory };
    }

    this.lastAttemptMs = nowMs;

    try {
      const matches = await espnProvider.fetchMatches();
      const payload = {
        source: espnProvider.SOURCE_NAME,
        matches,
        updatedAt: new Date().toISOString(),
        stale: false,
        error: null
      };

      this.memory = payload;
      await this.writeCache(payload);
      return payload;
    } catch (error) {
      const cached = this.memory || await this.readCache();

      if (cached?.matches?.length) {
        return {
          ...cached,
          stale: true,
          error: `刷新失败，正在显示 ${formatChinaTime(cached.updatedAt)} 的缓存：${error.message}`
        };
      }

      const fallbackMatches = await mockProvider.fetchMatches();
      const fallback = {
        source: mockProvider.SOURCE_NAME,
        matches: fallbackMatches,
        updatedAt: new Date().toISOString(),
        stale: true,
        error: `主数据源不可用且没有缓存，已临时使用本地 fallback：${error.message}`
      };

      this.memory = fallback;
      return fallback;
    }
  }

  async readCache() {
    try {
      const content = await fs.readFile(this.cacheFile, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.matches)) {
        this.memory = parsed;
        return parsed;
      }
    } catch {
      return null;
    }

    return null;
  }

  async writeCache(payload) {
    await fs.mkdir(path.dirname(this.cacheFile), { recursive: true });
    await fs.writeFile(this.cacheFile, JSON.stringify(payload, null, 2), 'utf8');
  }
}

function formatChinaTime(isoDate) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(isoDate)).replace(/\//g, '-');
}

module.exports = {
  MatchService,
  formatChinaTime
};
