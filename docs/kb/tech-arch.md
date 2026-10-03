# 技术架构与三端适配

> 本文件规定「课表 · ClassSchedule」的工程结构、依赖、数据模型、状态管理、路由、同步抽象与三端构建方式，是开发的工程基准。

---

## 1. 技术选型

| 关注点 | 选型 | 理由 |
|---|---|---|
| 框架 | Flutter 3.41 / Dart 3.11 | 单码库出 Android/iOS，HarmonyOS 经社区适配 |
| 状态管理 | Riverpod 2.x | 编译期安全、可测、无 BuildContext 依赖 |
| 本地存储 | Drift 2.x | 类型安全 SQLite + 流式响应 |
| 路由 | go_router | 声明式、深链、ShellRoute 底部导航 |
| 通知 | flutter_local_notifications + flutter_timezone | 本地通知，免后端 |
| 序列化 | freezed + json_serializable | 不可变模型 + JSON |
| 国际化 | flutter_intl / gen-l10n（预留） | 首版仅 zh-CN |
| 桌面组件 |（P1）home_widget / iOS WidgetKit | 今日课程卡 |

---

## 2. 目录结构

```
lib/
├── main.dart                      # 启动 + ProviderScope + 系统 UI 配置
├── app.dart                       # MaterialApp.router、主题、路由表
├── core/
│   ├── theme/
│   │   ├── app_tokens.dart        # 颜色/字号/圆角/间距/模糊 token
│   │   ├── glass_tokens.dart      # 玻璃材质 token
│   │   └── app_theme.dart         # ThemeData(light/dark) + 主题色动态生成
│   ├── router/
│   │   └── app_router.dart        # go_router 配置
│   ├── util/
│   │   ├── week_math.dart         # 学期周次/日期推算
│   │   ├── conflict.dart          # 课程冲突检测
│   │   └── color_hash.dart        # 课程默认色 hash
│   └── platform/
│       └── glass_capability.dart  # 模糊能力探测与降级
├── data/
│   ├── database/
│   │   ├── app_database.dart      # Drift Database 定义
│   │   ├── tables.dart            # 表定义
│   │   └── converters.dart        # JSON/枚举类型转换器
│   ├── repositories/
│   │   ├── term_repository.dart
│   │   ├── course_repository.dart
│   │   ├── task_repository.dart
│   │   ├── exam_repository.dart
│   │   └── settings_repository.dart
│   └── sync/
│       ├── sync_client.dart       # 抽象接口
│       └── noop_sync_client.dart  # 本期实现
├── application/
│   ├── providers.dart             # Riverpod providers 汇总
│   ├── schedule/
│   ├── tasks/
│   └── settings/
├── domain/
│   ├── entities.dart              # 纯领域模型/枚举
│   └── failure.dart
├── presentation/
│   ├── shell/
│   │   ├── main_shell.dart        # 移动端左侧抽屉 + 宽屏玻璃侧栏
│   │   └── main_menu.dart         # 移动端主菜单按钮作用域
│   ├── schedule/
│   │   ├── schedule_page.dart     # 周视图主页
│   │   ├── widgets/
│   │   │   ├── week_date_bar.dart
│   │   │   ├── course_grid.dart
│   │   │   ├── course_block.dart
│   │   │   ├── next_class_card.dart
│   │   │   └── term_week_switcher.dart
│   ├── course/
│   │   ├── course_detail_sheet.dart
│   │   └── course_editor_page.dart
│   ├── tasks/
│   │   ├── tasks_page.dart
│   │   └── task_editor_sheet.dart
│   ├── calendar/
│   │   └── calendar_page.dart
│   ├── settings/
│   │   └── settings_page.dart
│   └── onboarding/
│       └── onboarding_page.dart
└── shared/
    └── widgets/
        └── glass/
            ├── glass_container.dart
            ├── glass_card.dart
            ├── glass_button.dart
            ├── glass_tab_bar.dart
            ├── glass_sheet.dart
            └── segment_control.dart
```

---

## 3. 数据模型（Drift Schema）

### 3.1 表

**terms（学期）**
| 列 | 类型 | 说明 |
|---|---|---|
| id | integer PK auto | |
| name | text | 如「2025-2026 学年第二学期」|
| start_date | integer | 开学周一距 1970 的天数（unix day）|
| total_weeks | integer | 默认 20 |
| current_week_override | integer nullable | 手动覆盖当前周；null=自动推算 |
| is_archived | boolean | 归档学期 |
| created_at / updated_at | integer | unix ms |

**courses（课程）**
| 列 | 类型 | 说明 |
|---|---|---|
| id | integer PK | |
| term_id | integer | FK terms |
| name | text | |
| teacher | text nullable | |
| location | text nullable | |
| color | integer | ARGB int |
| icon | text nullable | emoji |
| remark | text nullable | |
| created_at / updated_at | integer | |

**schedule_slots（排课片段）**
| 列 | 类型 | 说明 |
|---|---|---|
| id | integer PK | |
| course_id | integer | FK courses |
| day_of_week | integer | 1=周一 … 7=周日 |
| start_period | integer | 起始节 |
| end_period | integer | 结束节 |
| custom_start_minute | integer nullable | 片段级自定义开始时间；为空则跟随作息 |
| custom_end_minute | integer nullable | 片段级自定义结束时间；为空则跟随作息 |
| weeks | text | JSON 数组，如 `[1,3,5,7]` |
| created_at / updated_at | integer | |

> `week_type(every/odd/even)` 不入库，作为编辑器快捷选项，落库即展开为具体 `weeks` 列表。

**tasks（任务）**
| 列 | 类型 | 说明 |
|---|---|---|
| id | integer PK | |
| course_id | integer nullable | 关联课程 |
| title | text | |
| type | text | homework/quiz/project/other |
| due_at | integer nullable | unix ms |
| priority | integer | 0 普通 / 1 重要 / 2 紧急 |
| status | text | todo/doing/done |
| remark | text nullable | |
| created_at / updated_at | integer | |

**exams（考试）**
| 列 | 类型 | 说明 |
|---|---|---|
| id | integer PK | |
| course_id | integer nullable | |
| subject | text | |
| start_at | integer | unix ms |
| duration_min | integer | |
| location | text nullable | |
| seat | text nullable | |
| remark | text nullable | |
| created_at / updated_at | integer | |

**periods（作息时间表）**
| 列 | 类型 | 说明 |
|---|---|---|
| id | integer PK | |
| term_id | integer nullable | null=全局默认 |
| period_index | integer | 第几节 1..N |
| start_minute | integer | 当日起始分钟 |
| end_minute | integer | 当日结束分钟 |

**settings（键值，单行逻辑）**
| 列 | 类型 | 说明 |
|---|---|---|
| key | text PK | theme_mode / accent_color / glass_strength / schedule_style / notify_lead_min / dnd_start / dnd_end / current_term_id / onboarded ... |
| value | text | |

### 3.2 关系

```
terms 1──< courses 1──< schedule_slots
courses 1──< tasks
courses 1──< exams
```

### 3.3 冲突检测算法（core/util/conflict.dart）

给定 `(weeks[], dayOfWeek, [startPeriod, endPeriod])`，遍历同 term 下所有 slot：
- `weeks` 交集非空 **且** `dayOfWeek` 相同 **且** `[s1,e1] ∩ [s2,e2] ≠ ∅` → 时间冲突；
- 额外：地点相同且时间冲突 → 强冲突（阻断）；仅时间冲突 → 提示。

---

## 4. 状态管理（Riverpod）

| Provider | 类型 | 职责 |
|---|---|---|
| `appDatabaseProvider` | Provider | 单例 AppDatabase |
| `repositories.*Provider` | Provider | 各仓储 |
| `settingsProvider` | StreamProvider | 监听 settings 表 |
| `currentTermProvider` | FutureProvider | 当前学期实体 |
| `currentWeekProvider` | Provider | 当前周（自动/覆盖） |
| `scheduleForWeekProvider(week)` | FutureProvider.family | 该周课表 |
| `coursesOfTermProvider(termId)` | StreamProvider.family | |
| `tasksProvider(filter)` | StreamProvider.family | |
| `examsProvider` | StreamProvider | |
| `themeProvider` | Provider | 由 settings 派生 ThemeData |
| `notificationSchedulerProvider` | Provider | 课程/任务/考试通知调度 |

---

## 5. 同步抽象（云同步预留）

```dart
abstract class SyncClient {
  bool get isEnabled;
  Future<void> markDirty({required String entity, int? id});
  Future<void> push();   // 推送本地变更
  Future<void> pull();   // 拉取远端
}

class NoopSyncClient implements SyncClient { ... }   // 本期
```

- 所有 repository 写操作后调用 `syncClient.markDirty(...)`；
- 数据模型已含 `updated_at`，支持增量同步；
- `userId/syncState` 字段在接入真后端时通过 migration 增加。

---

## 6. 路由表（go_router）

| 路径 | 页面 |
|---|---|
| `/` | 引导（首启）/ Shell |
| `/onboarding` | 首次引导 |
| `/schedule` | 课表主页（Shell Tab）|
| `/tasks` | 任务（Shell Tab）|
| `/calendar` | 日历（Shell Tab）|
| `/me` | 我的（Shell Tab）|
| `/course/new`、`/course/:id` | 课程编辑 |
| `/task/new`、`/task/:id` | 任务编辑 |
| `/exam/new`、`/exam/:id` | 考试编辑 |
| `/settings/theme`、`/settings/notify`、`/settings/data` | 设置子页 |

---

## 7. 三端构建

```bash
# 通用
flutter pub get
flutter run -d <device-id>

# Android Release
flutter build apk --release --target-platform android-arm64

# iOS Release（macOS 主机）
flutter build ipa --release

# HarmonyOS（需切换社区 flutter_harmony 引擎，产物 ohos）
# 参考：https://gitcode.com/openharmony-sig/flutter_flutter
flutter build hap --release     # 适配后
```

> 鸿蒙端依赖 `flutter_harmony`；本期保证 lib/ 业务与 UI 在 Android/iOS 可构建运行，鸿蒙以「同源码 + 适配层」方式接入，ArkTS 桌面卡片列入 P2。

---

## 8. 降级与性能策略

- `GlassCapability`：运行时探测是否启用 `BackdropFilter`（看设备性能档/平台版本），不满足则 `enableBlur=false`，组件退化为纯色 + 噪点。
- 周视图 `PageView` 预渲染相邻页，避免滑动白屏；课程块用 `RepaintBoundary` 隔离。
- Drift 索引：`courses(term_id)`、`schedule_slots(course_id)`、`tasks(course_id, due_at)`。

---

## 9. 测试策略

- **单元**：`week_math`、`conflict`、`color_hash`、repository（内存 DB）。
- **组件**：Glass 组件快照、CourseBlock 渲染。
- **集成**：建课 → 出现在周视图 → 通知调度。
- 详见测试专家审查报告 [REVIEW.md](/kb/review)。
