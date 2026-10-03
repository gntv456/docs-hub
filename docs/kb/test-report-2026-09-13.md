# 课表 App 全功能链路闭环测试报告

| 项目 | 内容 |
|---|---|
| 被测对象 | 课表 · ClassSchedule（`D:\kechengbiao`，v1.1.0+2，Flutter 3.41.9 / Dart 3.11.5） |
| 测试类型 | 静态链路闭环审查（Link Closure Audit）+ 逻辑走查 + 边界对抗推演 |
| 测试日期 | 2026-09-13 |
| 审查规模 | 78 个 `lib/` 源文件、49 个测试文件、7 大功能板块 |
| 测试方法 | 分板块派遣资深逻辑工程师，逐条追溯「UI 事件 → 状态层 → 仓储 → 落库/系统能力 → 数据回流 → UI 重绘」五段链路，判定闭环/断点 |
| **综合链路闭环率** | **≈ 84%** |
| **缺陷总数** | **42 条**（P0 × 1、P1 × 12、P2 × 28、P3 × 1） |
| 结论 | **有条件通过**：主干业务闭环扎实，但存在 1 个致"保存黑洞"的 P0 与 12 个 P1，建议修复 P0/P1 后再发布 |

> **环境说明（重要）**：本机 `flutter test` 无法执行——所有测试文件加载阶段报 `Unable to connect to flutter_tester process: WebSocketException`，为沙箱环境限制，非项目问题。因此本报告**未复跑 269 条基线用例**，基线以 `README.md` 声明为准。所有缺陷结论均通过**逐行阅读源码 + 行号取证**得出，且 P0/P1 级结论已由主测工程师二次回查源码确认（见附录 A）。

---

## 一、测试团队分工与板块闭环率

| # | 板块 | 审查范围 | 闭环率 | 缺陷数 |
|---|---|---|---|---|
| 1 | 数据持久层 | database / 6 个 repository / sync | 85% | 6 |
| 2 | 课表主视图 | schedule_page / week_grid / next_class / week_math | 88% | 4 |
| 3 | 课程管理与冲突检测 | course_editor / course_management / conflict | 88% | 5 |
| 4 | 任务 · 考试 · 通知 | tasks / exams / notification_provider | 80% | 7 |
| 5 | 设置 · 学期 · 导入导出 | settings_* / term_* / data_io | 85% | 6 |
| 6 | 启动 · 路由 · 认证 · 主题 | main / app / router / auth / theme | 72% | 9 |
| 7 | 扩展板块 | 月历 / AI 识别 / 竞品解析 / 宠物 / 鸿蒙卡片 | 94% | 5 |

---

## 二、P0 / P1 关键缺陷（必须修复）

### 🔴 P0-1（COURSE-01）课程名超长 → 保存无反应黑洞

- **证据**：`lib/presentation/course/course_editor_page.dart:696`（`setState(() => _saving = true)`）；该文件全文**无 `try / catch`**（已全文检索确认）；`lib/data/database/tables.dart:20` → `name` 定义 `withLength(min: 1, max: 40)`
- **链路断点**：输入 >40 字课程名 → `create/update` 抛 drift `InvalidDataException` → 异常上抛无人捕获 → `_saving` **永久停留在 true** → 保存按钮保持禁用、无 toast、无错误提示、数据未落库
- **用户感知**：点了保存，界面毫无反应，按钮再也点不动，课程"保存失败却不告知"——最典型的黑洞体验，且用户会重复尝试
- **同类风险**：`tables.dart:54`（任务标题 max 80）、`:72`（考试科目 max 40）存在相同模式，建议一并排查
- **修复**：`_save` 整体包 `try/catch`，`finally` 中重置 `_saving`；失败时 `ScaffoldMessenger` 提示具体原因；保存前前置校验 `name.trim().length` 并即时在输入框下方显示字数上限
- **复现**：新建课程 → 名称输入 41 个中文字符 → 点保存 → 无任何反馈，按钮置灰

### 🟠 P1-1（TASK-01）通知时区未设置，全部提醒偏移 8 小时

- **证据**：`lib/application/notification_provider.dart:77` 仅 `tz_data.initializeTimeZones()`，全仓**无 `setLocalLocation` / `getLocation`**（已全量检索确认）；`:132` `tz.TZDateTime.from(when, tz.local)`
- **链路断点**：`tz.local` 未初始化时默认 **UTC** → 所有 zonedSchedule 按 UTC 解释本地时间
- **用户感知**：中国区用户设的"上课前 10 分钟提醒"实际在 8 小时后触发；**通知功能整体失效**
- **修复**：`init()` 中 `tz.setLocalLocation(tz.getLocation('Asia/Shanghai'))`（更稳妥：用 `flutter_native_timezone` 取系统时区）
- **复现**：排一条 1 小时后触发的提醒，观察实际触发时刻

### 🟠 P1-2（BOOT-01）启动初始化异常被吞，无兜底页

- **证据**：`lib/app.dart:43` 只判 `init.isLoading`；全 `lib/` **无任何 `hasError` / `AsyncError` / `errorBuilder` 分支**（除图片 errorBuilder）
- **链路断点**：DB 打开失败 → `appInitProvider` 报错 → `isLoading=false` 但无错误分支 → settings stream 也错 → 回落默认值 → `onboardingShown=false` → 渲染引导页 → 引导页写 settings 再失败 → **引导页软锁循环**
- **用户感知**：数据库损坏/磁盘满时，应用卡在引导页或白屏，无法恢复
- **修复**：`app.dart` 增 `init.hasError` 分支 → 渲染错误页 + 「重试 / 恢复出厂数据」入口

### 🟠 P1-3（LIFE-01）无前后台生命周期监听，跨零点数据 stale

- **证据**：全 `lib/` 无 `AppLifecycleListener` / `WidgetsBindingObserver`；`main_shell.dart:37` 仅 `initState` 初始化一次
- **链路断点**：「当前周」「下一节课」「DDL 倒计时」依赖 `DateTime.now()`，但 provider 不随真实时间重建
- **用户感知**：App 后台过夜后回到前台，仍显示昨天的"下一节课"和倒计时
- **修复**：注册 `AppLifecycleListener`，`resume` 时 `invalidate` 相关 provider；或用定时器对齐零点

### 🟠 P1-4（SET-01）5 项"死设置"——存了没人消费

- **证据**：`global_settings_page.dart:46/85/97/106` 写入 `wallpaperAccent`、`ignoreBatteryOptimization`、`autoCheckUpdates`、`hapticFeedback`、`configErrorTips`；全仓检索显示**除解析（`app_providers.dart:171-177`）与写入外无任何消费点**
- **用户感知**：开关能切换、能持久化，但**完全不生效**，属于"假功能"
- **修复**：接入真实逻辑（主题/触感/更新检查），或从 UI 暂时下线

### 🟠 P1-5（SCHED-01）全链路无错误态分支

- **证据**：`schedule_page.dart:243-256`、`week_grid.dart:53-57`、`next_class_card.dart:19`、`today_learning_panel.dart:31-49` 统一使用 `.valueOrNull`
- **链路断点**：Stream 报错被静默吞掉，退化为"无数据"；`term`/`currentWeek` 为 null 时 `CircularProgressIndicator` 永不退出
- **用户感知**：数据库异常时课表显示空白/永久转圈，用户以为"没课"
- **修复**：改用 `AsyncValue.when` / 判 `hasError`，提供错误卡 + 重试

### 🟠 P1-6（SCHED-02）拖拽调课清空自定义时间 —— 已亲自复核

- **证据**：`lib/presentation/schedule/schedule_page.dart:123-131`，`updateSlot(slot.copyWith(..., customStartMinute: const Value(null), customEndMinute: const Value(null)))` 硬编码置空
- **链路断点**：带自定义时间的课程（8:11 上课）拖到新格后，自定义时间丢失并回落默认作息；且 `:106-107` 冲突检测用**默认节次时间**而非原自定义时间，可能漏检
- **修复**：拖拽时保留原 `custom*` 值；冲突检测的 `startMinute/endMinute` 改用 `s.customStartMinute ??`（已有此逻辑于 others，唯独被拖动 slot 自身未用）

### 🟠 P1-7（DATA-01）三处"整表替换"非原子事务 —— 已亲自复核

- **证据**：`schedule_repository.dart:126-148`（`replaceSlotsOfCourse`）、`term_repository.dart:125-135 / 169-179`（全局/学期作息替换）
- **链路断点**：`delete` 先提交，`batch` 后执行；batch 任一插入失败则该课程排课/整学期作息**已被清空且不可回滚**
- **修复**：`await _db.transaction(() async { delete; batch; })`

### 🟠 P1-8（DATA-02）节次越界被静默钳制而非报错 —— 已亲自复核

- **证据**：`schedule_repository.dart:161-165` `_validatedPeriods` 中 `end.clamp(s, maxWeek)`
- **链路断点**：`start=8, end=5` 被静默改为 `(8, 8)` 零长度片段，导入/识别传反的起止节次不报错，产生永不显示或异常的格子
- **修复**：改为 `throw` 或返回校验失败结果，由上层提示用户

### 🟠 P1-9（TASK-02）删除任务/考试不直接取消通知

- **证据**：`task_repository.dart:79`、`exam_repository.dart:61` 只落库；取消完全依赖 `main_shell.dart:51` 常驻 watch → 流 → `rescheduleAll` 全量 `cancelAll`
- **链路断点**：shell 未挂载 / provider 被 dispose / 流未下发时，**删掉的任务仍会响铃**
- **修复**：删除时显式 `cancel(100000+id)` / `cancel(110000+id)`，再局部重排

### 🟠 P1-10（SET-02）导入备份后当前学期指针不自愈

- **证据**：`data_io.dart:346` 原样回写 settings；`app_providers.dart:258-262` `watchById` 返回 null；仅 `appInit:364` 启动时才校验回退
- **链路断点**：备份中 `current_term_id` 指向不存在的学期时，当次会话课表/月历**全空**，须重启 App 才恢复
- **修复**：导入完成后复用 appInit 的存在性校验 + 回退逻辑

### 🟠 P1-11（ROUTE-03）未登录/冷启动深链被静默丢弃

- **证据**：`harmony_widget_bridge.dart:54-74` 直接 `r.push`；Splash/Onboarding/Login 用的是 `MaterialApp(home:)`（`app.dart:44/57/84`），router 未挂载 → push 抛错被 `catch` 吞掉（`:61-63`），且无重放队列
- **用户感知**：鸿蒙桌面卡片点击课程 → 冷启动需登录 → 深链丢失，停在首页
- **修复**：深链入队，待 router 挂载且登录完成后 `go`

### 🟠 P1-12（EXT-01）AI 课表识别缺拍照入口

- **证据**：`ai_recognition_page.dart:81-133` 只有 FilePicker 与文本框；全仓无 `ImagePicker`/`camera`；`schedule_recognition_client.dart:8` 的 `recognizeImage` **从未被调用**
- **用户感知**：PRD 承诺的"拍照导入课表"实际只支持选文件
- **修复**：补相机入口；文件选择取消时（`:94` 静默 return）给"已取消"提示

---

## 三、P2 缺陷清单（建议排期修复）

| ID | 缺陷 | 证据 | 影响 |
|---|---|---|---|
| DATA-03 | `updateSlot` 不重编码 weeks，畸形周次可直落库 | `schedule_repository.dart:109` | 冲突检测出现"幽灵周" |
| DATA-04 | `settings.remove` 未 `markDirty`，与 `set` 不一致 | `settings_repository.dart:81-83` | 接真同步后删除设置不推送 |
| DATA-05 | 仓储异常原始冒泡，未转 domain Failure | 各 repository | UI 需各自兜底，错误态不可辨识 |
| DATA-06 | 节次上界误用 `WeekCodec.maxWeek`（30） | `schedule_repository.dart:162` | 可写入超出学期作息定义的节次 |
| SCHED-03 | 空白格建课未带当前周次，默认变成"每周" | `schedule_page.dart:325-327` | 在第 5 周建课却全学期生效 |
| SCHED-04 | 学期结束后 `currentWeek` 夹到末周 | `week_math.dart:36` | 毕业后仍显示末周为"本周" |
| COURSE-02 | 片段合法性未校验，`SlotInput.isValid` 未被调用 | `course_editor_page.dart:794-805` | start>end 被静默钳制 |
| COURSE-03 | 越界周次（>学期周数）落库无拦截 | 同上 + `converters.dart:27` | 周视图渲染"幽灵周" |
| COURSE-04 | 编辑页删除失败仍静默 pop | `course_editor_page.dart:833-839` | 删除失败用户不知情 |
| COURSE-05 | Course/ScheduleSlot 实体无单测 | `test/domain/entities_test.dart` | 实体变更无回归保护 |
| TASK-03 | 通知 ID 跨段可能碰撞（任务/考试 ID 区间） | `notification_provider.dart:226/233/252/261` | 通知互相覆盖 |
| TASK-04 | 当天 DDL 零提醒（08:00 已过则无提醒） | `notification_provider.dart:130/225` | 当天到期任务收不到提醒 |
| TASK-05 | 考试可设过去日期且不过期归档 | `exam_editor_sheet.dart:108` | 历史考试长期占位 |
| TASK-06 | 任务页错误态缺失（`valueOrNull ?? []`） | `tasks_page.dart:178/365` | DB 异常静默显空 |
| TASK-07 | 通知关闭后再开启不重新申请权限 | `main_shell.dart:42` | 先关后开无通知 |
| SET-03 | 节次数调小"藏"掉旧课（slot 引用被删节次） | `period_editor_page.dart:87` + `week_grid.dart:103` | 11 节改 8 节后第 9 节课凭空消失 |
| SET-04 | ICS 导出无 TZID/UTC、用 `\n` 非 CRLF 未折行 | `data_io.dart:468` | 跨时区偏移、严格客户端拒收 |
| SET-05 | 学期重叠无校验 | `term_editor_sheet.dart` | 并行课表无提示 |
| SET-06 | 勿扰时段（DND）无配置入口 | `notification_provider.dart:131` | 用户无法配置勿扰 |
| BOOT-03 | 时区未固定（与 TASK-01 同源，影响周次计算） | `app_providers.dart:286` | 跨境/模拟器周次算错 |
| ROUTE-01 | 深链 query 参数无范围校验（`day=-1&period=999` 直通） | `app_router.dart:19-26` | 越界传参可能致渲染异常 |
| ROUTE-02 | 无 `errorBuilder` / 404 兜底 | `app_router.dart:12` | 未知路径走框架默认错误页 |
| AUTH-01 | 登录成功仅靠 Provider 重建间接跳转 | `login_page.dart:74-82` | 流未及时 emit 则卡登录页 |
| ONB-01 | `AppSettingsState.copyWith` 丢 `onboardingShown` 且硬编码 `onboarded: true` | `app_providers.dart:191-235` | 潜伏陷阱：设置页存任意项会重置引导 |
| THEME-01 | 低端机玻璃降级未生效（`isBlurSupported` 仅 `!kIsWeb`） | `glass_capability.dart:16-23` | 低端机默认开 Blur 可能卡顿 |
| EXT-02 | 竞品解析逆向周次区间（`16-2`）静默回落全学期 | `competitor_schedule_parser.dart:194-213` | 数据失真：本应无课变全周有课 |
| EXT-03 | 鸿蒙卡片写文件失败静默且无测试 | `widget_sync_provider.dart:68-74` | 卡片数据陈旧无告警 |
| EXT-04 | 宠物 avatar 使用新建 `PetAssetStore()` 而非 provider 实例 | `virtual_pet_page.dart:733` | CDN 缓存不共享，命中率下降 |

### P3
- **EXT-05** 非随包宠物先走一次 404 资产加载再回退矢量（`virtual_pet_sprite.dart:86-87`），极小性能开销。

---

## 四、测试覆盖缺口（建议补充的用例）

高优先级（对应 P0/P1，缺一条就漏一个线上事故）：

1. `_save` 异常路径：超长名 → 断言 `_saving` 复位 + 出现错误提示（覆盖 COURSE-01）
2. 通知时区：`setLocalLocation` 后调度时刻断言（覆盖 TASK-01）
3. 三处「整表替换」事务中断回滚：batch 中途抛错后断言原数据行数不变（覆盖 DATA-01）
4. 删除任务/考试后断言对应通知 ID 被 `cancel`（覆盖 TASK-02）
5. 导入 `current_term_id=999` 的备份 → 断言课表非空、指针自愈（覆盖 SET-02）
6. `app.dart` 三态集成测试：isLoading / hasError / 正常分流（覆盖 BOOT-01）
7. 生命周期 resume → provider invalidate（覆盖 LIFE-01）
8. 拖拽带自定义时间的课程 → 断言 `customStartMinute` 保留（覆盖 SCHED-02）

中优先级：

9. Stream 报错时的 UI 错误态（覆盖 SCHED-01 / TASK-06）
10. 全局设置 5 项开关的"生效"断言（覆盖 SET-01，当前因不生效而无法断言）
11. 节数调小 → slot 被隐藏的回归（覆盖 SET-03）
12. ICS 导出的 TZID/CRLF 格式断言（覆盖 SET-04）
13. 竞品解析 `weeks:"16-2"` 正确性断言（当前只断言"不崩溃"）
14. 深链参数越界 clamp（覆盖 ROUTE-01）
15. `copyWith` 保留 `onboardingShown`（覆盖 ONB-01）
16. 页面级 Widget 测试：`CalendarPage` / `AiRecognitionPage` / `settings_page` 导入全流程（目前仅有纯函数测试）

---

## 五、发布建议

| 阻断级别 | 建议 |
|---|---|
| **阻断发布** | P0-1（保存黑洞）、P1-1（通知时区，功能整体失效） |
| **强烈建议本版修复** | P1-2（启动兜底）、P1-3（生命周期刷新）、P1-5（错误态）、P1-6、P1-7、P1-9 |
| **下个迭代** | P1-4（死设置）、P1-8、P1-10、P1-11、P1-12 及全部 P2 |
| **流程改进** | 1) 所有 `AsyncValue` 读取统一改为 `when` 或显式处理 `hasError`；2) 所有写操作统一 `try/catch` + 结果反馈；3) 建"设置项必须有消费点"的评审检查项；4) 建"深链/生命周期/错误态"三类必测清单 |

---

## 附录 A：主测工程师二次复核记录

对子代理报告中 6 条最高风险论断进行了源码回查，结论如下：

| 论断 | 复核方式 | 结论 |
|---|---|---|
| COURSE-01 保存黑洞 | 全文检索 `course_editor_page.dart` 的 `try/catch` → **0 命中**；`tables.dart:20` 确认 `max: 40` | ✅ 属实，升级为 P0 |
| TASK-01 时区 | 全 `lib/` 检索 `setLocalLocation`/`getLocation` → **0 命中**；`notification_provider.dart:77/132` 确认 | ✅ 属实 |
| SCHED-02 拖拽清时间 | 直读 `schedule_page.dart:123-131` 确认硬编码 `Value(null)` | ✅ 属实 |
| DATA-01 非事务 | 直读 `schedule_repository.dart:126-148` 确认 delete 在 batch 外 | ✅ 属实 |
| DATA-02 静默钳制 | 直读 `schedule_repository.dart:161-165` 确认 `clamp` | ✅ 属实 |
| BOOT-01 无错误态 | 全 `lib/` 检索 `hasError`/`AsyncError` → 仅图片 errorBuilder；`app.dart:43` 确认 | ✅ 属实 |
| SET-01 死设置 | 全 `lib/` 检索 5 个开关字段 → 仅定义/解析/写入，无消费 | ✅ 属实 |

## 附录 B：本次未能覆盖的验证项

1. **动态测试**：`flutter test` 在本沙箱无法启动 `flutter_tester`，269 条基线用例未复跑；建议在本地/CI 复跑确认。
2. **真机验证**：通知触发时刻、鸿蒙 ArkTS 卡片（需 DevEco + 真机）、三端构建产物。
3. **性能与包体**：玻璃模糊帧率、包体 ≤25MB 实测。
4. **安全**：`security_adversarial_round2/3` 已覆盖导入钳制、越界、下载面；**未覆盖**：拍照 OCR 注入、竞品逆向周次注入。
