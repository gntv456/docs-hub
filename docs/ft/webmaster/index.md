# 站长手册（webmaster）

- [术语小词典](/ft/webmaster/glossary)：看文档遇到不懂的词，先来这翻一眼

> 🚀 **最无脑路径**：不想看一堆文档？一条命令起栈 → `scripts/quick-deploy.sh`（[用法见快速开始置顶](/ft/webmaster/quick-start)）。脚本只做服务器侧，网页向导和域名 HTTPS 还得照下面文档走。

## 部署方式（选一种，从零到上线）

- [SSH 部署方式](/ft/webmaster/build-tutorial)：**命令行基线**——买服务器、装 Docker、起栈、域名 HTTPS、发种邀请，一步不漏
- [1Panel 部署方式](/ft/webmaster/deploy-1panel)：用 1Panel 面板图形化建站（逐步点）
- [宝塔部署方式](/ft/webmaster/deploy-baota)：用宝塔面板建站（逐步点）
- [部署方式总览](/ft/webmaster/panel-deploy)：三种方式怎么选 + 面板通用坑（先读这个再选）
- [离线部署](/ft/webmaster/offline-deploy)：无外网 / Docker Hub 不通时，打包镜像拷到服务器（配 `scripts/offline-bundle.sh`）
- [域名部署](/ft/webmaster/domain-deploy)：DNS 解析 + 防火墙 + 反代 + HTTPS 证书 + 改 announce（原理与排错深解）

## 站跑起来之后

- [日常运维](/ft/webmaster/day-to-day)：每天/每周/每月各做什么、出事先查哪、磁盘满了怎么办（**长期照顾站的入口**）
- [换服务器 / 迁移数据](/ft/webmaster/migrate)：整站搬到新机器的 7 步流程（备份→演练→搬→恢复→切 DNS）
- [升级与回滚](/ft/webmaster/upgrade)：零魔改升级是怎么工作的

## 其它

- [快速开始](/ft/webmaster/quick-start)：从零到开站速通版（大白话）
- [开站 checklist](/ft/webmaster/launch-checklist)：起来之后、放用户进来之前的三项检查与常见选项
- Wiki：站内帮助中心在 `/help`（后台「自定义页面」可编辑）；对外文档站在 [wiki.ptang.top/ft](https://wiki.ptang.top/ft/)（Git 权威，改本册后由 docs-hub 同步发布）。建设过程方案见 `wiki-plan.md`（内部档案，不进对外 wiki）
- [运营 playbook](/ft/webmaster/playbook)：怎么把站办好——开站第一周 / 促销编排 / 考核与 H&R 标定 / 邀请策略 / 反作弊巡检 / 内容冷启动
- [故障排查](/ft/webmaster/troubleshooting)：装机坑典与常见故障

## 深度运维（技术向，可选）

站跑稳之后才需要看的运维细节（备份脚本、安全基线、性能数字、多机扩展）：

- [备份恢复](/ft/ops/backup)：备份脚本三件套 + 后台面板 + 异地存放纪律
- [安全姿态](/ft/ops/security)：认证/限流基线 + **开站自查清单**（收录申报/等保用）
- [性能基线](/ft/ops/performance)：已测吞吐/延迟数字与复测方法
- [监控与告警](/ft/ops/monitoring)：Prometheus + Grafana，五条预置告警
- [升级演练](/ft/ops/upgrade-drill)：大版本升级前的实证演练
- [任务面板](/ft/ops/jobs)：后台任务全目录与手动触发
