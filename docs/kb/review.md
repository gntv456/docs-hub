# 审查报告 · 产品经理 + 测试专家

| 项 | 内容 |
|---|---|
| 审查对象 | 课表 · ClassSchedule v1.0.0（MVP 开发完成版本） |
| 审查日期 | 2026-07-03 |
| 审查角色 | 资深产品经理 / 资深测试专家 |
| 审查依据 | [PRD.md](/kb/prd) / [DESIGN-SPEC.md](/kb/design-spec) / [TECH-ARCH.md](/kb/tech-arch) |
| 基线 | `flutter analyze` 0 issues；`flutter test` 56 passed；`build_runner` 生成成功；Windows debug 构建通过 |

---

## 一、产品经理审查

### 1.1 完整性（对照 P0 范围）

| P0 功能 | 状态 | 备注 |
|---|---|---|
| 周视图网格 | ✅ | PageView 切周、节次轴、当前课高亮、空白建课 |
| 课程 CRUD | ✅ | 含多片段、单双周、颜色、图标、冲突检测 |
| 学期/周次 | ✅ | 开学日期推算、当前周、学期切换、手动覆盖 |
| 作业/考试 CRUD | ✅ | 关联课程、DDL、倒计时、状态 |
| 本地提醒 | ✅ | 上课前 / DDL / 考试，含勿扰 |
| 深浅色 + 玻璃主题 | ✅ | 三档强度生效，降级完备 |
| 数据导入导出 | ✅ | JSON 往返 + ICS |
| 单双周 | ✅ | 展开为具体周次集合 |

### 1.2 流程闭环

- ✅ 首启 → 自动建默认学期/作息/设置 → 进入空课表（FAB 引导建课）
- ✅ 建课 → 周视图即时出现 → 「下一节」卡更新 → 通知重排
- ✅ 编辑/删除课程 → 关联 slots 级联清理，任务/考试保留
- ✅ 导出 JSON → 重装/换机 → 导入 → 数据一致

### 1.3 体验一致性（vs 设计规范）

- ✅ Tab/抽屉/卡片统一玻璃材质；明暗切换无闪烁
- ✅ 胶囊按钮 / 分段控件 / 「下一节」卡与规范一致
- ⚠️ **当前课「呼吸光晕」目前为静态强调（边框+阴影）**，未实现规范要求的周期性呼吸动画 —— 体验扣分项。

### 1.4 产品发现（PM-Findings）

| ID | 级别 | 发现 | 建议 |
|---|---|---|---|
| PM-1 | P1 | 设置中「课表样式（网格/列表/紧凑）」可切换但**实际只渲染网格**，误导用户 | 移除该选项，或仅保留并标注；列表/紧凑列入 P2 |
| PM-2 | P2 | PRD 提「首启引导页」，当前用「自动初始化」替代，无显式引导 | 可接受；后续加 3 屏引导提升留存 |
| PM-3 | P2 | 月历「有课」判定不区分周次，整月标点 | 选周后精确化（P1 增强） |

---

## 二、测试专家审查

### 2.1 代码质量

- ✅ 分层清晰（presentation/application/domain/data），单向依赖
- ✅ Riverpod 编译期安全；无 BuildContext 跨异步泄漏（已修）
- ✅ Drift 类型安全 + 外键 cascade/setNull 策略完备
- ✅ `flutter analyze` 0 issues

### 2.2 缺陷清单

| ID | 级别 | 模块 | 缺陷 | 触发条件 | 后果 |
|---|---|---|---|---|---|
| **QA-1** | 🔴 P0 | 设置/主题 | 主题色存储为 `Color.toString()`（`"Color(0xFF0A84FF)"`），`_parseColor` 用 `int.tryParse` 解析失败 → 永远回退默认色 | 用户在设置切换任意主题色 | **主题色切换完全失效** |
| **QA-2** | 🔴 P0 | 课表主页 | `PageController(initialPage: currentWeek-1)` 与 `animateToPage(currentWeek-1)`，当 `currentWeek=0`（学期未开学/日期早于开学）时为 `-1` | 学期开学日期晚于今天 | **断言异常/启动崩溃** |
| QA-3 | 🟠 P1 | 通知 | 通知 id 用 `s.id % 100000`，理论上 slot/task/exam 三段在 id≥100000 时可能撞 id | 极端数据量 | 个别提醒被覆盖 |
| QA-4 | 🟠 P1 | 课表主页 | 「下一节」卡 onTap：`push('/course/${course?.id ?? -1}')`，course 为 null 时跳转 `-1` 路由 | slot 存在但课程已删（不应发生，外键保护） | 路由异常 |
| QA-5 | 🟡 P2 | 课程编辑 | 自定义周次（custom）未提供勾选 UI，仅 every/odd/even | 用户需「1-3,5,7,9 周」 | 灵活性不足 |
| QA-6 | 🟡 P2 | 数据导入 | 导入为覆盖式重建，无「合并/预览」 | 误操作 | 数据被覆盖（已有确认对话框，可接受） |
| **QA-7** | 🟠 P1 | 周次显示 | `WeekCodec.humanize/encode` 未去重，重复周次致区间碎片化（"1,2,2,3"→"1-2, 2-3"） | 课程编辑/详情含重复周 | 显示错乱（由单测捕获并修复） |

### 2.3 边界与异常（已覆盖）

- ✅ 空学期 / 空课表 / 无任务 → 各页空状态
- ✅ 跨节课程块高度自适应；课时缺作息则跳过
- ✅ 通知权限拒绝 → 设置开关可重开
- ✅ 冲突检测覆盖「与他课」「自身草稿间」两种

### 2.4 性能

- ✅ Drift StreamProvider 增量；周视图 PageView 预渲染相邻页
- ⚠️ 「下一节」卡 `clockTickerProvider` 每 30s 触发 `nextClassProvider` 全量重算（含多 family watch）—— 可接受，但低端机可优化为仅刷新倒计时文本。

### 2.5 测试用例集（关键路径，回归基线）

| 用例 | 步骤 | 预期 |
|---|---|---|
| TC-01 首启 | 全新安装启动 | 自动建默认学期，进入空课表，无崩溃 |
| TC-02 建课 | FAB→填名+色+周一1-2节+每周→保存 | 周一第1-2节出现彩色块 |
| TC-03 冲突 | 再建一课周一1节 | 弹冲突确认 |
| TC-04 下一节 | 当前时间处于某课前后 | 卡片显示课程/倒计时/进行中 |
| TC-05 切周 | 左右滑 / 「本周」按钮 | 网格与日期条同步 |
| TC-06 主题色 | 设置→换色 | 全局强调色即时变化（修复 QA-1 后） |
| TC-07 玻璃强度 | 设置→弱/强 | 玻璃模糊与透明度变化 |
| TC-08 任务 | 新建作业+DDL→勾选完成 | 列表排序/划线/状态 |
| TC-09 导出导入 | 导出 JSON→卸载重装→导入 | 数据一致 |
| TC-10 通知 | 建课+设提前 1 分钟 | 到点触发本地通知 |
| TC-11 未开学学期 | 学期开学日期设为未来 | 启动不崩溃，落在第 1 周（修复 QA-2 后） |

---

## 三、修复记录

> 修复后由开发工程师回填。

| ID | 状态 | 修复说明 |
|---|---|---|
| QA-1 | ✅ 已修 | 主题色存取统一为 `toARGB32()` 十进制字符串（settings_page + appInit） |
| QA-2 | ✅ 已修 | `currentWeek` 在 `PageController`/`animateToPage` 前 clamp 到 `[1,totalWeeks]`，未开学落第 1 周，杜绝 `-1` 越界 |
| QA-3 | ✅ 已修 | 通知 id 去模，按表分段（slot 原值 / task `100000+`·`110000+` / exam `200000+`·`210000+`），避免碰撞 |
| QA-4 | ✅ 已修 | 「下一节」卡 `course` 为 null 时不跳转路由 |
| PM-1 | ✅ 不适用 | 设置未暴露「课表样式」选项（默认 grid），无误导；列表/紧凑列入 P2 |
| 呼吸动画 | ✅ 已修 | 当前课块改为 `StatefulWidget` + `AnimationController` 1.6s 周期呼吸（边框/外发光脉动），落地设计规范 |
| 回归 | ✅ | `flutter analyze` 重新归零（No issues found） |
| QA-7 | ✅ 已修 | `humanize`/`encode` 改为先 `toSet()` 去重；`week_codec_test` 锁定 |
| 单元测试 | ✅ | 新增 34 条单测（week_math / conflict / color_hash / week_codec / settings 解析），`flutter test` 全绿；含 QA-1/QA-7 防回归 |

## 四、P2 增强交付（本轮完成）

| 项 | 状态 | 说明 |
|---|---|---|
| QA-5 自定义周次 | ✅ | 课程编辑器「自定义」勾选网格（1..N 周 tap 切换），`_patternOf` 反推显示态 |
| QA-6 导入预览 | ✅ | 导入前显示条目统计（学期/课程/片段/作业/考试/作息）+ 覆盖警告 + 二次确认 |
| PM-2 首启引导 | ✅ | 3 屏引导页 `OnboardingPage`，首启展示、可跳过，完成后置 `onboardingShown` |
| PM-3 月历精确 | ✅ | 色点按「该日期对应学期周次」判定，不再「任意周」误显 |
| 作息时间自定义 | ✅ | 设置→作息时间表：每节起止 24h TimePicker、增删节次、保存即同步 `maxPeriods` |
| 鸿蒙桌面卡片 | ✅ | `ohos/widget` ArkTS 卡片 + FormAbility + Flutter↔卡片共享文件桥接（见 [HARMONYOS.md](/kb/harmonyos)） |
| 回归 | ✅ | `flutter analyze` 0；`flutter test` 34 全绿 |

> P3（卡片点击跳转、多卡片样式、教务系统对接、AI 课表识别、账号云同步真后端）排入后续迭代。

---

## 五、产品体验官复审（2026-07-03，第二轮）

> 在 PM/测试审查之上，从真实使用动线再做一轮体验深审，发现并修复 22 项体验短板。下表为修复记录。

### 5.1 体验阻断级

| ID | 发现 | 修复 |
|---|---|---|
| UX-1 | 导出 JSON 文件名含冒号，Windows 上 `FileSystemException`（核心备份在主平台不可用） | 统一改用 `safeFileStamp`（无非法字符）；ICS 文件名亦加时间戳，不再互相覆盖 |
| UX-2 | 全 App 无「新建学期」入口，用户永远只有一个默认学期 | 新增学期管理 sheet + `TermEditorSheet`（名称/开学日/总周数/归档），支持新建、编辑、切换 |
| UX-3 | `setCurrentWeekOverride` 已实现却无 UI，开学日期错时无法自救 | 学期编辑器提供「当前周：自动/手动指定」，写入 `currentWeekOverride` |
| UX-4 | 主界面看不到「第几周」，单双周课无法判断 | 顶部新增「第 N 周 · 单/双」胶囊，点开跳转 |
| UX-5 | 「下一节」卡只算当前周，周日晚上误报「暂无课程」 | `computeNextClass` 改为从当前周扫描到学期末，取最早一节；与通知调度视野一致 |

### 5.2 功能闭环缺口

| ID | 发现 | 修复 |
|---|---|---|
| UX-6 | 任务无过滤，已完成项永久堆积 | 任务列表过滤条：全部 / 未完成 / 已逾期 |
| UX-7 | 任务/考试跨学期混排 | 范围筛选：本学期 / 全部（按当前学期课程归属过滤） |
| UX-8 | 任务/考试删除无二次确认 | 编辑器删除均加确认弹窗，与课程删除一致 |
| UX-9 | 导入为覆盖式且无留底，误操作不可逆 | 导入前自动导出备份并分享给用户保存 |
| UX-10 | ICS 导出全量所有学期（含归档），时区推算不严谨 | 默认仅导出当前学期；日期改走 `WeekMath.unixDayToDateTime`（UTC 基准） |

### 5.3 交互与可用性

| ID | 发现 | 修复 |
|---|---|---|
| UX-11 | 触摸目标 <44pt（色块/勾选/周次格） | 色块/图标/周次格/完成勾统一扩到 ≥44pt 命中区 |
| UX-12 | 节次用 +/- 步进器，11 节要点很多下 | 改为「从第 N 节 / 到第 N 节」下拉，一步选中 |
| UX-13 | 倒计时显示原始分钟，考试显示「0 天」 | 新增 `format.dart`：分钟→「X 分钟/X 小时/明天 08:30/N 天后」；考试→今天/明天/N/已考 |
| UX-14 | 空课表无引导态 | 无课时显示玻璃引导卡（点 + 或空白格建课） |
| UX-15 | 日历点选学期外日期会列出全部课程 | `w>=1 && contains(w)`，与色点判定一致 |
| UX-16 | 20 周课表只能手指连划，无周次跳转 | 点「第 N 周」胶囊弹出周次网格，单/双/本周标注，一键跳转 |

### 5.4 无障碍 & 一致性

| ID | 发现 | 修复 |
|---|---|---|
| UX-17 | 关键交互缺 Semantics 标签（NFR「语义标签齐全」未达标） | 主题色/课程色/图标/周次格/完成勾/下一节卡/周次胶囊补 Semantics |
| UX-18 | 完成作业无触感反馈（PRD 要求） | 完成勾 `HapticFeedback.selectionClick()` |
| UX-19 | 通知权限被拒无降级 | 开启时请求权限，被拒则弹引导「去系统设置开启」并保持关闭 |
| UX-20 | 「本周」按钮已在当前周仍触发动画 | 判空，已在当前周时 no-op |

### 5.5 清理 & 兜底

| ID | 发现 | 修复 |
|---|---|---|
| UX-21 | `ScheduleStyle` 死代码（PM-1 后仍残留） | 移除枚举/字段/设置键/首启写入及相关测试断言 |
| UX-22 | 首启学期开学日=今天，单双周易错 | 由 UX-2/UX-3 的学期管理覆盖：用户可改开学日或锁定当前周 |

### 5.6 回归

- `flutter analyze`：0 issues
- `flutter test`：**50 passed**（新增 `format_test` 锁定倒计时/文件名；新增 `next_class_test` 锁定「下一节」跨周回落）
- 桌面端实机走查（Windows debug 构建 + 启动截图）：课表主页正常渲染，新增「第 N 周 · 单/双」胶囊、学期芯片、下一节卡、周日期条、底部玻璃导航均生效，无报错

### 5.7 运行时走查新增修复

| ID | 发现 | 修复 |
|---|---|---|
| UX-23 | 各页面的悬浮「＋」按钮（FAB）被底部玻璃导航栏遮挡不可见（`extendBody:true` + 页面级 FAB 叠加，FAB 落到屏幕最底被 nav 盖住） | FAB 提升至 shell 层（`MainShell` 持有），Scaffold 同时拥有 nav 与 FAB 时 Material 自动把 FAB 摆到导航栏之上；任务页「作业/考试」子标签状态随之提升到 shell 以便 FAB 分发。保留玻璃透出效果，无需魔数。实机截图确认 FAB 已位于导航栏上方 |

---

## 六、P3 响应式适配（iPad / 折叠屏 / 宽屏 / 桌面）

> 目标：窄屏（手机）切换为左侧滑出主菜单以释放底部空间；宽屏（≥ 840）保持左侧玻璃导航栏 + 内容居中限宽，避免列表/设置被横向拉散。

### 6.1 实现

| 项 | 说明 | 位置 |
|---|---|---|
| 尺寸分级 | `WindowSizeClass`（compact/medium/expanded，≥840 为宽屏）+ `isExpanded` + `ResponsiveCenter`（居中限宽容器，窄屏无副作用） | [responsive.dart](../lib/core/util/responsive.dart) |
| 玻璃侧导航 | `GlassNavRail`：与 `NavItem` 共用导航数据，纵向胶囊，选中项主题色高亮 | [glass_tab_bar.dart](../lib/shared/widgets/glass/glass_tab_bar.dart) |
| Shell 自适应 | 宽屏 `Row[侧栏, 内容]`；窄屏 `Drawer` 左侧滑出主菜单 + 页面标题栏玻璃菜单按钮 | [main_shell.dart](../lib/presentation/shell/main_shell.dart)、[main_menu.dart](../lib/presentation/shell/main_menu.dart) |
| 页面限宽 | 课表 1040 / 日历 920 / 任务 840 / 设置 760 居中；移动端不再为底部 Tab 保留大块空白 | 4 个页面 |
| 弹窗限宽 | `showGlassSheet` 宽屏居中限宽 560，底部 sheet 不再撑满 | [glass_sheet.dart](../lib/shared/widgets/glass/glass_sheet.dart) |

### 6.2 回归与验证

- `flutter analyze`：0 issues；`flutter test`：50 passed
- 桌面端窗口缩放实测：
  - **1400×900（宽屏）**：左侧玻璃导航栏（课表/任务/日历/我的，课表选中）+ 课表内容居中、右侧留白、无底部 Tab、FAB 右下，无溢出/报错 ✅
  - **480×900（窄屏）**：左侧滑出主菜单 + 内容满宽、无底部 Tab、FAB 回到底部右侧 ✅

---

## 七、P3 鸿蒙卡片点击跳转（深链打通）

> 卡片侧 `postCardAction` 与 `openTarget` 透传此前已就绪；本轮补齐**唯一缺口**：宿主 `EntryAbility` 读取 `want.parameters.target` 并交给 Flutter 路由，使点击直达课程页。

| 项 | 说明 | 位置 |
|---|---|---|
| Flutter 深链桥 | MethodChannel `kechengbiao/widget`；冷启动查 `getLaunchTarget`，运行时收 `pushTarget`；仅放行 `/course/<id>`；非鸿蒙平台 `MissingPluginException` 静默 no-op | [harmony_widget_bridge.dart](../lib/application/harmony_widget_bridge.dart) |
| 启动接线 | `main.dart` 启动时 `HarmonyWidgetBridge.init(appRouter)`（一次性） | [main.dart](../lib/main.dart) |
| 宿主模板 | `EntryAbility` 读 `want.parameters.target` + 实现同通道契约（导入/注册钩子按引擎版本调整） | [EntryAbility.ets](../ohos/widget/EntryAbility.ets) |
| 集成文档 | 第 5 节补全链路图、两端契约表、DevEco 集成步骤 | [HARMONYOS.md](/kb/harmonyos) |

### 7.1 验证

- `flutter analyze`：0 issues；`flutter test`：**56 passed**（含 `harmony_widget_bridge_test` 深链白名单、课表外观设置解析与片段级自定义时间回归）
- ArkTS 侧（`EntryAbility`、卡片）为可集成模板，本机无鸿蒙 SDK/设备，待 DevEco + flutter_harmony 出包真机验证

---

## 八、产品体验官深审修复（2026-07-03，第三轮）

| ID | 发现 | 修复 |
|---|---|---|
| UX-24 | 课表首屏仍容易出现“空网格”，尤其有课程但本周无排课时缺少行动牵引 | 空态改按本周可见排课判断；提供「新建课程」与「试用示例」入口 |
| UX-25 | 从 FAB 新建课程需要先理解排课片段，填课名后不能立即形成课表 | 新建课程默认带当天第 1-2 节、每周上课的可编辑时间；保存时空周次自动补全为每周 |
| UX-26 | 任务页空态只说“点 + 添加”，作业/考试子标签下 FAB 行为不够明确 | 作业/考试空态分别提供「添加作业」「添加考试」按钮 |
| UX-27 | 日历页只显示课程，未体现作业 DDL 与考试时间轴价值 | 选中日期汇总课程、作业、考试三类信息 |
| UX-28 | 教务导入、AI 识别、云同步只存在抽象，用户不可见 | 设置页新增教务导入、拍照识别、云同步状态入口；未配置外部服务时明确说明等待适配 |
| UX-29 | 跨端/鸿蒙能力容易被理解为已真机闭环 | README / P3 文档明确区分“源码模板已提供”和“待 DevEco 真机验证” |

---

## 九、竞品参考补强修复（2026-07-03，第四轮）

> 对照用户提供的竞品截图，本轮优先补齐“低成本但高感知”的本地闭环能力；教务、AI、云同步仍保持可替换边界，不伪装成已接入真服务。

| ID | 发现 | 修复 |
|---|---|---|
| UX-30 | 课程编辑字段偏少，缺少竞品常见的“学分” | `Courses` 新增 nullable `credits`，Drift schema v2 迁移；课程编辑器支持录入、编辑、导入导出 |
| UX-31 | 设置页缺少“已添加课程”总览，管理课程只能从课表块进入 | 新增 `CourseManagementPage`，按当前课表列出课程、学分、教师地点、排课片段，支持编辑/删除/新增 |
| UX-32 | 课表设置缺少周末显示、非本周课程、格子高度、圆角等细节偏好 | 新增 `TimetableSettingsPage`，设置实时驱动 `WeekGrid` 渲染 |
| UX-33 | “下方留白区域”开关只是设置项，未影响页面 | 首页底部避让改为读取 `bottomBlankArea`，关闭后减少底部空白 |
| UX-34 | 多课表管理只有新增/编辑，缺少删除动作 | 多课表卡片新增删除确认；删除当前课表时自动切到可用课表，至少保留一个课表 |
| UX-35 | 全局设置入口不足，对竞品常见能力缺少可见状态 | 新增 `GlobalSettingsPage`，集中展示壁纸主题、留白、配置错误提示、电池优化、自动检查更新、振动反馈等偏好；依赖系统/后端的项用状态文案说明 |
| UX-36 | 只能配置全局作息，无法给单门课/单个排课片段设置临时时间 | `ScheduleSlots` 新增 nullable `customStartMinute/customEndMinute`（Drift schema v3）；课程编辑器每个片段新增“自定义时间”开关与 24h TimePicker；下一节、通知、日历、ICS、鸿蒙卡片、课程总览均优先读取片段级时间 |

### 9.1 回归

- `dart run build_runner build --delete-conflicting-outputs`：成功，Drift 生成文件已同步
- `flutter analyze`：0 issues
- `flutter test`：56 passed
- `flutter build windows --debug`：通过，产物 `build/windows/x64/runner/Debug/kechengbiao.exe`

---

## 十、测试专家对抗性测试与修复（2026-09-05，第五轮）

> 资深测试专家轮：先以对抗性测试证明缺陷存在（红色），修复后原样锁定语义（绿色回归锚点）。
> 测试文件：`test/security_adversarial_round2_test.dart`（11 条）。

| ID | 发现（均已实测复现） | 修复 | 回归 |
|---|---|---|---|
| SEC-1 | JSON 导入钳制清单遗漏 `scheduleSlots.customStartMinute/customEndMinute`、`tasks.dueAt`、`exams.startAt`、`terms.currentWeekOverride`，±10¹⁴ 毫秒、-99999 分钟等脏值直接入库并持久化 | `data_io.dart` 的 `clampNum` 清单补全：自定义分钟 0..1440、毫秒时间戳 ±3.2×10¹²（约 ±100 年）、`currentWeekOverride` 0..60；越界抛 `FormatException` 且事务回滚 | 越界值导入被拒 + 合理值 roundtrip 不受影响 |
| SEC-2 | 越界 `currentWeekOverride` 经 `currentWeekProvider` 直通 `courseReminderWeekWindow`，`clamp(first, totalWeeks)` 在 first > totalWeeks 时抛 `ArgumentError`；`rescheduleAll` 先 `cancelAll()` 再排程，异常导致全部提醒被取消且无法重排 | 双防线：导入入口拒绝越界 override（SEC-1）；`courseReminderWeekWindow` 对任意 int 输入先归一（first>total 取 total，totalWeeks<1 取 1），不再抛异常 | 99999999 → [20]；正常窗口 [5..10] 不变 |
| SEC-3 | AI 识别导入链路（AI 文本/竞品解析草稿 → `replaceSlotsOfCourse`）无任何范围校验：98-99 节、`dayOfWeek=0/9` 直接入库（仅周次被 WeekCodec 钳制） | `ScheduleRepository` 三个写入口（`addSlot`/`updateSlot`/`replaceSlotsOfCourse`）统一校验：星期钳 1..7、节次钳 1..30 且 end≥start、自定义分钟钳 0..1440（与 UI 值域一致） | 98-99 节 → 30-30；dow 0→1、9→7；正常保存路径不受影响 |
| SEC-4 | 认证 `baseUrl` 不强制 https，自定义 `http://` 地址会把密码放进明文请求体 | `RemoteAuthClient.login` 入口强制 https：非内置域名的 http/无 scheme 地址直接抛 `AuthException`（不发任何请求）；内置 hxpt/ptang 域名手写 `http://` 前缀则归一到官方 https 入口（修正拼写笔误保留原 scheme 仍走明文的问题）。测试：`remote_auth_client_test` 新增 2 条 | `http://auth.example`/无 scheme/`ftp://` 被拒且零网络请求；`http://www.hxpt.org` 实际请求 scheme=https；`https://auth.example` 正常链路不受影响 |

### 10.1 回归

- `flutter analyze`：**0 issues**
- `flutter test`：**342 passed**（331 → 342，新增 11 条对抗性/回归测试）
- 修复波及面核查：编辑器 UI（节次下拉 1..maxPeriods、TimePicker 0..1439）、学期编辑器（周数 1..30、override clamp 1..totalWeeks）本就只产生合法值，钳制不影响正常操作；导出→导入 roundtrip 测试确认新钳制不误伤合法文件

---

## 十一、测试专家第 4 轮深审（2026-09-05）

> 覆盖此前未深审模块：电子宠物状态机、`schedule_providers`（下一节/考试倒计时）、`main` 启动、路由深链、课程编辑器加载/保存、导入预览、登录页。
> 新增测试文件：`test/security_adversarial_round3_test.dart`（3 条）。

| ID | 发现 | 处置 | 回归 |
|---|---|---|---|
| SEC-5 | settings 表经 JSON 导入是字符串直通（导出格式需要，无法在导入层白名单化），恶意文件可注入 `max_periods=99999999`；`AppSettingsState` 解析该键无钳制，超大值直通周网格的行数/循环（`gridHeight`/`gridRadius` 此前已有 clamp，唯独 `maxPeriods` 遗漏） | `app_providers.dart` 解析层补 `clamp(1, 30)`（与学期编辑器 1..30 值域一致）；负值/0 钳到 1，合法值不受影响 | 99999999→30、0→1、12→12 |
| SEC-6 | 同类数值设置键 `notifyLeadMin`（UI 档位 5/10/15/30）、`dndStartMin/dndEndMin`（0..1440）也无钳制，注入负值/超大值会污染通知排程与勿扰判定 | 解析层补钳：`notifyLeadMin` 0..120、`dndStart/dndEnd` 0..1440 | 注入 -100/999999 后解析值均落回合法区间，勿扰纯函数不抛异常 |
| SEC-7 | 电子宠物状态机从损坏 JSON 恢复为健康默认值；属性全量 clamp（0..100/1..99/0..999999）、`fromJson` 对非 int num 四舍五入、`materialized` 对未来时钟回拨安全（`!now.isAfter(last)` 早退）——**未发现漏洞** | 记录为已验证防线 | `virtual_pet_state_test` 既有覆盖 |
| SEC-8 | `computeNextClass` 对 `fromWeek<1` 早钳、`periods[startPeriod]` 缺失跳过、候选按 start 排序后取 `end.isAfter(now)`——跨周/无作息/已开课场景均有防线，**未发现新漏洞** | 记录为已验证防线 | `next_class_*` 既有覆盖 |
| SEC-9 | 课程编辑器对已删除 `courseId` 深链：`getById` 为 null 时安全 pop，不崩溃；保存时二次确认课程仍存在。登录页口令不落日志。`main` 启动桥接非鸿蒙平台 no-op——**未发现新漏洞** | 记录为已验证防线 | `course_editor_*` 既有覆盖 |

### 11.1 回归

- `flutter analyze`：**0 issues**
- `flutter test`：**345 passed**（342 → 345，新增 3 条；两轮对抗性测试文件 14 条全部通过）
---

## 十二、测试专家第 5 轮收尾排查（2026-09-05）

> SEC-4 修复后的最终收尾轮：对导入行全部剩余字段、Drift 表约束、任务/考试编辑器回载、SegmentControl、玻璃能力探测做对抗性排查。已确认缺陷清零。

| ID | 发现 | 处置 |
|---|---|---|
| SEC-10 | 导入行字段 `periods.periodIndex` 无钳制（实测负值 -5 入库）。下游均为 map key / 排序比较，无崩溃路径，但与钳制策略不一致 | `data_io.dart` 补钳 1..60，越界拒绝 + 事务回滚；`security_adversarial_round3_test` 新增回归断言 |
| — | 超长文本（如 500 字课程名）导入：Drift 层 `withLength` 校验抛 `InvalidDataException`，被导入 catch 统一转为 `FormatException` 且事务回滚——**防线已存在，无需修复**（实测确认） | 记录为已验证防线 |
| — | 任务 `priority`/`type` 越界注入：列表页为相等性比较（非命中即不显示徽标），编辑器 SegmentControl 非 Dropdown（无选中高亮不崩溃），`TaskType/TaskStatus.fromString` 有默认回退——**无害** | 记录为已验证防线 |
| — | 考试 `durationMin` 越界：仅日历文本展示；编辑器步进器有 30..300 边界。低危展示问题，不做钳制 | 记录 |

### 12.1 最终回归

- `flutter analyze`：**0 issues**
- `flutter test`：**348 passed**（347 → 348）
- 累计：5 轮对抗性测试，发现并修复 **7 个缺陷**（SEC-1/2/3/4/5/6/10），全部有回归锚点；其余排查项均有已验证防线或无害论证

---

## 十三、竞品对标修复轮（2026-09-14）

> 输入：`docs/COMPETITIVE-ANALYSIS.md` 的 22 条 GAP 清单。本轮修其中代码层可闭环的部分，并把「需要原生/真机/服务端」的项显式标注而不是伪装完成。

### 13.1 开工前的门禁体检（先测再改）

| 检查 | 结果 | 处置 |
|---|---|---|
| `flutter analyze` | ❌ **2 issues**（`test/link_audit/io_link_test.dart` 未用 null-aware element） | 已修，归零 |
| `flutter test` | ❌ **374 passed / 5 failed**，失败全在 `app_init_test.dart` | 根因：`GlassCapability._systemWantsReducedMotion()` 取 `WidgetsBinding.instance`，纯 Dart 单测无 binding → 改读 `PlatformDispatcher` |
| 测试可运行性 | ⚠️ 沙箱内 `flutter_tester` 的 localhost WebSocket 被 `HTTP_PROXY` 拦截，50 个测试文件全部 load 失败 | 运行测试需清空 `HTTP_PROXY/HTTPS_PROXY` 并设 `NO_PROXY=127.0.0.1,localhost`（已记录，避免下轮误判为测试失败） |

> 结论：README 宣称的「0 issues / 269 passed」在开工前**已与真实状态不符**，门禁实质失效。这是本轮最高优先级的两项修复。

### 13.2 本轮改动与验证

| 主题 | 涉及 GAP | 关键实现 | 回归锚点 |
|---|---|---|---|
| 竞品迁移一级入口 | G-03 | 新页 `competitor_import_page.dart`；解析层新增 `sourceLabel`；三处入口（设置/空态/引导） | `competitor_source_label_test`（6 条） |
| 当前时间线 | G-07 | 顶层纯函数 `nowLineOffsetY`；今天列红线 + 已结束课程淡化 | `now_line_test`（8 条） |
| 外观档位 | G-12 / G-13 | `timetable_style.dart`（信息密度/字号/5 套皮肤）；周网格按档位渲染 | `timetable_style_test`（7 条） |
| 本地备份与恢复 | G-15 | `local_backup.dart`：到期自动备份、手动备份、修剪保留 5 份、一键恢复（先留底） | 解析与文案锚点 + 手动走查 |
| 占位项清零 | G-05 | 空课图片与清缓存实装；桌面组件、调课改为诚实状态页 | — |
| 卖点外显 / 无障碍声明 | G-02 / G-21 | 引导页收尾屏 + 关于页「隐私承诺与无障碍」 | — |
| 教务入口诚实化 | G-04 | 明确未接入 + 学校登记 | — |
| 删除课程可撤销 | G-09（部分） | 删除前快照课程+片段，SnackBar 撤销重建 | — |

### 13.3 回归

- `flutter analyze`：**0 issues**
- `flutter test`：**417 passed / 0 failed**（379 → 417，新增 23 条：时间线 8、外观档位 7、设置键 5、竞品来源 6、快照文案 5 中的部分与既有合并计数）
- 设置项新增键（`info_density` / `timetable_font_scale` / `skin_preset` / `empty_state_image_path` / `auto_backup_enabled` / `last_auto_backup_at` / `holiday_countdown_*`）全部走 `AppSettingsState.fromMap` 的钳制/兜底路径，脏值不抛异常

### 13.4 明确未闭环（不伪装完成）

- **功能未做**：G-06 今日视图、G-08 调课例外层、G-10 成绩 GPA、G-11 课程详情、G-14 长图导出、G-19 分享码、G-20 倒计时 UI、G-09 的任务/考试撤销。
- **环境受限**：G-01 Android/iOS 桌面小组件、G-16 锁屏与实时活动、G-17 上课自动静音、G-18 空教室、G-22 真机性能对标 —— 均需原生工程 / 真机 / 服务端数据源，本机无法出包验证，已在设置页与文档中标注真实状态。

---

## 十四、竞品对标修复轮 · 第二段（2026-09-14）

> 接续第十三节：把 13.4 里「功能未做」的 8 项清掉 7 项，并先把上一段遗留的门禁失败修好。
> **本节结论取代 13.4 的未闭环清单**。

### 14.1 接手时的真实状态（先测再改）

上一段的代码改动写完后并没有跑完门禁就中断了，接手时实测：

| 检查 | 结果 | 处置 |
|---|---|---|
| `flutter analyze` | ❌ **4 issues**（全在测试文件） | `test/data/local_backup_test.dart:60` 与 `test/data/migration_test.dart:76/175`：`GradesCompanion.insert(courseId:)` 传了 `int`，但 `grades.courseId` 是 `nullable().references(..., onDelete: setNull)`，companion 里类型为 `Value<int?>` → 改 `Value(courseId)`；`local_backup_test.dart:76`：`FileStat` 没有 `length` → 改 `file.lengthSync()` |
| `flutter test` | ❌ **442 passed / 2 个测试文件 load 失败** | 上面的编译错误导致 `local_backup_test` / `migration_test` 整体无法加载（**不是逻辑失败**）；修完即恢复 |

修完 4 处后：`flutter analyze` 0 issues，`flutter test` **451 passed / 0 failed**（基线从 417 提升）。

### 14.2 本节改动与验证

| 主题 | 涉及 GAP | 关键实现 | 回归锚点 |
|---|---|---|---|
| 今日视图 | G-06 | `today_page.dart` 单列复用 `WeekGrid`（保证与周视图数据一致）；`core/util/agenda.dart` 承载「今天到期 / 今天开考 / 跨夜考试」聚合 | `agenda_test`（7 条） |
| 成绩与 GPA | G-10 | `core/util/gpa.dart`：`weightedCourseScore` / `gradePoint4` / `weightedGpa` / `requiredScoreForTarget`；`grades` 表（v4 迁移） | `gpa_test`（15 条）+ `migration_test` v1→v4 链路 |
| 考核方式 | G-11 | `courses.assessment` 独立列（v3 迁移），编辑器字段 + 导入导出 + 分享码全链路 | `settings_ext_parse_test` / `migration_test` |
| 长图导出 | G-14 | `schedule_page.dart` 用 `RepaintBoundary` **只包住网格区**取图；`data/io/schedule_image.dart` 负责合成 | 合成逻辑单测 + 手动走查 |
| 分享码 | G-19 | `data/io/share_code.dart`：gzip + base64 + 前缀，纯本地；解码端钳制越界值 | `share_code_test`（7 条） |
| 放假倒计时 | G-20 | `core/util/countdown.dart` 纯函数 + 设置页条目（名称/目标日/实时预览/可关闭）+ 今日学习卡片与今日页展示 | `countdown_test`（9 条） |
| **删除撤销扩展** | G-09 | 课程（管理页 + 编辑页）、作业、考试、成绩项四条路径均支持撤销 | 见下 |

#### 14.2.1 G-09 的两个关键设计点

1. **撤销回调用例不能碰 `ref` / `context`**。删除面板在删除后立即 `pop`，而「撤销」按钮是用户在 SnackBar 上后点才触发的 —— 那时原 widget 已经 dispose。若在回调里 `ref.read(...)` 或 `Navigator.of(context)` 会抛异常。因此删除前就把 `ScaffoldMessengerState` 与仓储实例捕获进闭包，回调只使用这两个局部变量。
2. **字段完整性必须是「一个都不漏」**。抽取为可测接缝，而不是埋在 widget 里：
   - `presentation/course/course_delete_undo.dart`：`snapshotCourseForUndo` / `restoreCourseFromSnapshot` / `undoCourseDelete`（课程 + `replaceSlotsOfCourse` 还片段，走同一事务）；
   - `presentation/tasks/task_exam_undo.dart`：`recreateTaskFromSnapshot` / `recreateExamFromSnapshot`。
   两个接缝都刻意避开 `context`，因此可以直接单测。

### 14.3 回归

- `flutter analyze`：**0 issues**
- `flutter test`：**470 passed / 0 failed**（417 → 470）
- 本节新增锚点 **19 条**：`countdown_test` 9、`course_delete_undo_test` 5、`task_exam_undo_test` 5（上一段已写但未能编译的 `gpa_test` / `agenda_test` / `share_code_test` / `local_backup_test` / `migration_test` 共 34 条在本节首次真正跑通）

### 14.4 明确未闭环

- **功能未做**：G-08 调课 / 调休例外层（需要「按日期生效的例外层」数据模型，当前入口标注「规划中」并给出替代做法）；G-12 剩余部分（课表背景图与贴纸）。
- **环境受限**（不变）：G-01 桌面小组件、G-16 锁屏与实时活动、G-17 上课自动静音、G-18 空教室、G-22 真机性能对标。
- **诚实标注**：G-20 的「假期标记 / 与调课联动」未做，当前只做了「倒计时目标日 + 展示」这一半，已在 §7 表格中写明。

---

## 十五、竞品对标修复轮 · 第三段（2026-09-14）

> 补齐第十四节留下的最后一项：**G-08 调课 / 调休例外层**。
> **本节取代 14.4 的未闭环清单**。

### 15.1 为什么这项必须最后做

前面几项都是「加一个页面」，这项要动**数据模型 + 渲染 + 通知排期**三处，
而它的风险不在实现量，在**口径统一**：只要渲染与通知各算一套，就会出现
「课表上这天没课、提醒照样响」——这类不一致最难查，用户也最不信任。

因此设计上先立一个原则：

> **原课表永不修改。例外层只回答「某一天实际有没有课、上在哪天」。**

这条同时解释了为什么不能像竞品那样直接改课表（之后每周都跟着错），
也决定了实现方式：新表 + 纯解析函数 + 两个消费方（渲染 / 通知）共用它。

### 15.2 落地内容

| 层 | 文件 | 要点 |
|---|---|---|
| 数据模型 | `data/database/tables.dart`、`app_database.dart` | 新表 `schedule_overrides`，`UNIQUE(term_id, date)`；schemaVersion 4 → 5，`onUpgrade` 里 `createTable` |
| 仓储 | `data/repositories/schedule_override_repository.dart` | `upsert` = 事务内 delete + insert（一天一条例外）；参数校验放在 `guardWrite` **之外**，避免把用户输入问题包成「存储失败」 |
| 纯解析 | `core/util/day_override.dart` | `DayOverrideResolver`（日期 → 生效日，null = 停课）、`resolveWeekPlan`（周计划解析 + 冲突/跨周报告）。**不依赖 drift / Flutter**，因此可直接单测 |
| 课表渲染 | `presentation/schedule/widgets/week_grid.dart` | 按解析结果渲染生效周几；调课块加「调」角标 + 禁止拖拽；停课 / 调课当天画整列提示带 |
| 今日视图 | `presentation/today/today_page.dart`、`presentation/schedule/widgets/today_learning_panel.dart` | 「今天 N 节课」与今日课程列表同样走解析（否则标题数字与下方时间轴对不上） |
| 通知 | `application/notification_provider.dart` | `rescheduleAll` 逐周走 `resolveWeekPlan`：停课不发提醒、调课的提醒挪到目标日；`overrides` 流任一 `hasError` 即跳过重排（沿用既有约定） |
| UI | `presentation/settings/reschedule_tool_page.dart` + 路由 `/settings/reschedule` | 选日期 → 停课 / 调到本周另一天；写入前**先试算并展示结果**；列出既有例外可撤销。设置页原「规划中」状态页删除，`_ActionRow` 的 `badge` 参数随之移除 |
| 数据迁移 | `data/io/data_io.dart` | 例外层进导出 / 导入（含数值钳制），`kind` 只允许 `cancel` / `move`，非法值抛 `FormatException` 并整体回滚 |

### 15.3 三条「不静默」的取舍

这三处都刻意选择了「让用户看见问题」而不是「算一个看起来正常的结果」：

1. **目标日节次冲突** → 该片段**留在原处**（而不是被丢弃），并记入 `conflictedIds`；确认框里写明「其中 N 节因目标日该节次已被占用，会留在原处」。
2. **跨周目标日** → 不移动并记入 `crossWeekIds`；UI 层直接在日期选择器里限制到同一自然周，不给用户制造这个错误的机会。
3. **目标日已过去 / 该天本来没课** → 直接拒绝创建例外并说明原因，避免库里堆积一堆「设了等于没设」的行。

### 15.4 回归

- `flutter analyze`：**0 issues**
- `flutter test`：**504 passed / 0 failed**（470 → 504，新增 34 条）
  - `test/core/day_override_test.dart`（18）：停课 / 调课 / 整日调课 / 冲突不丢课 / 跨周拒绝 / 输出顺序稳定 / 第 2 周不被第 1 周例外误伤 / 脏例外被忽略 / 日期工具
  - `test/data/schedule_override_repository_test.dart`（11）：同日 upsert 覆盖、**表级 UNIQUE 直插同日期被拒**、缺目标日 / 目标日等于当天 → `ValidationFailure`、跨学期隔离、删学期级联、`toOverrides` 脏 kind 回落
  - `test/data/database_io_and_repositories_test.dart`（+2）：例外层导出导入回环且覆盖式重建、非法调课类型导入被拒并回滚
  - `test/data/migration_test.dart`：`onCreate` 9 张表 / `schemaVersion=5`；v1 老库迁移到 v5 后新表可写
  - `test/presentation/week_grid_render_test.dart`（+6）：调课块渲染到目标日（**按列坐标断言**）、带「调」角标、停课列显示提示带、例外只作用于指定日期、例外块不可拖拽、**单列渲染（今日视图）时调来的课必须出现**
- 顺带确认：既有 WeekGrid 渲染用例现在都跑在「例外为空的解析路径」上，等于同时锁住了「无例外时渲染与从前一致」。

#### 15.4.1 自查抓到的一个真缺陷（已修 + 已锚定）

写渲染接线测试时发现：`WeekGrid` 原本**先按「原定周几」过滤片段、再解析例外**。
今日视图只渲染一列（`onlyDayOfWeek`），于是「原定周一、被调到周三」的课在周三的今日
视图里被提前过滤掉，**从今日视图凭空消失** —— 而周视图一切正常，测试也很容易漏掉。

修法：解析必须喂入**本周全部片段**（可见性只在解析之后施加），并补两条单列渲染锚点。
这也是本节把「解析与渲染的顺序」写进文档的原因：顺序反了不会报错，只会让数据少一块。

### 15.5 明确未闭环

- **功能未做**：课表背景图与贴纸（G-12 剩余部分）；校历式假期自动标记（需要校历数据源）—— 但与调课联动的手动做法（整天停课）现在已可用。
- **环境受限**（不变）：G-01 桌面小组件、G-16 锁屏与实时活动、G-17 上课自动静音、G-18 空教室、G-22 真机性能对标。

