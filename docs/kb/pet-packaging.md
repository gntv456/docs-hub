# 宠物资源打包与按需下载方案

> 目的：把安装包从 ~97MB 压回 NFR 约定的 ≤25MB，同时保留 144 只宠物的完整图鉴。

## 结论速览

| 项 | 位置 | 大小 | 分发方式 |
|---|---|---|---|
| 默认宠物 `myth_01`（6 帧动画） | `assets/pets/myth_01/` | ~2.4MB | 随安装包（pubspec 声明） |
| 其余 143 只宠物 | `artifacts/pet_pack/<petId>/` | ~93MB | 上传 CDN，运行时按需下载 |
| 目录清单 `pet_manifest.json` | `assets/pets/pet_manifest.json` | ~40KB | 随安装包（离线可读图鉴） |

## 运行时行为（三级回退）

`lib/application/pet_asset_store.dart` + `lib/presentation/pet/virtual_pet_sprite.dart`：

1. **包内资产**：`myth_01` 直接走 `Image.asset`；
2. **下载缓存**：其余宠物下载到 `{应用文档目录}/pet_assets/<petId>/<state>.webp`，命中走 `Image.file`；
3. **矢量回退**：未下载 / 下载失败 / 未配置下载源 → 显示原有 `_PetPainter` 矢量绘制，功能不阻塞。

下载源未配置（`petAssetRemoteBaseUrl == null`）时 UI 不显示下载按钮，全体非默认宠物以矢量形态展示——**离线零依赖，上架不阻塞**。

## 上线前接入步骤

1. 把 `artifacts/pet_pack/` 整目录上传到任意 https 静态资源服务（对象存储 CDN 即可），保持 `<petId>/<state>.webp` 相对结构；
2. 在 `lib/application/pet_asset_store.dart` 把 `petAssetRemoteBaseUrl` 从 `null` 改为资源根地址（如 `https://cdn.example.com/pets`，结尾不带 `/`）；
3. 冒烟验证：选择器中非默认宠物出现下载角标 → 点击 → 下载完成显示动画帧；断网点击 → 保持矢量并可重试。

## 约束与注意

- 下载 URL 结构为 `{base}/{petId}/{state}.webp`，`state` ∈ idle/working/thinking/waiting/done/sleeping；
- 下载以 `.part` 临时文件写入后原子改名，中断不会留半截坏文件；
- `pet_manifest.json` 的 `bundled` 字段标明随包分发的宠物；重新生成清单：
  `python tools/generate_pet_manifest.py`（如工具缺失，按 manifest 内字段结构手工维护亦可）；
- 鸿蒙端 `getApplicationDocumentsDirectory` 语义一致，无需平台分支。
