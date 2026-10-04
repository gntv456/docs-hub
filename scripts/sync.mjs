// docs-hub 同步脚本
// 从 5 个项目仓库同步真实文档到 VitePress 站点，并生成 config.ts（导航/侧栏/多语言）、
// 各 wiki 中文首页与 hub 总览首页。
//
// 用法：node scripts/sync.mjs [--clean]
//   --clean  先清空 docs/{key} 中文区再同步；en/ 英文手写区不受影响
//
// 原则：
//   - 源仓库是唯一权威，本站是渲染副本；改文档去源仓库改，然后重跑本脚本。
//   - en/ 英文区是手写骨架（overview/dev），脚本不碰。
//   - 文件名 slug 化（中文保留、大写/空格 → 连字符小写）；README.md 落为所在目录的 index.md。
//   - URL 布局：单 section 项目直接平铺到 /{key}/；多 section 项目按末级目录分段 /{key}/{seg}/。
//   - 两遍式：先整仓登记「源文件绝对路径 → 站内 href」映射，再复制并重写 md 互链，
//     跨章节、指向"后面才同步的文件"的链接也能解析。

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DOCS = join(ROOT, 'docs')

// ---------------------------------------------------------------- 项目定义
// key: 子路径；name: 显示名；dir: 源仓库绝对路径；tagline/heroImage: 生成首页用
// sections: [源目录(相对 dir), 侧栏组名]；extra: [源文件, 组名] 散页
// assets: [源目录, 目标目录(相对 docs/{key}), 文件名正则] 静态资源
// exclude: 正则（对源文件相对项目的路径匹配）——**内部过程文档不进公开 wiki**：
//   一次性测试/修复报告、审查/立项/推进记录、竞品评测等属于仓库工作档案，
//   公开只会误导（过期状态、内部口径）且拉低信噪比。匹配即整文件跳过。
const PROJECTS = [
  {
    key: 'ft', name: 'FluxTorrent', dir: 'D:/FluxTorrent',
    tagline: 'Rust + Next.js 的 NexusPHP 兼容私种站',
    sections: [
      ['docs/webmaster', '站长手册'],
      ['docs/customize', '自定义手册'],
      ['docs/ops', '运维手册'],
    ],
    extra: [['docs/README.md', '总览']],
    // wiki 定位=对外：让站长了解项目、装起来、排障。内部过程/决策档案不进
    //（wiki-plan 建设方案、quality-gates/search-eval 内部评估批 E14/E9）
    exclude: [/webmaster[\\/]wiki-plan\.md$/, /ops[\\/](quality-gates|search-eval)\.md$/],
  },
  {
    key: 'ptp', name: 'PTPatronus', dir: 'D:/PTPatronus',
    tagline: 'PT 守护神：Go 后端 + Vue3 Web + Flutter 六端客户端',
    sections: [['README', '手册']],   // README/ 是目录（25 篇手册）；根 README.md 不收
    extra: [['CHANGELOG.md', '发布']],
    // 立项/推进/评估记录 = 内部过程文档（状态随仓库推进过期，口径内部）
    exclude: [/后端错误消息码化立项|移动端无障碍推进|前端i18n接入评估/],
  },
  {
    key: 'tanqu', name: 'HX-Tanqu', dir: 'D:/HX-Tanqu',
    tagline: '私有化短视频 / 短剧探索终端（好学探索）',
    sections: [['docs', '文档']],
    // 竞品评测/验收报告/测试记录/内部评估 = 内部工作档案，非对外文档
    exclude: [/竞品对标与可借鉴项评测报告|验收报告|刮削系统测试|多端方案|策划文档/],
  },
  {
    key: 'jiapu', name: '好学云谱', dir: 'D:/jiapu',
    tagline: '液态玻璃家谱 / 族谱管理',
    sections: [['docs', '文档']],
    assets: [['shots', 'assets', /\.png$/i]],
    heroImage: '/jiapu/assets/02-dashboard.png',
  },
  {
    key: 'kb', name: '课表 ClassSchedule', dir: 'D:/kechengbiao',
    tagline: 'iOS 26 液态玻璃课程表 App（Flutter 三端）',
    sections: [['docs', '文档']],
    // 一次性测试/修复/审查报告、内部评估 = 过期即失效的工作档案，不进公开 wiki
    exclude: [/fix-report-|test-report-|[\\/]review\.md$|[\\/]competitive-analysis\.md$|[\\/]p3-roadmap\.md$/],
  },
]

// ---------------------------------------------------------------- 工具
const slugify = (s) => s
  .replace(/\.md$/i, '')
  .normalize('NFKC').toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
  .replace(/^-+|-+$/g, '') || 'page'

const normAbs = (p) => p.replaceAll('\\', '/').replace(/\/+$/, '')

// 手工解析相对路径（path.resolve 也可，但这里保持纯字符串、跨盘符安全）
function resolveFrom(srcDir, rel) {
  return (srcDir + '/' + rel).split('/').reduce((acc, seg) => {
    if (seg === '' || seg === '.') return acc
    if (seg === '..') acc.pop()
    else acc.push(seg)
    return acc
  }, []).join('/')
}

// 读文件去 BOM（tanqu 部分文档带 UTF-8 BOM）
function readText(p) {
  let s = readFileSync(p, 'utf8')
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  return s
}

const firstH1 = (p) => readText(p).match(/^#\s+(.+)$/m)?.[1]?.trim()

// Vue 模板转义：markdown 行内裸写的 `<接口名>`（中文泛型/占位符）会被 VitePress 当 HTML
// 标签解析，未闭合即报 "Element is missing end tag"（PTP 手册大量此写法）。
// 只处理正文行：代码围栏、行内代码、真实 HTML 标签（本行内有 > 闭合）不动。
function escapeBareOpenAngle(text) {
  const lines = text.split('\n')
  let inFence = false
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line }
    if (inFence) return line
    // 按行内代码 `...` 分段，只处理代码段之外的文本
    return line.split(/(`[^`]*`)/).map((seg, i) => {
      if (i % 2 === 1) return seg
      // 段在行内的起始偏移，用于判断标签是否处于行首（真 HTML 块基本都在行首）
      const segOff = line.slice(0, line.indexOf(seg))
      return seg.replace(/<([A-Za-z\u4e00-\u9fff][\w\u4e00-\u9fff-]*)([^<>]*)(>?)/g, (m, name, mid, gt, off) => {
        const before = segOff + seg.slice(0, off)
        const atLineStart = /^([\s>*-]|\d+\.|[#>]+ )*$/.test(before)
        if (atLineStart && gt) return m   // 行首完整标签 → 真 HTML 块，放行
        // 其余（未闭合泛型 / 行中间提及的 <td>、<a download> 等）→ 转义开头，
        // Vue 模板编译器不认未闭合元素，行内提及也没有放行理由
        return '\\<' + name + mid + (gt ? '\\>' : '')
      })
    }).join('')
  }).join('\n')
}

// Vue 插值转义：md 里的 {{...}}（docker --format '{{.State.Error}}'、Go 模板）
// 会被 Vue 编译器当 JS 表达式解析，语法不合法直接构建失败。围栏代码块里
// VitePress 同样插值，也要包；行内代码 `...` 里 Vue 不插值——但为省心统一
// 处理（包 span 在行内代码里会被反引号原样显示，不可接受），行内代码改用
// 零宽转义：在两个花括号间插零宽空格拆开插值定界符，肉眼不可见、复制略有噪声，
// 只影响走 {{ 语法的 md（罕见）。
function escapeVueInterpolation(text) {
  const lines = text.split('\n')
  let inFence = false
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; return line }
    return line.split(/(`[^`]*`)/).map((seg, i) => {
      if (i % 2 === 1)
        // 行内代码内：插零宽空格拆定界符（v-pre 标签会被反引号字面显示）
        return seg.replace(/\{\{([^{}]*)\}\}/g, '{\u200b{$1}\u200b}')
      return seg.replace(/\{\{([^{}]*)\}\}/g, '<span v-pre>{{$1}}</span>')
    }).join('')
  }).join('\n')
}

// ---------------------------------------------------------------- 清理
if (process.argv.includes('--clean')) {
  for (const p of PROJECTS) {
    const zhDir = join(DOCS, p.key)
    if (!existsSync(zhDir)) continue
    for (const e of readdirSync(zhDir, { withFileTypes: true })) {
      if (e.name === 'en') continue   // 英文手写区不动
      const fp = join(zhDir, e.name)
      e.isDirectory() ? rmSync(fp, { recursive: true, force: true }) : unlinkSync(fp)
    }
  }
}

// ---------------------------------------------------------------- 同步
const sidebars = {}
for (const p of PROJECTS) {
  const zhDir = join(DOCS, p.key)
  mkdirSync(zhDir, { recursive: true })

  // 源 md 绝对路径(小写) → 站内 href；plan: 待复制清单 {src, dest}
  const hrefMap = new Map()
  const plan = []
  const groups = []
  const flat = p.sections.length === 1   // 单 section：平铺到 /{key}/，侧栏不加组层

  // 第一遍：走目录树，登记映射 + 组侧栏（不写文件）
  const collectDir = (sd, dd, urlPrefix) => {
    const entries = readdirSync(sd).sort()
    const files = entries.filter((f) => statSync(join(sd, f)).isFile() && f.endsWith('.md'))
    const dirs = entries.filter((f) => statSync(join(sd, f)).isDirectory())
    const items = []
    // exclude 判定：把源绝对路径归一成正斜杠后，对「相对项目根路径」和
    // 「全路径」都试一遍（Windows join 出反斜杠、PROJECTS 里 dir 是正斜杠，
    // slice 前必须先归一否则切错位）。统一小写比较——slugify 会把文件名
    // 落成小写 URL，exclude 正则按小写写即可（源文件名可能全大写）。
    const excluded = (src) => {
      const norm = src.replace(/\\/g, '/').toLowerCase()
      const rel = norm.slice(p.dir.length + 1)
      return (p.exclude ?? []).some((re) => re.test(rel) || re.test(norm))
    }
    const readme = files.find((f) => f.toLowerCase() === 'readme.md')
    if (readme && !excluded(join(sd, readme))) {
      const src = join(sd, readme)
      const href = urlPrefix.replace(/\/$/, '')
      hrefMap.set(normAbs(src).toLowerCase(), href)
      plan.push({ src, dest: join(dd, 'index.md') })
      items.push({ text: firstH1(src) ?? '首页', link: href + '/' })
    }
    for (const f of files) {
      if (f.toLowerCase() === 'readme.md') continue
      const src = join(sd, f)
      if (excluded(src)) continue
      const slug = slugify(f)
      const href = `${urlPrefix}${slug}`
      hrefMap.set(normAbs(src).toLowerCase(), href)
      plan.push({ src, dest: join(dd, slug + '.md') })
      items.push({ text: firstH1(src) ?? f.replace(/\.md$/, ''), link: href })
    }
    for (const d of dirs) {
      const sub = collectDir(join(sd, d), join(dd, d), `${urlPrefix}${d}/`)
      if (sub.items.length) items.push({ text: d, collapsed: false, items: sub.items })
    }
    return { items }
  }

  for (const [srcRel, groupTitle] of p.sections) {
    const srcDir = join(p.dir, srcRel)
    if (!existsSync(srcDir)) { console.warn(`[warn] 源目录不存在，跳过：${srcDir}`); continue }
    let destDir, urlPrefix
    if (flat) {
      destDir = zhDir
      urlPrefix = `/${p.key}/`
    } else {
      const seg = srcRel.split('/').pop()
      destDir = join(zhDir, seg)
      urlPrefix = `/${p.key}/${seg}/`
    }
    const sub = collectDir(srcDir, destDir, urlPrefix)
    if (sub.items.length) {
      if (flat) groups.push(...sub.items)
      else groups.push({ text: groupTitle, items: sub.items })
    }
  }

  // 散页（仓库根/浅层单文件）平铺到 docs/{key}/ 根
  for (const [srcRel, groupTitle] of p.extra ?? []) {
    const src = join(p.dir, srcRel)
    if (!existsSync(src)) continue
    const base = slugify(srcRel.split('/').pop())
    hrefMap.set(normAbs(src).toLowerCase(), `/${p.key}/${base}`)
    plan.push({ src, dest: join(zhDir, base + '.md') })
    const item = { text: firstH1(src) ?? srcRel, link: `/${p.key}/${base}` }
    if (flat) groups.push(item)
    else groups.push({ text: groupTitle, items: [item] })
  }

  // 第二遍：复制 + 重写互链（此刻 hrefMap 已完整，跨章节/前向链接都能解析）
  for (const { src, dest } of plan) {
    let text = readText(src)
    const srcDir = dirname(normAbs(src))
    text = text.replace(/(\]\()([^)\s]+)([^)]*\))/g, (m, head, target, tail) => {
      if (/^(https?:|mailto:|#|\/)/i.test(target)) return m
      const sharp = target.indexOf('#')
      const pathPart = sharp === -1 ? target : target.slice(0, sharp)
      const hashPart = sharp === -1 ? '' : target.slice(sharp)
      if (!pathPart) return m
      const abs = resolveFrom(srcDir, pathPart)
      const mapped = hrefMap.get(abs.toLowerCase())
      return mapped ? `${head}${mapped}${hashPart}${tail}` : m
      // 查不到（指到仓库源码等站外文件）→ 保留原文，构建由 ignoreDeadLinks 兜底
    })
    // Vue 模板转义：md 里裸写的 `<接口名>`（中文泛型/占位符）会被当未闭合 HTML 标签，构建报错
    text = escapeBareOpenAngle(text)
    // Vue 插值转义：正文 {{...}}（Go/docker 模板）会被当 Vue 表达式，包 v-pre
    text = escapeVueInterpolation(text)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, text)
  }

  // 静态资源：拷到 docs/public/{key}/{destRel}/——public 原样直通产物根，
  // 引用 /{key}/{destRel}/x.png 在任何 base 下都成立（docs/{key}/ 下的 md 不会当静态资源打包）
  for (const [srcRel, destRel, filter] of p.assets ?? []) {
    const srcDir = join(p.dir, srcRel)
    if (!existsSync(srcDir)) continue
    const destDir = join(DOCS, 'public', p.key, destRel)
    mkdirSync(destDir, { recursive: true })
    for (const f of readdirSync(srcDir)) {
      if (statSync(join(srcDir, f)).isFile() && (!filter || filter.test(f))) {
        cpSync(join(srcDir, f), join(destDir, f))
      }
    }
  }

  // 中文首页（hero）：若源 README 已落为根 index.md 则跳过（README 即首页）
  const rootIndex = join(zhDir, 'index.md')
  if (!plan.some(({ dest }) => dest === rootIndex)) {
    const leaves = (items) => items.reduce((n, it) => n + (it.items ? leaves(it.items) : 1), 0)
    // 入口文档优先级：README/策划/架构/PRD/快速开始，否则取第一篇
    const allItems = (flat ? groups : groups.flatMap((g) => g.items ?? [g]))
    const prefer = ['readme', '策划文档', '架构设计', '技术架构', 'prd', '快速开始', '00-项目总览', '总览']
    const entry = allItems.find((it) => it.link && prefer.some((k) => it.link.toLowerCase().includes(k)))
      ?? allItems.find((it) => it.link) ?? { link: `/${p.key}/` }
    const hero = `---
layout: home
hero:
  name: ${p.name}
  text: ${p.tagline}
${p.heroImage ? `  image:\n    src: ${p.heroImage}\n    alt: ${p.name}\n` : ''}  actions:
    - theme: brand
      text: 开始阅读
      link: ${entry.link}
features:
${(flat ? groups.filter((g) => g.items) : groups).map((g) => `  - title: ${g.text}\n    details: ${leaves(g.items)} 篇\n    link: ${g.items?.[0]?.link ?? g.link ?? `/${p.key}/`}`).join('\n')}
---
`
    writeFileSync(rootIndex, hero)
  }

  // en 首页骨架：若中文区有 hero，同步一份带「中文版入口」的骨架（脚本管理，可安全重生成）
  const enIndex = join(zhDir, 'en', 'index.md')
  if (!existsSync(enIndex)) {
    mkdirSync(join(zhDir, 'en'), { recursive: true })
    writeFileSync(enIndex, `---
layout: home
hero:
  name: ${p.name}
  text: ${p.tagline}
  actions:
    - theme: brand
      text: 中文文档
      link: /${p.key}/
features:
  - title: Documentation
    details: English content is not ready yet — the Chinese docs are the source of truth.
    link: /${p.key}/
---
`)
  }
  for (const f of ['overview.md', 'dev.md']) {
    const fp = join(zhDir, 'en', f)
    if (!existsSync(fp)) writeFileSync(fp, `# ${p.name}\n\n> English content is not ready yet — see the [Chinese docs](/${p.key}/).\n\n- Introduction: /${p.key}/en/overview\n- Development: /${p.key}/en/dev\n`)
  }

  sidebars[p.key] = groups
}

// ---------------------------------------------------------------- 生成 config.ts
// 不用 VitePress locales 机制：它的语言切换菜单会按「保留当前页路径」跨语言跳转，
// 页面在目标语言不存在即 404（如 /ft/readme → /ptp/readme）。多 wiki 单站用纯路径侧栏即可，
// wiki 间导航靠 nav，语言切换靠各 wiki 自己侧栏里的入口。
const nav = PROJECTS.map((p) => ({ text: p.name, link: `/${p.key}/` }))

const sidebar = {}
for (const p of PROJECTS) {
  const enSb = [
    { text: 'Guide', items: [
      { text: 'Home', link: `/${p.key}/en/` },
      { text: 'Introduction', link: `/${p.key}/en/overview` },
      { text: 'Development', link: `/${p.key}/en/dev` },
    ] },
  ]
  sidebar[`/${p.key}/`] = sidebars[p.key]
  sidebar[`/${p.key}/en/`] = enSb
}

const config = `import { defineConfig } from 'vitepress'

const NAV = ${JSON.stringify(nav)}

// 本文件由 scripts/sync.mjs 生成——手改会被下次同步覆盖；要改结构请改脚本里的 PROJECTS。
export default defineConfig({
  base: '/',
  title: 'Docs Hub',
  description: 'FluxTorrent 与周边项目文档中枢',
  cleanUrls: true,
  appearance: true,
  // 源文档里指回仓库源码（../lib/... 等）的相对链接在站内无目标，构建不因死链失败
  ignoreDeadLinks: true,
  themeConfig: {
    nav: NAV,
    sidebar: ${JSON.stringify(sidebar)},
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/your-org' }],
    outline: { label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到亮色',
    darkModeSwitchTitle: '切换到暗色',
  },
})
`

writeFileSync(join(DOCS, '.vitepress', 'config.ts'), config)

// ---------------------------------------------------------------- hub 总览首页
const leavesOf = (items) => items.reduce((n, it) => n + (it.items ? leavesOf(it.items) : 1), 0)
const hubIndex = `---
layout: home
hero:
  name: Docs Hub
  text: 多项目文档中枢
  tagline: FluxTorrent 与周边项目的 wiki 合集 · 中文为主 + 英文骨架
  actions:
    - theme: brand
      text: FluxTorrent
      link: /ft/
    - theme: alt
      text: PTPatronus
      link: /ptp/
features:
${PROJECTS.map((p) => `  - title: ${p.name}\n    details: ${p.tagline} · ${leavesOf(sidebars[p.key])} 篇\n    link: /${p.key}/`).join('\n')}
---
`
writeFileSync(join(DOCS, 'index.md'), hubIndex)

const summary = PROJECTS.map((p) => `${p.key} ${leavesOf(sidebars[p.key])}页`).join(' · ')
console.log('synced:', summary, `共 ${PROJECTS.reduce((n, p) => n + leavesOf(sidebars[p.key]), 0)} 页`)
