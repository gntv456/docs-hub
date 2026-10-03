# 好学探索 · UI 规范（iOS 27 Liquid Glass）

## 1. 设计主题

- **关键词**：液态玻璃、悬浮导航、大圆角、克制高光、沉浸内容
- **内容优先**：Feed 内视频全屏，控件半透明叠加
- **材质**：`backdrop-filter: blur(28px) saturate(180%)`

## 2. 色板

```css
:root {
  --bg0: #07080c;
  --bg1: #12141c;
  --glass: rgba(255,255,255,0.10);
  --glass-strong: rgba(255,255,255,0.16);
  --stroke: rgba(255,255,255,0.22);
  --text: rgba(255,255,255,0.96);
  --text-dim: rgba(255,255,255,0.62);
  --accent: #7C5CFF;          /* 品牌紫（实际主题色，规范对齐实现）*/
  --like: #FF4D6D;
  --ok: #30d158;              /* 成功/正向（iOS system green）*/
  --warning: #FFD56A;
  --radius-sheet: 28px;
  --radius-btn: 18px;
  --tab-h: 64px;
  --safe-b: env(safe-area-inset-bottom, 0px);
}
```

浅色模式反转玻璃为深色 8% 透明 + 白底渐变。

## 3. 布局

### Feed（抖音式）
- 每页 `100dvh`
- 右侧互动栏距右 12px，按钮 48×48
- 底文案区距底 `tab + 24`
- 进度条贴底 2px 可拖

### 发现（小红书式）
- 双列 2 间距 10px
- 卡片圆角 20px，封面 4:5

### 片库
- 左侧/顶部分类 chips（可显隐状态用斜线图标）
- 列表/宫格切换

### 登录
- 居中玻璃卡片
- Logo + 好学探索
- 账号/密码/两步验证
- 服务器地址高级折叠（参考 jiapu）

## 4. 动效

- 页面切换：150–280ms spring
- 点赞：缩放 0.9→1.15→1 + 粒子心
- 下拉刷新：玻璃弹性指示

## 5. 组件清单

1. `GlassTabBar`
2. `VideoFeedPage`
3. `ActionRail`（赞评藏转）
4. `CategoryChip`
5. `MediaCard`
6. `ScrapeSheet`
7. `CaptureCamera`
8. `LoginGlassCard`
9. `SourceManager`

## 6. 无障碍

- 所有图标按钮 `aria-label`
- 焦点环可见
- 减弱动效：`prefers-reduced-motion`
