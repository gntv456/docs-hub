# 设计规范 · iOS 26 液态玻璃（Liquid Glass）

> 本规范是「课表 · ClassSchedule」三端统一的视觉与交互基准。所有界面、组件、动效必须遵循本文件定义的 Design Token 与组件契约。

---

## 1. 设计原则

1. **材质即层级**：用玻璃的厚度（模糊/高光/透明度）表达 z 轴层级，而非阴影堆叠。
2. **内容优先**：玻璃服务于内容，文字与图标保持足够对比度（WCAG AA）。
3. **流体反馈**：交互以连续形变与弹簧曲线响应，杜绝生硬位移。
4. **自适应明暗**：玻璃在浅色下偏白雾、深色下偏灰镜，颜色随系统主题实时变化。
5. **优雅降级**：在不支持实时模糊的设备上，退化为带轻微噪点的纯色卡片，视觉不打架。

---

## 2. 色彩 Token

### 2.1 语义色（浅色 / 深色）

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `accent/primary` | #0A84FF | #0A84FF | 主题强调（随用户主题色覆盖） |
| `accent/onPrimary` | #FFFFFF | #FFFFFF | 强调色上的文字 |
| `bg/canvas` | #F2F4F8 | #000000 | 应用底色 |
| `bg/elevated` | #FFFFFF | #1C1C1E | 非玻璃实体面 |
| `text/primary` | #1C1C1E | #F5F5F7 | 主文字 |
| `text/secondary` | #6B6B70 | #AEAEB2 | 次文字 |
| `text/tertiary` | #A1A1A6 | #636366 | 辅助文字 |
| `semantic/success` | #30D158 | #30D158 | 完成 |
| `semantic/warning` | #FF9F0A | #FFD60A | 逾期/提醒 |
| `semantic/danger` | #FF453A | #FF453A | 删除/冲突 |
| `semantic/info` | #64D2FF | #64D2FF | 提示 |

### 2.2 玻璃材质 Token

| Token | 浅色 alpha | 深色 alpha | blur(σ) | 边框高光 |
|---|---|---|---|---|
| `glass/surface` | 0.55 | 0.45 | 14 | top 0.5 white |
| `glass/elevated` | 0.65 | 0.55 | 20 | top 0.7 white |
| `glass/thick` | 0.78 | 0.68 | 30 | top 0.9 white |
| `glass/thin` | 0.30 | 0.25 | 8 | — |

> 玻璃强度档位（用户可调）：弱→thin/surface σ×0.6；中→surface/elevated；强→elevated/thick。低端机自动锁定为「纯色 elevated」。

### 2.3 课程色板（12 色）

```
#FF6B6B #FFA94D #FFD43B #A0E85B
#4FD1C5 #38BDF8 #0A84FF #7C83FF
#B07CFF #FF6BCB #FA8AD0 #94A3B8
```

- 新建课程默认按课程名 hash 落点；
- 每色在玻璃上以「色块 18% + 文字 100%」呈现，保证可读。

---

## 3. 字体与排版（SF Pro / HarmonyOS Sans / 思源）

| Token | size | weight | line | 用途 |
|---|---|---|---|---|
| `largeTitle` | 34 | 700 | 41 | 页面大标题 |
| `title1` | 28 | 700 | 34 | 一级标题 |
| `title2` | 22 | 700 | 28 | 二级标题 |
| `title3` | 20 | 600 | 25 | 三级标题 |
| `headline` | 17 | 600 | 22 | 列表主标题 |
| `body` | 17 | 400 | 22 | 正文 |
| `callout` | 16 | 400 | 21 | 强调正文 |
| `subhead` | 15 | 400 | 20 | 副标题 |
| `footnote` | 13 | 400 | 18 | 注释 |
| `caption1` | 12 | 400 | 16 | 说明 |
| `caption2` | 11 | 400 | 13 | 角标 |

---

## 4. 圆角 / 间距 / 高度

| Token | 值 |
|---|---|
| `radius/xs` | 8 |
| `radius/sm` | 12 |
| `radius/md` | 16 |
| `radius/lg` | 22 |
| `radius/xl` | 28 |
| `radius/capsule` | height / 2（全圆） |

| Token | 值 |
|---|---|
| `space/1` | 4 |
| `space/2` | 8 |
| `space/3` | 12 |
| `space/4` | 16 |
| `space/5` | 24 |
| `space/6` | 32 |

| 高度 | 模糊 σ | 用途 |
|---|---|---|
| z0 底层 | 0 | canvas |
| z1 卡片 | 14 | 列表/课程块 |
| z2 浮层 | 20 | 抽屉/弹层 |
| z3 模态 | 30 | 全屏模态背景 |

---

## 5. 动效

| 场景 | 曲线 | 时长 |
|---|---|---|
| 普通转场 | easeOut | 220ms |
| 弹簧出现 | spring(stiffness 260, damping 26) | — |
| 抽屉上滑 | spring(stiffness 220, damping 28) | — |
| 当前课呼吸光晕 | easeInOut 无限循环 | 1600ms |
| 完成勾选 | spring(stiffness 320, damping 20) | — |
| 滑动切周 | fastOutSlowIn | 280ms |

> 所有动效遵循「Reduce Motion」系统设置：开启后压缩为淡入淡出 ≤150ms。

---

## 6. 核心组件契约

> 实现见 `lib/shared/widgets/glass/`。

### 6.1 GlassContainer

```
属性：
  elevation: z1 | z2 | z3
  radius: radius token（默认 md）
  strength: glass token
  enableBlur: bool（降级时 false）
  child: Widget
视觉：
  ClipRRect(radius)
    └ Stack
       ├ BackdropFilter(blur σ)        // 降级时省略
       ├ Container(填充色 alpha + 顶部高光渐变边)
       └ child
```

### 6.2 GlassCard（带内边距的卡片容器）

### 6.3 GlassButton（胶囊按钮）

- primary：accent 实色 + 白字；secondary：glass surface + accent 字；ghost：透明 + accent 字。

### 6.4 CourseBlock（课程块）

- 课程色玻璃 + 课名（最多 2 行省略）+ 地点 + 节次范围；
- 当前节：外层呼吸光晕（`AnimatedBuilder` + `CustomPaint`）。

### 6.5 NextClassCard（「下一节」常驻卡）

### 6.6 主导航（移动端左侧抽屉 / 宽屏玻璃侧栏）

- 移动端：页面标题栏左侧放置玻璃菜单按钮，点击后从左侧滑出主菜单；
- 宽屏：保留 `GlassNavRail` 左侧玻璃导航栏；
- 旧 `GlassTabBar` 组件仅作为兼容组件保留，移动端主流程不再占用底部空间。

### 6.7 GlassSheet（底部抽屉，课程详情/编辑）

### 6.8 SegmentControl（分段选择，视图切换）

---

## 7. 页面视觉走查清单（上线门槛）

- [ ] 所有浮层/Tab/抽屉为玻璃材质，深浅色切换无闪烁；
- [ ] 文字在玻璃上对比度 ≥ AA；
- [ ] 课表当前节呼吸光晕流畅且遵循 Reduce Motion；
- [ ] 弹簧动效无过冲错位；
- [ ] 三端截图与设计稿一致性 ≥95%（允许字体族差异）。
