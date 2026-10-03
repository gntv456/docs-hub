# P3 接入说明

P3 包含两类工作：本地闭环能力，以及依赖外部服务的能力。当前仓库已优先落地本地闭环，并为外部能力补齐可替换边界。

## 1. 已落地

| 能力 | 状态 | 关键文件 |
|---|---|---|
| 卡片点击跳转 | 已提供 ArkTS `postCardAction`，参数为 `openTarget` | `ohos/widget/TodayClass*.ets`、`widget_sync_provider.dart` |
| 多卡片样式 | 已提供经典下一节、紧凑下一节、今日日程三种 form | `ohos/widget/today_class_card_config.json` |
| 卡片共享数据扩展 | 已同步下一节、今日课程数、最多三条日程 | `lib/application/widget_sync_provider.dart` |
| 教务系统对接边界 | 已提供 `AcademicImportClient` 抽象与 Noop 默认实现 | `lib/data/integrations/academic_import_client.dart` |
| AI 课表识别边界 | 已提供 `ScheduleRecognitionClient` 抽象；内置识别器已支持自然语言行、CSV 表头、JSON `courses` 草稿，可把 OCR/复制文本或 txt/csv/md/json 文件转为课程草稿；图片入口已预留，OCR 待模型服务 | `lib/data/integrations/schedule_recognition_client.dart`、`lib/data/integrations/local_schedule_recognition_client.dart`、`lib/presentation/import/ai_recognition_page.dart` |
| 用户可见入口 | 设置页已显示教务导入、拍照识别、云同步状态，不再只藏在代码抽象中 | `lib/presentation/settings/settings_page.dart` |
| 首屏体验 | 课表空态按本周可见排课判断，提供新建课程、AI 识别与试用示例 | `lib/presentation/schedule/schedule_page.dart` |
| 运营基础入口 | 设置页提供反馈与建议、隐私与数据说明、更新日志，本地内测阶段先形成可见闭环 | `lib/presentation/settings/settings_page.dart` |
| 日历时间轴 | 月历选中日汇总课程、作业、考试 | `lib/presentation/calendar/calendar_page.dart` |
| 竞品参考补强 | 课程新增学分字段；设置新增课表设置、已添加课程、多课表管理、全局设置；课表外观支持周末显示、非本周课程、格子高度、圆角、底部留白 | `course_editor_page.dart`、`course_management_page.dart`、`timetable_settings_page.dart`、`global_settings_page.dart`、`term_management_page.dart` |

## 2. 待接入外部依赖

| 能力 | 需要补充 |
|---|---|
| 教务系统对接 | 学校代码、登录方式、验证码策略、课表 HTML/JSON 解析器 |
| AI 图片课表识别 | 模型服务 endpoint、鉴权、图片上传限制、图片 OCR 结果到文字识别器的接线 |
| 账号云同步真后端 | 用户体系、后端 API、冲突合并策略、端到端加密/隐私策略 |
| 鸿蒙真机验收 | DevEco Studio + flutter_harmony 出 hap，验证卡片尺寸、点击深链与共享文件路径 |

## 3. 接入原则

- 外部导入只生成“预览草稿”，必须经用户确认后才写入本地数据库。
- 云同步仍保持本地优先，离线可用；远端失败不得阻断本地编辑。
- 学校账号、AI 图片、同步 token 不写入导出备份明文。
