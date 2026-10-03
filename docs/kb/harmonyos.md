# HarmonyOS（鸿蒙）端接入指南

> 「课表 · ClassSchedule」的 Flutter 业务与 UI 三端同源。本文说明如何在 HarmonyOS NEXT 上出包，以及桌面卡片（Service Widget）的集成方式。

## 1. 总体方案

- **业务/UI**：复用 `lib/` 全部 Flutter 代码，**不改动**。
- **引擎**：将 Flutter 切换到社区 [flutter_harmony](https://gitcode.com/openharmony-sig/flutter_flutter)（OpenHarmony-SIG 维护），使 `flutter` 命令支持 `ohos` 平台与 `hap` 产物。
- **原生增强**：桌面卡片为纯 HarmonyOS ArkTS 能力，源码位于 [`ohos/widget/`](../ohos/widget/)，随 `hap` 一起出包，不经过 Flutter。

## 2. 环境与出包

```bash
# 1) 切换到 flutter_harmony 引擎（按仓库 README 安装）
# 2) 创建/补全 ohos 工程（引擎提供）
flutter create --platforms ohos .

# 3) 拉依赖 + 生成
flutter pub get
dart run build_runner build --delete-conflicting-outputs

# 4) 构建 hap（在连接鸿蒙设备/模拟器时）
flutter build hap --release
# 或开发期
flutter run -d <harmonyos-device>
```

> 鸿蒙端需 DevEco Studio 与 HarmonyOS SDK；本仓库的 Windows 构建主机无法出 hap，CI 需鸿蒙节点。

## 2.1 App 图标与启动窗（品牌资源已就绪）

图标资源包位于 [`packaging/ohos/`](../packaging/ohos/)（源图与其他平台一致，取自品牌 logo 的图标区）：

| 文件 | 用途 | 放置位置（DevEco 工程内） |
|---|---|---|
| `app_icon.png`（1024×1024） | AppScope 应用图标 | `AppScope/resources/base/media/app_icon.png`（覆盖默认） |
| `layered/foreground.png` + `layered/background.png` | 分层图标（前景 + 品牌青绿渐变背景，1024×1024） | `AppScope/resources/base/media/foreground.png`、`background.png`；`AppScope/resources/base/profile/layered_image.json` 内容见 `layered/layered_image.json` |
| `icon.png`（512×512） | entry Ability 图标 | `entry/src/main/resources/base/media/icon.png`，并在 `module.json5` 的 ability `icon` 字段引用 `$media:icon` |
| `startIcon.png`（512×512，白底居中 logo） | 启动窗图标（对应冷启动白屏窗口） | `entry/src/main/resources/base/media/startIcon.png`；在 `module.json5` 的 ability `startWindowIcon` 引用 `$media:startIcon` |

接入要点：

1. `flutter create --platforms ohos .` 生成工程后，用上表覆盖对应默认资源（默认 `app_icon.png`/`icon.png`/`startIcon.png` 为 OpenHarmony 机器人图）。
2. 应用图标推荐走**分层图标**：`app.json5`（AppScope）中 `"icon": "$media:layered_image"`，让系统按桌面形状自动裁切；简图模式可直接用 `app_icon.png`。
3. `startWindowIcon` 只能配静态图（HarmonyOS 无 Android 那种 layer-list 启动背景），白底居中即与 Android/iOS 启动图观感一致；如需纯色底可在 `startWindowBackground` 补充颜色资源。
4. 桌面卡片（`ohos/widget/`）目前为纯 ArkTS 文本布局，未引用 media 图片，接入图标后无需改动卡片源码。

## 3. 桌面卡片集成

卡片源码已提供：

| 文件 | 作用 |
|---|---|
| [`ohos/widget/TodayClassCard.ets`](../ohos/widget/TodayClassCard.ets) | 卡片 UI（ArkTS 声明式）：下一节课 / 地点 / 倒计时 |
| [`ohos/widget/TodayClassCompactCard.ets`](../ohos/widget/TodayClassCompactCard.ets) | 紧凑渐变样式：适合 2×2 快速查看下一节课 |
| [`ohos/widget/TodayClassAgendaCard.ets`](../ohos/widget/TodayClassAgendaCard.ets) | 今日日程样式：适合 2×4 展示当天最多 3 节课 |
| [`ohos/widget/TodayClassCardFormAbility.ets`](../ohos/widget/TodayClassCardFormAbility.ets) | 卡片 `FormExtensionAbility`，读取共享数据并 `updateForm` |
| [`ohos/widget/today_class_card_config.json`](../ohos/widget/today_class_card_config.json) | 卡片元数据（尺寸 2×2 / 2×4，定时刷新） |

集成步骤（DevEco Studio 内）：
1. 将 `ohos/widget/*.ets` 放入 `ohos/entry/src/main/ets/widget/`；
2. 将 `today_class_card_config.json` 内容并入 `ohos/entry/src/main/module.json5` 的 `extensionAbilities > forms`（或在 `resources/base/profile/` 下作为 form_config 引用）；
3. 在 `module.json5` 注册 `TodayClassCardFormAbility`（type `form`，srcEntry 指向上述 ets）。

## 4. 数据桥接（Flutter ↔ 卡片）

采用「共享文件」方案，零 MethodChannel、跨进程安全：

```
Flutter 端（nextClassWidgetSyncProvider）
   └─ 写 getApplicationDocumentsDirectory()/.today_class.json
        {
          courseName, location, period, countdown, accent, ongoing,
          openTarget, todayCount, agendaTitle1..3, agendaMeta1..3
        }
卡片端（TodayClassCardFormAbility）
   └─ 读 context.filesDir/.today_class.json → updateForm
```

- Flutter 侧已实现：[`lib/application/widget_sync_provider.dart`](../lib/application/widget_sync_provider.dart)，由 `MainShell` 订阅，数据/时钟变化即重写。
- 鸿蒙侧约定 `path_provider` 的 `documentsDir` 与卡片 `context.filesDir` 指向同一沙箱目录；若引擎映射不一致，可改用 MethodChannel 由 FormAbility 主动拉取（见下节）。

> 在 Android/iOS 端该文件仅占空间、无副作用；仅鸿蒙卡片消费。

## 5. 卡片点击跳转

三张卡片根节点都绑定了 `postCardAction`：

```ts
postCardAction(this, {
  action: 'router',
  abilityName: 'EntryAbility',
  params: { target: this.openTarget }
});
```

- `openTarget` 由 Flutter 写入：有下一节课时为 `/course/<id>`，否则为 `/`。
- ⚠️ `postCardAction` 的调用形式随 HarmonyOS API 版本而变：API 9 用上面的「对象形式」；
  API 10+ 推荐改为位置参数形式 `postCardAction(this, 'router', { abilityName, params })`。
  若点击未拉起应用，按目标 API 调整，并可在参数里补 `bundleName`。

### 5.1 全链路：点击 → 直达课程页

```
卡片 onClick
  └─ postCardAction(router, { abilityName:'EntryAbility', params:{ target:'/course/12' } })
        └─ 系统拉起 EntryAbility，want.parameters['target'] = '/course/12'
              └─ EntryAbility 保存 launchTarget，并通过 MethodChannel 派发
                    └─ Flutter HarmonyWidgetBridge → go_router.push('/course/12')
```

两端契约（必须一致）：

| 端 | 文件 | 通道 / 约定 |
|---|---|---|
| 卡片 | [`ohos/widget/TodayClassCard.ets`](../ohos/widget/TodayClassCard.ets) 等 3 张 | `postCardAction` router，`params.target` |
| 宿主 | [`ohos/widget/EntryAbility.ets`](../ohos/widget/EntryAbility.ets)（模板） | 通道 `kechengbiao/widget`：`getLaunchTarget()` / `pushTarget(target)`；从 `want.parameters['target']` 取值 |
| Flutter | [`lib/application/harmony_widget_bridge.dart`](../lib/application/harmony_widget_bridge.dart) | 同通道；冷启动查 `getLaunchTarget`，运行时收 `pushTarget`；仅放行 `/course/<id>`，其余忽略 |
| 启动接线 | [`lib/main.dart`](../lib/main.dart) | `HarmonyWidgetBridge.init(appRouter)`（一次性，非鸿蒙平台自动 no-op） |

### 5.2 集成步骤（DevEco Studio 内）

1. 把 `ohos/widget/EntryAbility.ets` 作为宿主 Ability 接入（替换或继承引擎生成的默认 EntryAbility）；
   导入路径与「通道注册时机钩子」按你的 flutter_harmony 版本调整，通道名与方法名保持上表契约。
2. 在 `module.json5` 把该 Ability 注册为入口（`skills` 含 launcher），并保留卡片 `TodayClassCardFormAbility` 的 form 注册。
3. Flutter 侧无需改动——`main.dart` 已在启动时初始化桥；非鸿蒙端调用 `MethodChannel` 会抛
   `MissingPluginException` 并被静默吞掉，不影响 Android/iOS/桌面/网页。

> `HarmonyWidgetBridge` 仅放行 `/course/<id>`，防止卡片侧伪造任意路由；未识别的目标在 debug 模式打印日志。

## 6. 备选：MethodChannel 方案

若共享文件路径不可靠，可在 `flutter_harmony` 的 ohos plugin 侧注册 channel：

```dart
// Flutter 侧
const platform = MethodChannel('kechengbiao/widget');
platform.invokeMethod('updateNextClass', data);
```

ArkTS 侧在 plugin 中接收并调用 `formProvider.updateForm`。适用于卡片需要即时刷新的场景。

## 7. 当前限制

- 鸿蒙端未在本机构建验证（无鸿蒙 SDK/设备）；ArkTS 卡片与 `EntryAbility` 均为可集成模板，需在 DevEco Studio 接 flutter_harmony 引擎后出包验证。
- 卡片点击跳转的**深链链路已全打通**：卡片 `postCardAction`（既有）→ `EntryAbility` 读 `want.parameters.target`（[模板](../ohos/widget/EntryAbility.ets)）→ Flutter [`HarmonyWidgetBridge`](../lib/application/harmony_widget_bridge.dart) → `go_router` 直达课程页。Flutter 侧已通过 `flutter analyze`；ArkTS 侧待真机验证。
- 多学期卡片可复用当前 `openTarget` / agenda 字段，后续按 `termId` 扩展共享 JSON 即可。
