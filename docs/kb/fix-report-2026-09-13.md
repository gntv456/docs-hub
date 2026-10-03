# 课表 App 缺陷修复记录（对应 2026-09-13 链路闭环测试报告）

| 项目 | 内容 |
|---|---|
| 修复对象 | 课表 · ClassSchedule（`D:\kechengbiao`） |
| 依据 | `docs/TEST-REPORT-2026-09-13.md`（42 条缺陷：P0×1 / P1×12 / P2×28 / P3×1） |
| 修复日期 | 2026-09-13 |
| 验证方式 | `flutter analyze --no-pub`（编译级全量校验）+ `dart format` + 新增纯逻辑回归测试 |
| **校验结果** | **0 error / 0 warning**，仅余 2 条基线既有 info（`test/link_audit/io_link_test.dart`，与本次修复无关） |
| 处置汇总 | 已修复 **32 条**、判定为非缺陷 **4 条**、缓解/部分修复 **4 条**、延后 **2 条** |

> **验证边界（务必知悉）**：本机沙箱无法启动 `flutter_tester`（所有测试加载阶段报 `WebSocketException`），因此**未能实际运行 `flutter test`**。本次修复的正确性依据是：(1) `flutter analyze` 全量通过（0 error/0 warning）；(2) 静态逻辑复查；(3) 新增 `test/core/regression_fixes_test.dart` 覆盖纯逻辑分支。**请在本地或 CI 复跑 269 条基线用例**，重点确认下方"需重点复跑"清单。

---

## 一、P0 / P1 修复明细

| ID | 级别 | 处置 | 改动 | 说明 |
|---|---|---|---|---|
| COURSE-01 | P0 | ✅ 已修复 | `course_editor_page.dart` | `_save` 拆为 `_save`（前置校验 + `try/catch/finally`）与 `_saveInner`；新增 40 字名称上限拦截与异常翻译；`_delete` 加 `try/catch`，删除失败不再 pop。**保存按钮"卡死"黑洞已消除** |
| TASK-01 | P1 | ✅ 已修复 | `notification_provider.dart` | 改用 `tz.TZDateTime.from(when.toUtc(), tz.UTC)` 承载绝对时刻，不再依赖未设置的 `tz.local`（原先默认 UTC → 中国区全部提醒偏移 8 小时）。**零新增依赖** |
| TASK-02 | P1 | ✅ 已修复 | `notification_provider.dart`、`task_editor_sheet.dart`、`exam_editor_sheet.dart` | 新增 `cancelTaskReminders` / `cancelExamReminders`，并在删除入口显式调用；不再仅依赖 Shell 常驻 watch 的全量重排 |
| SCHED-01 | P1 | ✅ 已修复 | `schedule_page.dart`、`tasks_page.dart` | 课表页新增数据流错误态 + 重试（term/slots/courses）；作业、考试列表新增错误态 + 重试。面板级 `.valueOrNull` 降级保留（其错误已被页面级拦截） |
| SCHED-02 | P1 | ✅ 已修复 | `schedule_page.dart` | 拖拽调课不再硬编码清空 `customStartMinute/customEndMinute`，自定义上课时间得以保留 |
| DATA-01 | P1 | ✅ 已修复 | `schedule_repository.dart`、`term_repository.dart` | 三处"整表替换"（`replaceSlotsOfCourse`、`replaceGlobalPeriods`、`replacePeriodsOfTerm`）改为 `_db.transaction` 包裹，失败可回滚 |
| SET-01 | P1 | ✅ 已修复 | `global_settings_page.dart`、`glass_button.dart`、`app.dart` | 移除 3 项无实现能力的假开关（根据壁纸更改主题色 / 自动检查更新 / 允许后台自启）与 1 项无消费点的提示开关，改为说明文案；**「振动反馈」真实接入** `GlassButton`（`hapticEnabled` 由 App 根同步） |
| SET-02 | P1 | ✅ 已修复 | `app_providers.dart`、`settings_page.dart` | 抽出 `repairCurrentTermPointer()`，`appInitProvider` 与「数据导入成功后」共用；导入备份后指针悬空不再导致课表空屏、无需重启 |
| BOOT-01 | P1 | ✅ 已修复 | `app.dart` | 新增 `init.hasError` 分支与 `_InitErrorPage`（可读原因 + 重试），消除"初始化失败→白屏/卡引导页软锁" |
| LIFE-01 | P1 | ✅ 已修复 | `app.dart`、`app_providers.dart` | 新增 `AppLifecycleListener`（前台恢复刷新）+ 每分钟跨零点检测 + `clockTickProvider` 时间信号，`currentWeekProvider` 依赖它重算 |
| ROUTE-03 | P1 | ✅ 已修复 | `harmony_widget_bridge.dart`、`app.dart` | 深链在 router 未挂载时改为**入队**（上限 5 条），主界面挂载后由 `flushPendingTargets()` 重放，不再静默丢弃 |
| EXT-01 | P1 | ❌ **判定为非缺陷** | — | 经核查：图片 OCR 未接入是**明确的能力边界**，而非漏接线。`settings_page:488` 已标注"图片 OCR…仍在接入中"，`ai_recognition_file_helpers:19` 有友好提示，`local_schedule_recognition_client:22` 主动抛出说明。若强行加"拍照"按钮，会把用户导向必然报错的路径，属于有害修改 |

---

## 二、P2 / P3 修复明细

| ID | 级别 | 处置 | 改动 / 说明 |
|---|---|---|---|
| DATA-03 | P2 | ✅ | `updateSlot` 改为 `WeekCodec.encode(WeekCodec.decode(slot.weeks))`，与 `addSlot` 一致，脏 weeks 不再直通落库 |
| DATA-04 | P2 | ✅ | `settings_repository.remove` 补 `_sync.markDirty(entity: 'settings')` |
| DATA-05 | P2 | ⏸ **延后** | 统一 `Failure` 包装属架构级重构，会改变既有异常契约并影响多个既有测试，建议单独立项 |
| DATA-06 | P2 | ◐ **缓解** | 节次上界保持 `WeekCodec.maxWeek` 作为 DB 层最后防线（兼容既有对抗测试契约）；面向用户的越界提示改由编辑器保存前完成，注释已写明分层意图 |
| SCHED-03 | P2 | ✅ | 空白格建课 URL 带上 `&week=`，`app_router` 解析并传给新增的 `CourseEditorPage.initialWeek`，不再默认"每周" |
| SCHED-04 | P2 | ✅ | 新增 `WeekMath.isTermFinished()` 与 `termFinishedProvider`，从语义上区分"正在上最后一周"和"学期已结束" |
| COURSE-02 | P2 | ✅ | `_saveInner` 在落库前对每个片段做前校验（起止节次颠倒 / 非法星期 / 周次越界），逐段指出问题 |
| COURSE-03 | P2 | ✅ | 同上：周次超出学期范围（1~totalWeeks）明确拦截并提示 |
| COURSE-04 | P2 | ✅ | 编辑页删除包 `try/catch`，失败提示且不关闭页面 |
| COURSE-05 | P2 | ⏸ **延后** | Course/ScheduleSlot 实体单测未补；本轮以纯逻辑回归测试（`regression_fixes_test.dart`）优先覆盖修复点 |
| TASK-03 | P2 | ✅ | 通知 ID 命名空间重排为：任务 100000/200000、考试 300000/400000、专注 500000、课程 1000000+，各段预留 10 万容量并附注释表；`notification_reschedule_test.dart` 断言同步更新 |
| TASK-04 | P2 | ✅ | 新增纯函数 `todayReminderTime()`：默认时刻已过且 DDL 未过时退化为"现在 + 5 分钟"，距 DDL 不足 5 分钟则用截止前 1 分钟，DDL 已过不排程 |
| TASK-05 | P2 | ✅ | 新增考试时间早于当前时刻的**二次确认**（允许补录归档）；经核查列表侧已有"已考"标签 |
| TASK-06 | P2 | ✅ | 作业、考试列表新增 `hasError` 分支（错误态 + 重试） |
| TASK-07 | P2 | ❌ **判定为非缺陷** | 经核查 `settings_page.dart:259-266`：开启通知开关时**已经调用** `requestPermissions()` 并在拒绝时弹引导对话框，报告中"先关后开不申请权限"的判定不成立 |
| SET-03 | P2 | ✅ | `period_editor_page._save` 保存前统计"超出新节次数的排课片段"，命中则弹确认（说明数据未丢失、恢复节次数即可重新显示） |
| SET-04 | P2 | ◐ **部分修复** | 行结束符改为 CRLF（RFC 5545 要求，避免严格客户端拒收）；时区部分经复核为**有意的浮动时间**（本地日程语义正确），保留并补充注释说明 |
| SET-05 | P2 | ❌ **判定为非缺陷** | 学期允许并存（并行课表）是产品设计，非缺陷，仅保留提示性建议 |
| SET-06 | P2 | ✅ | 设置页新增「勿扰时段」配置入口（两次 TimePicker 设置开始/结束），此前 `dndStartMin/dndEndMin` 被通知逻辑真实使用却无任何配置入口 |
| BOOT-03 | P2 | ◐ **已缓解** | 通知改 UTC 绝对时刻后，时区偏差风险已消除；`WeekMath` 基于本地时间计算的"当前周"本身语义正确，无需改动 |
| ROUTE-01 | P2 | ✅ | 深链 `day` 钳到 1..7、`period`/`week` 钳到 1..30、`term` 非正数视为空（`_boundedParam`） |
| ROUTE-02 | P2 | ✅ | `GoRouter.errorBuilder` + `_RouteErrorPage`（品牌化 404，可一键返回课表） |
| AUTH-01 | P2 | ✅ | 登录成功后 `ref.invalidate(authSessionProvider)`，不再单纯依赖底层流推送时机 |
| ONB-01 | P2 | ✅ | `AppSettingsState.copyWith` 补齐 `onboarded` / `onboardingShown` 参数并 `?? this.x`，去掉硬编码 `onboarded: true`，消除"存任意设置即重置引导页"的潜伏陷阱 |
| THEME-01 | P2 | ✅ | `GlassCapability` 改用系统可访问性信号（`disableAnimations`）自动降级，并新增 `refreshSync()` 供前台恢复时重新探测；**零新增依赖** |
| EXT-02 | P2 | ✅ | 竞品解析逆向周次区间（如 `16-2`）改为升序解释，不再静默回落到"全学期每周" |
| EXT-03 | P2 | ✅ | 桌面卡片写文件失败改为打印日志（仍不阻塞主流程），便于排查卡片数据陈旧 |
| EXT-04 | P2 | ✅ | 宠物头像复用 `PetAssetStore.shared`，缓存不再每个 avatar 各建一份 |
| EXT-05 | P3 | ✅ | 未随包且无本地文件时直接矢量回退，省掉一次注定失败的资产加载（同时清理了因此失效的 `_checked` 状态） |

---

## 三、改动文件清单（27 个）

```
lib/app.dart
lib/application/app_providers.dart
lib/application/harmony_widget_bridge.dart
lib/application/notification_provider.dart
lib/application/pet_asset_store.dart
lib/application/widget_sync_provider.dart
lib/core/platform/glass_capability.dart
lib/core/router/app_router.dart
lib/core/util/week_math.dart
lib/data/integrations/competitor_schedule_parser.dart
lib/data/io/data_io.dart
lib/data/repositories/schedule_repository.dart
lib/data/repositories/settings_repository.dart
lib/data/repositories/term_repository.dart
lib/presentation/auth/login_page.dart
lib/presentation/course/course_editor_page.dart
lib/presentation/pet/virtual_pet_page.dart
lib/presentation/pet/virtual_pet_sprite.dart
lib/presentation/schedule/schedule_page.dart
lib/presentation/settings/global_settings_page.dart
lib/presentation/settings/period_editor_page.dart
lib/presentation/settings/settings_page.dart
lib/presentation/tasks/exam_editor_sheet.dart
lib/presentation/tasks/task_editor_sheet.dart
lib/presentation/tasks/tasks_page.dart
lib/shared/widgets/glass/glass_button.dart
test/application/notification_reschedule_test.dart   （ID 段断言同步）
test/core/regression_fixes_test.dart                 （新增回归测试）
```

## 四、需重点复跑的既有测试（因行为契约有变）

1. `test/application/notification_reschedule_test.dart` —— ID 段位已重排，断言已同步修改（任务 200000、考试 300000/400000、专注 500000）。
2. `test/data/database_io_and_repositories_test.dart` —— ICS 现输出 CRLF；`replaceXxx` 现走事务。
3. `test/data/competitor_parser_adversarial_test.dart` —— 逆向周次区间语义已变（`16-2` → 2~16）。
4. `test/data/io_adversarial_test.dart`、`test/security_adversarial_round2/3_test.dart` —— 校验/钳制契约保持不变（刻意未改 `_validatedPeriods` 的钳制行为），应仍然通过。
5. `test/presentation/*` —— `GlassButton` 由用户交互路径新增了触感调用，断言点击行为的用例需确认不受影响。

## 五、遗留与建议

| 项 | 建议 |
|---|---|
| DATA-05 统一 Failure 包装 | 单独立项，需同步调整所有调用方与既有异常相关测试 |
| COURSE-05 实体单测 | 按原报告建议补齐 Course/ScheduleSlot 的构造与 copyWith 测试 |
| 真机验证 | 通知触发时刻（时区修复后）、鸿蒙 ArkTS 卡片、低端机玻璃降级（系统"减弱动态效果"开关） |
| 流程改进 | ① 所有 `AsyncValue` 读取统一处理 `hasError`；② 所有写操作统一 `try/catch` + 反馈；③ 设置项必须能指出"被谁消费"；④ 深链/生命周期/错误态三类必测清单 |

---

## 六、补充：复测建议项与延后项清零（2026-09-13 20:15）

针对 `TEST-REPORT-2026-09-13-R2.md` 中"留作建议 5 条"与第一轮延后的 2 条，本轮全部处置：

| 项 | 处置 | 改动 |
|---|---|---|
| R2-06 课程/学期管理页无错误态 | ✅ 已修复 | `course_management_page.dart`、`term_management_page.dart`：改 `AsyncValue`，报错时渲染错误页 + 重试 |
| R2-07 宠物页 4 处写操作无保护 | ✅ 已修复 | `virtual_pet_page.dart`：`selectPet` / `feed` / `perform` / `cancel` 全部加 try/catch + 失败提示。**顺带发现并修复一个卡死**：专注结算的 `_settlingFocus` 在异常时永久为 true（原代码无 finally），现用 try/finally 复位 |
| R2-08 设置流报错回落默认 | ✅ 已修复 | `app.dart`：新增 `_lastGoodSettings`，报错时沿用上一次可用值，主题色/通知开关不再"看起来被重置" |
| R2-09 桌面卡片 / 下一节课静默空 | ✅ 部分修复 | `widget_sync_provider.dart`：任一依赖流报错时**跳过写入**，卡片保留上一次内容，不再被"今日无课"覆盖。`nextClassProvider` 报错显示"没有下一节课"属可接受降级（页面级错误态已覆盖主数据），判定不改动 |
| DATA-05 统一 Failure 包装（延后项） | ◐ 核心路径已落地 | 新增 `lib/data/repositories/repository_guard.dart`（`guardWrite`：底层异常 → `DatabaseFailure`，AppFailure 原样透传）。已应用到**用户最高频的 7 个写方法**：course 的 create/update/delete、schedule 的 addSlot/updateSlot/deleteSlot/replaceSlotsOfCourse。其余 15 个仓储写方法按同一模式推广即可；**刻意未改** `QueryExecutor` 层（一处可覆盖全部，但在无法运行测试的环境下实现风险过高） |
| COURSE-05 实体单测（延后项） | ✅ 已补 | 新增 `test/data/entities_course_slot_test.dart`（6 用例）：Course / ScheduleSlot 的字段保存、copyWith 覆盖与保持、可空字段的 Value 语义 |

**验证**：`flutter analyze --no-pub` → **0 error / 0 warning / 0 新增 info**（仅余基线 2 条 info，位于 `test/link_audit/io_link_test.dart`）。本轮出现的 2 个编译错误（`AsyncValue.value` 可空赋值、`NextClassInfo?` 误入 AsyncValue 列表）与 1 条 lint（`use_build_context_synchronously`）均已当场修复。

**复测后闭环率更新**：数据持久层 90% → **93%**（DATA-05 核心落地）；综合 **≈ 94%**。剩余推广项：其余 15 个仓储写方法按 `guardWrite` 模式收尾；`flutter test` 全量回归仍需在可运行环境执行。
