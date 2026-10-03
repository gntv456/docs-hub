# Docker 部署

对齐 PTPatronus：**单镜像 + docker compose 拉取安装**。  
已按平台拆分多套 Compose，用户按 NAS 选择即可。

## 镜像

| 项 | 值 |
|----|-----|
| 镜像 | `ghcr.io/gntv456/tanqu:latest` |
| 端口 | `8787` |
| 数据卷 | `./data` → `/data` |

Packages 需 **Public**（或登录 `ghcr.io`）才能匿名拉取。

## 选平台模板

| 平台 | 文件 |
|------|------|
| 通用 | [`deploy/compose/generic.yml`](../deploy/compose/generic.yml) |
| 飞牛 | [`deploy/compose/fnos.yml`](../deploy/compose/fnos.yml) |
| 威联通 | [`deploy/compose/qnap.yml`](../deploy/compose/qnap.yml) |
| 群晖 | [`deploy/compose/synology.yml`](../deploy/compose/synology.yml) |
| 极空间 | [`deploy/compose/zspace.yml`](../deploy/compose/zspace.yml) |
| 绿联 | [`deploy/compose/ugreen.yml`](../deploy/compose/ugreen.yml) |

NAS 图形界面「粘贴 Compose」可用 [`deploy/paste/`](../deploy/paste/) 下对应 txt。  
总览：[`deploy/README.md`](../deploy/README.md)

### 命令行示例（群晖，其它平台只改文件名）

```bash
mkdir -p haoxue-tanqu && cd haoxue-tanqu
curl -fsSL -o docker-compose.yml \
  https://raw.githubusercontent.com/gntv456/tanqu/main/deploy/compose/synology.yml
# 编辑 volumes 为真实 /volume1/... 路径
docker compose up -d
```

浏览器：`http://服务器IP:8787`

### 升级

```bash
docker compose pull
docker compose up -d
```

## 常用环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `TANQU_AUTH_DISABLED` | `1` 演示免登录；生产 `0` | `0` |
| `TANQU_AUTH_SECRET` | 会话密钥 ≥32；空则自动生成 | 空 |
| `TANQU_MEDIA_MOUNTS` | `name=/container/path,...` | 见各模板 |
| `TMDB_API_KEY` | TMDB 刮削 | 空 |
| `HXPT_SITE_URL` | 好学 PT | https://www.hxpt.org |
| `PTANG_SITE_URL` | 寸光集 | https://ptang.top |

完整列表见仓库 `.env.example`。

## 各平台路径速查

| 平台 | 数据/项目建议 | 媒体示例 |
|------|----------------|----------|
| 通用 | `./data` | `/path/to/movies` |
| 飞牛 | 编排目录下 `./data` | `/vol2/1000/movies` |
| 威联通 | Container Station 项目目录 | `/share/Multimedia/movies` |
| 群晖 | `/volume1/docker/haoxue-tanqu` | `/volume1/video/movies` |
| 极空间 | Docker 项目目录 | `/zspace/team/movies` |
| 绿联 | Docker 项目目录 | `/volume1/movies` |

媒体挂载建议加 `:ro`。`TANQU_MEDIA_MOUNTS` 必须与容器内路径一致，例如：

```yaml
environment:
  TANQU_MEDIA_MOUNTS: movies=/media/movies,shorts=/media/shorts
volumes:
  - ./data:/data
  - /volume1/video/movies:/media/movies:ro
  - /volume1/video/shorts:/media/shorts:ro
```

## 开发者本地构建

```bash
git clone https://github.com/gntv456/tanqu.git
cd tanqu
docker compose up -d --build
# http://127.0.0.1:8787
```

## 发布镜像（维护者）

1. GitHub Packages：确认 `tanqu` 可写且用户侧 Public  
2. 打 tag：

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. Actions「Docker」推送 multi-arch 到 `ghcr.io/gntv456/tanqu`  
4. 也可 `workflow_dispatch` 手动构建

## 健康检查

```bash
curl -s http://127.0.0.1:8787/api/health
```

## 备份

备份 compose 旁的 `./data`（含 `tanqu.db` 与 `.session-secret`）。
