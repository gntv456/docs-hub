# 电子宠物资产规范

## 图鉴规模

- 系列：神话、恐龙、海洋、动物、植物、宝宝。
- 当前代码图鉴每个系列 24 个，共 144 个宠物。
- 每只宠物必须支持 6 个动作状态：`idle`、`working`、`thinking`、`waiting`、`done`、`sleeping`。
- 当前项目已生成 144 只宠物 × 6 状态，共 864 个 animated WebP。

## 文件命名

真实资产接入时优先使用 animated WebP。应用会按以下顺序加载：

1. `assets/pets/{pet_id}/{state}.webp`
2. `assets/pets/{pet_id}/{state}.png`
3. 代码动态渲染兜底

```text
assets/pets/{pet_id}/{state}.webp
assets/pets/{pet_id}/{state}.png
```

示例：

```text
assets/pets/myth_01/idle.webp
assets/pets/myth_01/working.webp
assets/pets/myth_01/thinking.webp
assets/pets/myth_01/waiting.webp
assets/pets/myth_01/done.webp
assets/pets/myth_01/sleeping.webp
```

## 动画要求

- 首选 animated WebP，循环播放。
- 每个状态建议 12-24 fps。
- `idle`、`working`、`thinking`、`waiting`、`sleeping` 建议 1.2-2.4 秒循环。
- `done` 建议 0.8-1.2 秒循环或一次性跳跃循环，第一帧和末帧要能自然衔接。
- 画布建议 512x512 或 768x768，透明背景。
- 主体占画布高度 78%-88%，四周保留安全边距。
- 小尺寸预览时不能依赖细碎特效表达动作，主体姿态必须明显变化。

## 视觉风格

- 3D 动漫风格，参考圆润幼龙、小蛇、幼犬、海豚等方向。
- 无背景、透明底、无文字、无水印。
- 缩小到 48px 仍能看清主体轮廓。
- 主体居中，四周保留安全边距，不裁切角、尾巴、耳朵、鳍、叶片。
- 大眼睛、圆润体块、清晰高光、低噪声材质。
- 避免复杂毛发碎边、过细配件、背景阴影、地面投影。

## 动作状态

| 状态 | 要求 |
|---|---|
| `idle` | 待机呼吸，正面或 3/4 视角 |
| `working` | 敲代码中，可有小设备，但设备上不能出现文字，手部/爪子有敲击节奏 |
| `thinking` | 歪头，可出现问号符号，问号轻微漂浮 |
| `waiting` | 等待输入，轻微左右摆动或眨眼 |
| `done` | 开心跳一下，表情更开心，有短促庆祝动效 |
| `sleeping` | 趴下睡觉，轻微呼吸，轮廓仍清楚 |

## 批量生成提示词模板

```text
Create a cute 3D anime virtual pet animated sprite, transparent-background ready, no text, no watermark.
Subject: {pet_name}, {series_name}, rounded baby proportions, glossy soft material, big expressive eyes.
Action state: {state_description}.
Animation: seamless looping animated WebP, 12-24 fps, clear body motion, readable at 48px.
Composition: centered full-body character, generous padding, strong readable silhouette at 48px.
Style: high-quality 3D cartoon render, soft studio lighting, crisp edges, simple shapes.
Constraints: no background, no floor, no cast shadow, no typography, no logo, no cropped parts.
```

## 本地批量生成

项目内置了批量占位动图生成脚本，用于在真实 AI/美术资产未完全替换前保证所有宠物都有动态表现：

```bash
python tools/generate_all_pet_assets.py
```

- 默认跳过已存在文件。
- 发布默认输出：320x320 透明 animated WebP，12 帧循环，约 83ms/帧，`quality=50`，生成前做 64 色预量化，以降低安装包体积。
- 如需重建全部宠物动图：

```bash
python tools/generate_all_pet_assets.py --overwrite
```

- 默认宠物 `myth_01` 可用 `tools/generate_pet_preview_assets.py` 生成更高帧数预览版，发布默认输出 384x384、24 帧、`quality=65`、96 色预量化。

```bash
python tools/generate_pet_preview_assets.py
```

- 如需美术验收用的 512x512 高质量版本，可临时使用：

```bash
python tools/generate_all_pet_assets.py --overwrite --output-size 512 --frames 12 --quality 72 --colors 0
python tools/generate_pet_preview_assets.py --output-size 512 --frames 24 --quality 90 --colors 0 --lossless
```

- 常用参数：
  - `--output-size`：输出画布尺寸，生成逻辑仍以 512x512 绘制后缩放，避免裁切。
  - `--frames`：每个状态循环帧数。
  - `--quality`：WebP 有损质量，0-100。
  - `--colors`：WebP 编码前的色彩预量化数量，`0` 表示关闭。

Flutter 不会递归打包 `assets/pets/` 下的多级目录。新增宠物目录时，需要同步把 `assets/pets/{pet_id}/` 写入 `pubspec.yaml` 的 `flutter.assets`，否则 Release 包会缺失对应 WebP 并退回代码兜底绘制。
