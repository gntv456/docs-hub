# Docs Hub

多项目文档中枢（VitePress 单站 + 子路径隔离）。**内容不手写在本仓库**——由 `scripts/sync.mjs` 从 5 个项目仓库同步生成，源仓库是唯一权威。

## 包含的 wiki

| 路径 | 项目 | 源 | 篇数 |
|------|------|-----|------|
| `/ft/` | FluxTorrent | `D:\FluxTorrent\docs`（webmaster/customize/ops 三册 + 总览） | 44 |
| `/ptp/` | PTPatronus | `D:\PTPatronus\README`（25 篇手册）+ CHANGELOG | 26 |
| `/tanqu/` | HX-Tanqu | `D:\HX-Tanqu\docs` | 11 |
| `/jiapu/` | 好学云谱 | `D:\jiapu\docs`（+ `shots/` 截图进 hero） | 4 |
| `/kb/` | 课表 ClassSchedule | `D:\kechengbiao\docs` | 16 |

每个 wiki 另有 `/xx/en/` 英文骨架页（指向中文版，待手写补充）。

## 日常使用

```bash
npm install
npm run docs:dev      # 本地预览 http://localhost:5173

# 源仓库文档改了之后：
node scripts/sync.mjs [--clean]   # 重新同步 + 重新生成 config.ts 和各首页
npm run docs:build                # 产物 docs/.vitepress/dist
```

- `--clean` 先清空各 wiki 中文区再同步（英文 `en/` 手写区不动）。
- **不要手改** `docs/.vitepress/config.ts`、`docs/<key>/index.md`、`docs/index.md`——都是脚本生成的，下次同步会覆盖。要改结构（加 wiki、加册、换组名）改 `scripts/sync.mjs` 顶部的 `PROJECTS` 数组。
- **可以手写**的区域：`docs/<key>/en/*.md`（英文内容）、`docs/public/`。

## 同步脚本做了什么

1. 按 `PROJECTS` 递归复制各源目录的 md（去 BOM；文件名 slug 化，中文保留）。
2. README.md 落为所在目录的 `index.md`；单 section 项目平铺、多 section 按末级目录分段。
3. 两遍式：先登记全站「源文件 → href」映射，再复制并**重写 md 互链**为站内绝对路径（跨册、前向链接都能解析；指回仓库源码的链接保留原文，由 `ignoreDeadLinks` 兜底）。
4. **Vue 模板转义**：正文里裸写的 `<接口名>`/`<jwt>`（未闭合尖括号）转义为 `\<…\>`，否则 VitePress 报 "Element is missing end tag"；行首真 HTML 块、行内代码、代码围栏不动。
5. 生成 `config.ts`（nav/侧栏/本地搜索/中文界面文案）、各 wiki 中文 hero 首页（入口优先 策划/架构/PRD/快速开始）、hub 总览首页、英文骨架页。
6. `assets` 配置项把源仓库截图拷到 `docs/public/<key>/…`（public 直通产物根，绝对路径引用任何 base 下都成立）。

## 构建 / 部署（独立域名 wiki.ptang.top）

```bash
npm run docs:build    # 产物在 docs/.vitepress/dist
```

`base: '/'`（根路径部署），`docs/public/CNAME` = `wiki.ptang.top`（构建后出现在产物根）。

### 方式 A：GitHub Pages（已带 `.github/workflows/deploy.yml`）
1. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
2. DNS：`wiki.ptang.top` CNAME → `<你的user>.github.io`。
3. `git push` 到 `main` 即自动发布（CNAME 会被自动复用）。

### 方式 B：Cloudflare Pages（自定义域名最省）
1. Cloudflare 建 Pages → 连 Git 仓库；Build `npm run docs:build`，输出 `docs/.vitepress/dist`。
2. 自定义域加 `wiki.ptang.top`（可忽略 `.github/workflows`）。

> 独立子域即根路径，不用改 `base`。若改挂项目子路径（如 `user.github.io/docs-hub/`），把 `config.ts` 模板里 `base` 改为 `/docs-hub/`（改脚本里的模板字符串）。

## 新增一个 wiki

在 `scripts/sync.mjs` 的 `PROJECTS` 加一项（key/name/dir/tagline/sections/extra/assets），跑 `node scripts/sync.mjs --clean`——目录、侧栏、导航、首页、英文骨架全自动生成。
