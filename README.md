# FIFA Show

一个面向 Windows 桌面的世界杯比分悬浮窗。窗口常驻桌面最上层，适合边工作、边看视频或边处理其他事情时快速扫一眼赛程和比分。

## 功能

- 无标题栏、无边框、半透明圆角卡片。
- 默认窗口尺寸约 `360 x 160`，紧凑模式约 `320 x 104`。
- 永远置顶，不显示在任务栏。
- 支持拖拽移动窗口。
- 右键菜单支持刷新、切换紧凑模式、退出。
- 默认显示正在进行的比赛、最近结束比赛和接下来比赛。
- 支持按页查看更早赛果和未来赛程。
- 球队名称使用中文名，并保留英文缩写。
- 支持收藏球队，收藏球队相关比赛优先展示。
- 支持单场赛前预测：主胜、平、客胜。
- 支持统计个人预测命中率。
- 榜单分为进球、助攻、纪律、趣味和预测。
- 不启动本地 Web 服务，不占用端口。

## 数据来源

当前主数据源使用 ESPN 的公开 JSON 接口，不解析网页 HTML：

```text
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event={eventId}
```

`scoreboard` 用于赛程、比分和比赛状态。`summary` 用于单场关键事件，并派生进球、助攻、黄牌、红牌、犯规等榜单数据。

本地 mock 数据只作为兜底：当主数据源不可用且没有缓存时，才会临时显示 mock 数据。

## 刷新策略

- 无直播比赛时：每 60 分钟自动刷新一次。
- 有直播比赛时：每 10 分钟自动刷新一次。
- 右键点击“刷新”会立即手动刷新。
- 刷新失败时继续显示上一次缓存结果，并提示更新时间。

## 使用方式

```powershell
npm install
npm start
```

依赖会安装到当前项目目录下的 `node_modules`。

## 界面操作

- 按住窗口空白区域拖动。
- 点击顶部左箭头查看更早赛果。
- 点击顶部右箭头查看未来赛程。
- 点击顶部标题回到默认比分页。
- 点击 `赛` 查看比分。
- 点击 `★` 查看收藏球队。
- 点击 `榜` 查看榜单。
- 点击球队名称查看球队战绩和赛程。
- 点击未来比赛行进入单场页，可选择主胜、平、客胜进行预测。
- 在 `榜 > 预测` 中查看预测数量、已结算数量、猜中次数和命中率。

## 打包

```powershell
npm run package:win
```

默认使用 `electron-builder` 生成 Windows portable 包。

## 目录结构

```text
src/
  main.js                         Electron 主进程
  preload.js                      安全暴露 IPC API
  providers/                      数据源与数据结构
  services/                       缓存和业务服务
  renderer/                       悬浮窗界面
scripts/
  verify-provider.js              数据源验证脚本
```

## 验证数据源

```powershell
npm run test:provider
```

该命令会请求真实数据源，并输出直播、最近结束和接下来比赛的摘要。
