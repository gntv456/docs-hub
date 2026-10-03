# 好学探索 · API 设计（MVP）

Base URL: `/api`  
鉴权：Cookie `tanqu_session` 或 `Authorization: Bearer <token>`  
统一响应：

```json
{ "ok": true, "data": {} }
{ "ok": false, "error": "message", "code": "UNAUTHORIZED" }
```

---

## Auth

### GET /api/auth/session
返回当前用户或 `user: null`。

### POST /api/auth/login
```json
{ "login": "username-or-email", "password": "***", "twoStepCode": "optional" }
```
成功：`Set-Cookie` + `{ user, token }`

### POST /api/auth/logout

---

## Library / Sources

### GET /api/sources
列出媒体源。

### POST /api/sources
```json
{ "name": "电影库", "type": "local", "rootPath": "/media/movies" }
```

### POST /api/sources/:id/scan
触发扫描。

### GET /api/library/items?categoryId=&q=&cursor=&limit=
片库列表。

### GET /api/media/:id
单条详情（含元数据、互动态）。

### GET /api/media/:id/stream
视频流（Range）。

### GET /api/media/:id/poster
海报/缩略图。

---

## Categories

### GET /api/categories
### POST /api/categories
```json
{ "name": "短剧", "icon": "drama", "visible": true }
```
### PATCH /api/categories/:id
```json
{ "visible": false, "sort": 2, "name": "短剧-隐藏测试" }
```
### DELETE /api/categories/:id

### POST /api/categories/:id/items
```json
{ "mediaIds": ["..."] }
```

---

## Feed / Social

### GET /api/feed?tab=selected|following|capture&cursor=&limit=
返回：
```json
{
  "items": [
    {
      "id": "m1",
      "title": "示例短剧 第1集",
      "overview": "...",
      "posterUrl": "/api/media/m1/poster",
      "streamUrl": "/api/media/m1/stream",
      "duration": 120,
      "sourceLabel": "NAS",
      "categories": [{"id":"c1","name":"短剧"}],
      "liked": false,
      "likeCount": 3,
      "collected": true,
      "commentCount": 1,
      "progressSec": 12
    }
  ],
  "nextCursor": "..."
}
```

### POST /api/media/:id/like
### POST /api/media/:id/collect
### GET /api/media/:id/comments
### POST /api/media/:id/comments
```json
{ "body": "好看", "parentId": null }
```
### POST /api/media/:id/progress
```json
{ "progressSec": 56, "duration": 120 }
```

---

## Capture 随手拍

### POST /api/capture
`multipart/form-data`: `file`, `categoryId?`, `title?`  
返回新建 media item。

---

## Scrape 刮削

### POST /api/scrape/search
```json
{ "query": "庆余年", "providers": ["douban","tmdb","ptang"], "type": "video|short_drama" }
```

### POST /api/scrape/apply
```json
{ "mediaId": "...", "provider": "tmdb", "externalId": "123", "asSeries": true }
```

### POST /api/scrape/jobs
```json
{ "targetType": "folder", "targetId": "sourceOrCategory", "providers": ["douban","tmdb"] }
```

### GET /api/scrape/jobs/:id

---

## System

### GET /api/health
### GET /api/system/version

## Drama 短剧剧场

### GET /api/drama/home?rank=hot|new|finish&cursor=&limit=
返回 ranks、shelves（继续观看/精选/猜你想看）、items 海报列表。

### GET /api/drama/series/:id
剧集详情 + 分集列表（可直接竖滑连播）。

### GET /api/recommend
AI 智能推荐（可解释）。

### GET /api/themes
### GET /api/themes/:id
多套 iOS27 主题。
