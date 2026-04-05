# 抄经功能升级设计文档

## 概述

将抄经功能从"简陋的逐字临摹"升级为"完整的抄经修行体验"。参考市面成熟 app（抄经、手抄佛经、時時抄經、Mind Sutra），补齐仪式感、笔墨质感、进度可视化、氛围、导出五个维度。

## 用户流程

```
选经 → 发愿 → 抄经（全屏沉浸） → 回向 + 导出
```

### 1. 选经页面

保持现有经文列表，显示每部经的进度条和已抄/总字数。

- 已完成的经文仍可点击，点击后进入发愿页面重新开始（进度归零，次数 +1）
- 进行中的经文点击后从上次位置继续（跳过发愿，直接进入书写）

### 2. 发愿页面（新增）

用户选择经文后、开始书写前的仪式页面。

- 显示经文名称、第 N 次抄写、总字数
- **回向对象选择**：预设标签（家人平安、众生安乐、自我修行、消除业障）+ 自定义输入
- 回向选择保存到本次 session，在结束回向页面复用
- "开始抄经"按钮进入书写

### 3. 抄经书写页面（大改）

#### 全屏沉浸

- 隐藏 app 底部导航栏（现有行为保持）
- 顶部仅保留：✕ 关闭按钮（左）、进度条（中）、数字进度（右，如 91/260）
- 顶部栏半透明，不抢视觉焦点

#### 大字书写

- 田字格尽量占满屏幕可用宽度（减去左右边距）
- 字号 = 田字格尺寸 × 0.8，确保字足够大
- 每次只显示一个字

#### 流畅推进

- **去掉"善"反馈**：写完一个字（overlap ≥ 25%）直接切到下一个字，无动画无延迟
- **去掉手动确认按钮**（✓）：自动识别通过即推进
- **未达标时**：用户抬笔后如果 overlap < 25%，什么都不发生，用户继续在同一个字上补笔。画布不清除，笔迹累加。用户可随时按"清除"重来或"跳过"
- 保留"清除"和"跳过"按钮
- 底部显示"接下来"预览（后续 5 个字，渐隐效果），提供方向感

#### 笔触音效

- 书写时播放轻微的毛笔触纸音效（需真实录音，不用合成音）
- 音效素材需单独录制或采购，放入 `public/sounds/` 目录
- 无背景音乐，保持安静

#### 自动保存

- 每完成一个字，进度立即保存到 localStorage
- 按 ✕ 退出时无需确认，直接回到选经页面
- 下次进入同一部经，从上次位置继续
- App 切到后台/关闭也不丢失进度

#### 段落庆祝

- 不在单字上做反馈
- 完成一整部经文时，展示庆祝动效（具体效果在回向页面体现）

### 4. 回向 + 导出页面（新增）

完成一部经文后自动跳转。这是整个流程的情感高潮。

- **暗色背景**，营造庄重感
- 显示"回向"标题
- **卷轴预览**：用户手写字迹缩略图，竖排卷轴风格
- 显示发愿时选择的回向对象："愿以此功德，回向 XXX"
- 统计信息：第 N 次抄写、用时、获得 XP
- **保存作品**：导出精装图片到相册
  - 竖排卷轴风格
  - 包含：经文标题、手写字迹、日期、回向文
  - 古典纸张背景纹理
  - **手写字迹采集**：每个字写完推进时，将当前 canvas 内容截取为小图（toDataURL），立即存入 IndexedDB（浏览器大容量存储，可存几百 MB）
  - 中途退出再回来，之前写的字迹都在，可以继续抄，最终拼成完整卷轴
  - 完成导出后，清理该经文的字迹数据释放空间
- **分享**：调用系统分享 API（Web Share API，不支持的浏览器降级为下载图片）

### 5. 首页修行进度区（新增）

在现有修行页面中新增"抄经修行"区块：

- **连续天数**：连续 N 天有抄经记录
- **累计字数**：历史总抄写字数
- **热力图**：GitHub 风格的练习日历，颜色深浅表示当日字数
- **成就徽章**：横向滚动展示
  - 已获得的高亮显示，未获得的灰色半透明
  - 成就定义见数据层

## 笔墨质感升级

在现有 Canvas 2D circle stamp 基础上优化：

- **墨色浓淡**：连续书写时墨色逐渐变淡（alpha 递减），抬笔重新蘸墨（alpha 恢复）
- **笔锋起收**：起笔时宽度从极细快速过渡到正常（现有 taper 优化），收笔时加一个回缩变细的尾巴
- **粗细过渡更平滑**：增大 smoothing factor，避免粗细跳变
- **保持 Canvas 2D**：不用 WebGL，确保低端手机兼容性

## 双端适配

### 手机端（< 768px）

- 全屏沉浸，无侧边栏
- 田字格占满宽度
- 顶部极简控制栏
- 底部：清除 + 跳过

### 电脑端（≥ 768px）

- 左侧面板（约 240px）：
  - 经文名称和作者
  - 进度百分比和进度条
  - 已抄经文预览（可滚动）
  - "暂停（自动保存）"按钮
- 右侧：书写区，田字格更大（最大 400px）
- 利用宽屏展示上下文信息

### 判断逻辑

- 使用 CSS media query + Tailwind responsive prefix 处理布局差异
- 共享同一套组件，通过响应式类名切换显示/隐藏

## 数据架构

### 原则

所有内容数据与代码彻底分离。添加新内容 = 修改数据文件，不碰任何组件代码。

### 目录结构

```
src/data/
├── sutras/
│   ├── index.js              # 经文索引（导出所有经文列表）
│   ├── heart-sutra.json       # 心经
│   ├── diamond-verse.json     # 金刚经·四句偈
│   ├── platform-verse.json    # 六祖坛经·名偈
│   └── ...                    # 每部经一个文件
├── dedications.js             # 回向模板（预设标签列表）
└── achievements.js            # 成就定义（名称、条件、图标）
```

### 经文数据格式（JSON）

```json
{
  "id": "heart-sutra",
  "name": "般若波罗蜜多心经",
  "author": "玄奘译",
  "description": "佛教核心经典，阐述空性智慧",
  "text": "观自在菩萨行深般若波罗蜜多时...",
  "category": "buddhist"
}
```

### 回向模板数据

```js
export const DEDICATIONS = [
  { id: 'family', label: '家人平安' },
  { id: 'beings', label: '众生安乐' },
  { id: 'self', label: '自我修行' },
  { id: 'karma', label: '消除业障' },
];
```

### 成就定义数据

```js
export const ACHIEVEMENTS = [
  {
    id: 'hundred-chars',
    name: '百字成文',
    icon: '🏮',
    description: '累计抄写 100 字',
    condition: { type: 'total_chars', threshold: 100 },
  },
  {
    id: 'seven-days',
    name: '七日精进',
    icon: '🔥',
    description: '连续抄经 7 天',
    condition: { type: 'streak_days', threshold: 7 },
  },
  {
    id: 'bodhi-sprout',
    name: '菩提发芽',
    icon: '🌳',
    description: '完成第一部经文',
    condition: { type: 'completed_sutras', threshold: 1 },
  },
  {
    id: 'hundred-days',
    name: '百日筑基',
    icon: '🏔️',
    description: '连续抄经 100 天',
    condition: { type: 'streak_days', threshold: 100 },
  },
  {
    id: 'sutra-complete',
    name: '经书圆满',
    icon: '🪷',
    description: '完成所有经文',
    condition: { type: 'completed_all_sutras' },
  },
];
```

### 添加新经文的步骤

1. 在 `src/data/sutras/` 下新建 JSON 文件（如 `lotus-sutra.json`）
2. 在 `src/data/sutras/index.js` 中 import 并添加到列表
3. 完成。不需要修改任何组件代码。

## 数据持久化

### localStorage 结构

现有 key 保持兼容，新增：

| Key | 内容 |
|-----|------|
| `zen_sutra_progress` | 每部经的当前字 index（现有，保持） |
| `zen_sutra_sessions` | 抄经 session 记录（日期、经文 ID、字数、时长） |
| `zen_sutra_streak` | 连续天数 + 最后抄经日期 |
| `zen_sutra_achievements` | 已解锁成就 ID 列表 |
| IndexedDB: `zen_sutra_strokes` | 每个字的手写字迹图片（按经文 ID + 字 index 存储），支持中途退出恢复 |

### Session 记录

每次完成回向时写入一条 session 记录：

```json
{
  "date": "2026-04-05",
  "sutraId": "heart-sutra",
  "chars": 260,
  "duration": 1920,
  "dedication": "家人平安"
}
```

热力图和连续天数从 session 记录中计算。

## 组件拆分

现有 `Sutra.jsx`（556 行）拆分为：

| 组件 | 职责 |
|------|------|
| `Sutra.jsx` | 路由入口，管理阶段切换（选经→发愿→抄经→回向） |
| `SutraSelection.jsx` | 经文列表选择 |
| `SutraDedication.jsx` | 发愿页面 |
| `SutraWriter.jsx` | 全屏书写（核心画布逻辑） |
| `SutraCompletion.jsx` | 回向 + 导出页面 |
| `SutraProgress.jsx` | 首页进度区块（热力图、连续天数、成就） |

画布相关逻辑（笔墨引擎、overlap 检测）提取为 hooks：

| Hook | 职责 |
|------|------|
| `useBrushEngine.js` | 笔墨物理（压感、速度、墨色、笔锋） |
| `useCharRecognition.js` | 字形 overlap 检测 + 自动推进 |
| `useSutraProgress.js` | 进度读写、streak 计算、成就检测 |

## 不做的事

- 不做注音/释义（用户明确不需要）
- 不做背景音乐（只有笔触音效）
- 不做社交功能（分享用系统 API，不做 app 内社区）
- 不做 WebGL 笔墨（Canvas 2D 足够，兼容性优先）
- 不做传统竖排书写方向（每次一个字，不涉及排版方向）
