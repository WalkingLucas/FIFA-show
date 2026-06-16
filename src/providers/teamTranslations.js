const TEAM_ZH_BY_ABBR = {
  ALG: '阿尔及利亚',
  ARG: '阿根廷',
  AUS: '澳大利亚',
  AUT: '奥地利',
  BEL: '比利时',
  BIH: '波黑',
  BRA: '巴西',
  CAN: '加拿大',
  CIV: '科特迪瓦',
  COD: '刚果民主共和国',
  COL: '哥伦比亚',
  CPV: '佛得角',
  CRO: '克罗地亚',
  CUW: '库拉索',
  CZE: '捷克',
  ECU: '厄瓜多尔',
  EGY: '埃及',
  ENG: '英格兰',
  ESP: '西班牙',
  FRA: '法国',
  GER: '德国',
  GHA: '加纳',
  HAI: '海地',
  IRN: '伊朗',
  IRQ: '伊拉克',
  JOR: '约旦',
  JPN: '日本',
  KOR: '韩国',
  KSA: '沙特',
  MAR: '摩洛哥',
  MEX: '墨西哥',
  NED: '荷兰',
  NOR: '挪威',
  NZL: '新西兰',
  PAN: '巴拿马',
  PAR: '巴拉圭',
  POR: '葡萄牙',
  QAT: '卡塔尔',
  RSA: '南非',
  SCO: '苏格兰',
  SEN: '塞内加尔',
  SUI: '瑞士',
  SWE: '瑞典',
  TUN: '突尼斯',
  TUR: '土耳其',
  URU: '乌拉圭',
  USA: '美国',
  UZB: '乌兹别克斯坦'
};

function groupPlaceholder(abbreviation, fallbackName) {
  const value = String(abbreviation || '').toUpperCase();
  const groupRank = value.match(/^([12])([A-L])$/);

  if (groupRank) {
    return `${groupRank[2]}组第${groupRank[1]}`;
  }

  if (value === '3RD') {
    return '小组第三晋级队';
  }

  if (value === 'RD32') {
    return '32强赛胜者';
  }

  const name = String(fallbackName || '');
  const winner = name.match(/^Group ([A-L]) Winner$/i);
  if (winner) {
    return `${winner[1].toUpperCase()}组第1`;
  }

  const second = name.match(/^Group ([A-L]) 2nd Place$/i);
  if (second) {
    return `${second[1].toUpperCase()}组第2`;
  }

  return null;
}

function getTeamZhName(team) {
  const abbr = String(team?.abbreviation || '').toUpperCase();
  return TEAM_ZH_BY_ABBR[abbr] || groupPlaceholder(abbr, team?.name) || team?.name || '待定';
}

function enrichTeamInfo(team) {
  const abbreviation = team.abbreviation || team.shortName || 'TBD';
  const nameZh = getTeamZhName({ ...team, abbreviation });

  return {
    ...team,
    abbreviation,
    nameZh,
    displayLabel: `${nameZh}(${abbreviation})`
  };
}

module.exports = {
  TEAM_ZH_BY_ABBR,
  enrichTeamInfo,
  getTeamZhName
};
