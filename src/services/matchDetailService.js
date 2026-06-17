const fs = require('node:fs/promises');
const path = require('node:path');
const detailProvider = require('../providers/espnMatchDetailProvider');
const { formatChinaTime } = require('./matchService');

const LIVE_DETAIL_CACHE_MS = 60_000;
const FINISHED_DETAIL_CACHE_MS = 24 * 60 * 60_000;

class MatchDetailService {
  constructor({ cacheDir }) {
    this.cacheFile = path.join(cacheDir, 'match-detail-cache.json');
    this.memory = null;
  }

  async getMatchDetail({ eventId, force = false, live = false } = {}) {
    if (!eventId) {
      return this.emptyPayload({
        eventId: '',
        error: '\u7f3a\u5c11\u6bd4\u8d5b ID\uff0c\u65e0\u6cd5\u8bfb\u53d6\u8be6\u60c5'
      });
    }

    const cache = await this.ensureCache();
    const cached = cache.details[String(eventId)] || null;
    const ttl = live ? LIVE_DETAIL_CACHE_MS : FINISHED_DETAIL_CACHE_MS;
    const nowMs = Date.now();

    if (!force && cached && nowMs - (cached.cachedAtMs || 0) < ttl) {
      return this.publicPayload(cached);
    }

    try {
      const detail = await detailProvider.fetchMatchDetail(eventId);
      const payload = {
        ...detail,
        cachedAtMs: nowMs,
        stale: false,
        error: null
      };

      cache.details[String(eventId)] = payload;
      this.memory = cache;
      await this.writeCache(cache);
      return this.publicPayload(payload);
    } catch (error) {
      if (cached) {
        return this.publicPayload({
          ...cached,
          stale: true,
          error: `\u8be6\u60c5\u5237\u65b0\u5931\u8d25\uff0c\u6b63\u5728\u663e\u793a ${formatChinaTime(cached.updatedAt)} \u7684\u7f13\u5b58\uff1a${error.message}`
        });
      }

      return this.emptyPayload({
        eventId,
        error: `\u8be6\u60c5\u5237\u65b0\u5931\u8d25\uff1a${error.message}`
      });
    }
  }

  async ensureCache() {
    if (this.memory) {
      return this.memory;
    }

    this.memory = await this.readCache() || { details: {} };
    return this.memory;
  }

  async readCache() {
    try {
      const content = await fs.readFile(this.cacheFile, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.details) {
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

  publicPayload(payload) {
    const { cachedAtMs, ...publicFields } = payload;
    return publicFields;
  }

  emptyPayload({ eventId, error }) {
    return {
      source: detailProvider.SOURCE_NAME,
      eventId: String(eventId),
      updatedAt: new Date().toISOString(),
      statusText: null,
      events: [],
      commentary: [],
      stale: true,
      error
    };
  }
}

module.exports = {
  MatchDetailService
};
