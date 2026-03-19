# Zen App TODOS

> 来源: CEO Plan Review (2026-03-18, 展望模式)
> 工程审查: Eng Review (2026-03-18, BIG CHANGE 模式)
> 工作流: /plan-eng-review ✓ → 写代码 → /review → /ship → /qa

---

## Phase 0: 打地基 ✅ (2026-03-18 完成)

### P0-1: 统一分支 + 清理 [P1] [S]
- GitHub 设置里改默认分支 main → 删 master
- 清理 log 文件 (dev.log, server.log, tunnel.log 等)
- 清理未使用音频 (muyu-real.mp3, muyu-sample1.mp3, muyu-sample3.mp3, muyu-sample4.wav)
- 清理 macOS 垃圾文件 (._* 从 git 移除)
- 更新 .gitignore

### P0-2: 提取共享工具模块 [P1] [M]
- 合并为单文件 `src/utils/zen.js` (Eng Review 决定: 1 文件全合并)
  - safeSave(), safeLoad() — 写入失败自动清理过期缓存+内存兜底，不打扰用户
  - getProfile(), saveProfile() — 含旧数据迁移逻辑
  - awardXP(), addXP(), spendXP(), refundXP(), getBalance()
  - spendXP() 必须检查余额，余额不足拒绝执行 (Eng Review 发现的关键缺口)
  - getRank(), getNextRank(), RANKS
- 消除 Meditation/Fish/Sutra 中重复的 awardXP()
- Home.jsx 改为进入页面时重读数据，不依赖 window focus 事件

### P0-3: 拆分 Garden.jsx [P1] [L]
- 当前 1182 行 → 拆成 6 个模块 + 纯编排层 (Eng Review 决定: 最彻底拆分)
- `src/hooks/useMonk.js` — 移动引擎、游戏循环、碰撞检测
- `src/hooks/useGardenShop.js` — 商店状态、买/放/删饰品、长按删除
- `src/components/GardenNPCs.jsx` — 佛像/木鱼固定NPC、proximity互动
- `src/components/GardenWeather.jsx` — 天气叠加层(组装已有WeatherEffects)
- `src/hooks/useGardenAudio.js` — BGM + 木鱼音效池
- `src/components/GardenControls.jsx` — 摇杆(mobile) + 键盘提示(desktop)
- Garden.jsx 变成纯编排层(~200行)，统一调配各模块状态

### P0-4: localStorage 容错 [P1] [S]
- safeSave() 在 zen.js 中实现 (和 P0-2 一起做)
- 写入失败 → 清理过期缓存(天气/旧签到) → 重试 → 失败则内存兜底
- 不显示 toast，不打扰用户 (Eng Review 决定)

### P0-5: 修禅修计时器 [P1] [M]
- 问题: 锁屏后 setTimeout 暂停，呼吸节奏乱掉
- 方案: 用 Date.now() 记录每阶段结束时间，恢复时重新计算当前阶段
- 用户看到的还是倒数，只是后台引擎更可靠
- 加 Wake Lock API 防止自动锁屏

### P0-6: 修 PWA globPatterns [P1] [S]
- vite.config.js workbox globPatterns 加 `.mp3`
- 确保 garden.mp3 和 bowl-horizon.mp3 离线可用

### P0-8: Vitest 单元测试 [P1] [M]
- 安装 vitest + @testing-library/react
- 15 个测试全覆盖 (Eng Review 决定):
  - ★★★ 必须测 (10): getRank 边界值(3个), getNextRank(2个), awardXP, spendXP(含余额检查), refundXP, getBalance, safeSave失败不崩溃
  - ★★ 应该测 (4): getProfile默认值, 旧数据迁移, getSeason, getTimeOfDay
  - ★ 有余力测 (1): Garden商店余额不够买不了

### P0-9: 版本号 → 0.1.0 [P2] [S]

### P0-10: 首次部署 [P1] [S]
- npm run deploy (build → gh-pages)
- 验证 https://realQhimself.github.io/zen-app/

---

## Phase 1: 体验打磨 (当前)

### P1-TIMER: 禅修倒数计时器 ✅ (2026-03-19)
- 5/10/15 分钟 + 自定义 + 无限模式，Date.now() 引擎，记忆上次选择

### P1-D3: 禅修结束结算屏 ✅ (2026-03-19)
- 停止后显示时长/呼吸次数/功德，Framer Motion 动画

### P1-SUTRA-BUG: 抄经跳字 Bug [P1] [S]
- 问题: 抄写过程中偶尔跳过一个字直接到下一个
- 需要排查 Sutra.jsx 的字符推进逻辑
- 来源: Q 反馈 (2026-03-19)

### P1-MOVE: 点击移动替代摇杆 [P2] [M]
- 问题: 现有摇杆移速不均匀，人物跳来跳去不 smooth
- 方案: 移除 VirtualJoystick，改为点击/触摸目标点，人物自动平滑走过去
- 桌面端鼠标点击同理，保留 WASD 键盘控制
- 需改: useMonkMovement.js, VirtualJoystick.jsx, Garden.jsx
- 来源: Q 反馈 (2026-03-19)

### P1-GUIDED: 禅修引导词扩充 [P2] [M]
- 当前只有 5 种心情各 1 套引导词
- 目标: 扩充到 10-20 套，覆盖更多场景和情境
- 纯内容添加，改 src/data/guidedScripts.js
- 来源: Q 反馈 (2026-03-19)

### P1-SENTRY: 接入 Sentry [P2] [S]
- 从 Phase 0 移入 (Eng Review 决定: 没部署没用户时接入无意义)
- 待首次部署 (P0-10) 完成后再接入
- Sentry 免费版 (5000 事件/月)
- npm install @sentry/react + main.jsx 初始化

### P1-D1: 和尚视觉进化 [P2] [M]
- 等级提升 → 袍子颜色变深、加佛珠、高级别金色袈裟
- 实现: 根据 rank.level 改 SVG 填充色
- 来源: CEO Review 惊喜点 1

### P1-D2: 禅园日夜微光 [P2] [S]
- 夜晚: 禅灯/香炉发微弱光芒, 和尚走过有月光影子
- 实现: CSS filter + 条件渲染
- 来源: CEO Review 惊喜点 2

### P1-D4: 开屏禅语闪屏 [P3] [S]
- 打开 App 时 1.5 秒禅语闪屏, 淡入淡出
- 来源: CEO Review 惊喜点 4

### P1-D5: 抄经墨迹笔压 [P3] [M]
- 触摸压感/速度影响笔宽
- 起笔淡、中间浓、收笔淡
- 来源: CEO Review 惊喜点 5

### P1-STATS: 修行统计仪表盘 [P2] [M]
### P1-NOTIFY: PWA 通知提醒 [P3] [S]
### P1-FESTIVAL: 禅园节日活动 [P3] [M]
### P1-AUDIO: 音频压缩/流式加载 [P2] [S]

---

## Phase 2: 智能化

### P2-SUTRAS: 扩充经典内容 [P2] [M]
- 当前只有《心经》(72字)
- 目标: 加入 8-10 部经典 (如《金刚经》节选、《六祖坛经》名句、《法华经》观世音菩萨普门品等)
- 需要: 经文数据 + 选经 UI + 进度分别保存
- 来源: Q 反馈 (2026-03-19)

- AI 引导冥想 (Claude API) — 需要后端
- 抄经笔画教学
- 智能日课推荐
- 语音引导 (TTS)

### P2-PERF: 禅园游戏循环优化 [P3] [S]
- 当前: 和尚每秒检查 60 次附近饰品，5-10 个饰品无压力
- 触发条件: 饰品种类/数量增至 50+ 时需要优化
- 方案: 空间索引 (grid/quadtree) 加速碰撞检测
- 来源: Eng Review 性能审查

## Phase 3: 社交 + 云
- 用户账号 + 云同步 (Supabase)
- 禅园快照分享
- 共修模式
- 排行榜 / 道友系统

---

> 图例: [P1]=高优先 [P2]=中优先 [P3]=低优先 | [S]=小 [M]=中 [L]=大 [XL]=特大
