# 出包指南（Android / HarmonyOS）

> 本文记录 v1.1.0（build 2）在 Windows 构建主机上的实际出包流程与鸿蒙端的环境限制。
> Windows 包见 `docs/CHANGELOG.md` 与 `artifacts/release-v1.1.0-*`。

## Android APK ✅ 已出包

### 环境要求
- Android SDK（本机 `%LOCALAPPDATA%\Android\Android\Sdk`）、JDK 17（Temurin 验证通过）
- Flutter 3.41 stable

### 签名（一次性）
```bash
# 生成 release 密钥（10 年有效期）
keytool -genkey -v -keystore android/app/kechengbiao-release.jks \
  -alias kechengbiao -keyalg RSA -keysize 2048 -validity 10950 \
  -storepass <密码> -keypass <密码> \
  -dname "CN=haoxue, OU=dev, O=haoxue, L=Beijing, ST=Beijing, C=CN"
```
`android/key.properties`（**不入库**，已加入 .gitignore 验证）：
```properties
storePassword=<密码>
keyPassword=<密码>
keyAlias=kechengbiao
storeFile=kechengbiao-release.jks
```
`android/app/build.gradle.kts` 已接入：有 key.properties 走正式签名，
缺失时自动回落 debug 签名（CI/新环境不阻断）。

### 出包
```bash
flutter build apk --release                 # 通用包（含多 ABI）
flutter build apk --release --split-per-abi  # 按 ABI 拆分（推荐分发）
```

### v1.1.0 产物（artifacts/）
| 文件 | 大小 | 说明 |
|---|---|---|
| `*-android-v1.1.0-build2-release-*.apk` | 63.4MB | 通用包（armeabi-v7a + arm64 + x86_64） |
| `*-android-v1.1.0-build2-arm64-*.apk` | 23.4MB | 主流 64 位机推荐 |
| `*-android-v1.1.0-build2-armv7-*.apk` | 21.2MB | 旧 32 位机 |

签名验证（apksigner）通过：CN=haoxue 正式证书；
包内宠物资产仅 `myth_01`（瘦身生效，APK 大小主要由 Flutter 引擎 + 依赖构成）。

### ⚠️ 上架前注意
- 当前密钥为本机自签。**商店上架（华为/小米/OV/应用宝）需要 App 备案与软著**，
  且各商店对签名证书有存档要求——若后续更换正式企业密钥，已安装用户无法覆盖升级，
  请在首发的分发渠道定下后**一次性**确定签名。
- 包体 63.4MB 超过 PRD NFR（≤25MB）：split-ABI 后达标（21-24MB）。
  商店分发用 split 包；直装分发用通用包。

## HarmonyOS HAP ❌ 本机无法出包（环境限制）

### 根因（三项硬缺口）
1. **无 flutter_harmony 引擎**：hap 构建需 OpenHarmony-SIG 的
   [flutter_harmony](https://gitcode.com/openharmony-sig/flutter_flutter)
   定制 Flutter（`flutter build hap` 子命令）。本机官方 Flutter 3.41 无此能力
   （实测 `--release` 选项不存在）。
2. **ohos/ 不是完整工程**：仓库内 `ohos/widget/` 只有 ArkTS 卡片模板
   （5 个 .ets + 配置），缺 `build-profile.json5`、`module.json5`、hvigor
   工程骨架——需 flutter_harmony 引擎执行 `flutter create --platforms ohos .` 生成。
3. **DevEco Studio 已装但未接 Flutter**：本机有 DevEco（含 SDK/openharmony、
   hvigor、ohpm、node），具备原生侧工具链；缺的只是 Flutter 侧引擎。

### 出包步骤（在具备条件的机器/CI 节点执行）
```bash
# 1) 切换 flutter_harmony 引擎（按其 README 安装，替换 PATH 中的 flutter）
# 2) 生成 ohos 工程骨架（保留 ohos/widget/ 下的卡片模板，按 HARMONYOS.md 第 3 节并入）
flutter create --platforms ohos .
flutter pub get
dart run build_runner build --delete-conflicting-outputs
# 3) 出包
flutter build hap --release
```
DevEco Studio 侧需配置签名证书（AGC 申请 Debug/Release Profile）。

### 在 DevEco 里需要做的验证清单
- 卡片三形态（经典/紧凑/今日日程）的尺寸与深链跳转
- `.today_class.json` 共享文件路径（`getApplicationDocumentsDirectory` 在
  ohos 的映射）与 FormAbility 读取
- `kechengbiao/widget` MethodChannel（`getLaunchTarget`/`pushTarget`）注册时机
