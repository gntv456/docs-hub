# 好学课程表 Logo 规范

## 设计概念

- 核心图形：玻璃质感课表卡片，表达「课程表」的第一识别。
- 右下勾选：代表今日学习闭环、任务完成和成长反馈。
- 微光星芒：表达「好学」的积极感和电子宠物带来的陪伴感。
- 整体轮廓：圆角玻璃底，贴合项目 iOS26 液态玻璃视觉方向。

## 色彩

- 主蓝：`#0A84FF`
- 天青：`#64D2FF`
- 成长绿：`#30D158`
- 高亮黄：`#FFD640`
- 玻璃底：`#F8FCFF` 到 `#DDF4FF`

## 文件

- 矢量源文件：`assets/brand/haoxue-kechengbiao-logo.svg`
- 1024 应用图标：`assets/brand/haoxue-kechengbiao-app-icon-1024.png`
- 512 应用图标：`assets/brand/haoxue-kechengbiao-app-icon-512.png`
- 透明图形标：`assets/brand/haoxue-kechengbiao-mark-transparent-1024.png`

## 生成

Logo 和各平台启动图标由脚本统一生成：

```bash
python tools/generate_logo_assets.py
```

脚本会同步更新 Android、Web、iOS、macOS 和 Windows 的常见应用图标资源。
