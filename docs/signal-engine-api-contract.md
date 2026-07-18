# Signal Engine ↔ Putopia — API 契约草案 (v0.1 DRAFT)

> 面向**外部团队(Signal Engine / Cosmo 进阶版)**的接口草案。用于把 Signal Dispatch
> 的出题流程从人工切换为「AI 为主 + 人工兜底」。字段名/枚举用英文(便于实现),说明用中文。
> 本文为草案,标注 **OPEN** 的点需双方确认后定稿。

## 0. 名词与角色

| 角色 | 指代 |
|---|---|
| **Putopia** | 我们的 Web 平台(Next.js)。负责渲染、收票、发布、发邮件、glitch 处理。 |
| **Engine** | 外部系统(Cosmo 进阶版)。负责:判断世界能否被"搜索到"、主动取材/生成素材、依据投票结果生成下一题。 |

一句话职责:**Engine 供"判定 + 素材 + 题目结构 + glitch 核心参数";Putopia 做"随机+glitch 渲染 + 发布 + 收票 + 回传结果"。**

## 1. 通信模型

- 双向,均为**异步**:
  - **Putopia → Engine**:REST 请求发起工作,Engine 立即回 `202 Accepted` + `engine_job_id`。
  - **Engine → Putopia**:通过 **webhook** 推送结果(签名)。Putopia 另提供**轮询兜底**(`GET job`)。
- 传输:HTTPS/TLS only。
- 所有金额/时间戳用 **ISO-8601 UTC**(如 `2026-07-03T10:00:00Z`)。

```
                 POST /v1/worlds/evaluate            ┌──────────┐
   submitWorld ─────────────────────────────────────▶│          │
                 POST /v1/rounds/report               │  Engine  │
   round close ─────────────────────────────────────▶│          │
                                                      └────┬─────┘
   webhook: world.evaluated / puzzle.generated  ◀─────────┘  (signed)
   GET /v1/jobs/{id}  (poll fallback)  ◀───────────────────┘
```

## 2. 鉴权

| 方向 | 机制 |
|---|---|
| **Putopia → Engine** | `Authorization: Bearer <SIGNAL_ENGINE_API_KEY>`;每请求带 `X-Idempotency-Key`(= 我方 `request_id`)。 |
| **Engine → Putopia (webhook)** | HMAC-SHA256 签名。请求头 `X-Signal-Signature: v1,<base64(hmac(secret, timestamp + "." + rawBody))>` + `X-Signal-Timestamp`。共享密钥 `SIGNAL_ENGINE_WEBHOOK_SECRET`。**OPEN**:我们已支持 Svix 方案(`svix-id/svix-timestamp/svix-signature`),若你们用 Svix 可直接复用。 |

- 回放保护:webhook `X-Signal-Timestamp` 与当前时间偏差 > 5 分钟直接拒绝。
- **OPEN**:是否需要 IP allowlist。

## 3. ID 模型(双方对象映射)

每个对象各自持有本方 id,互相在 payload 里携带对方 id,便于关联与去重。

| 对象 | Putopia id | Engine id |
|---|---|---|
| 世界 world | `world_id`(如 `PROP-MQD3MAQ2`) | `engine_world_id` |
| 调查 thread | `thread_id`(uuid) | `engine_thread_id` |
| 一天/一题 task | `task_id`(uuid) + `day_index`(0,1,2…) | `engine_task_id` |
| 素材 asset | `asset_id`(uuid) | `engine_asset_id` |

> 首次 evaluate 时 Putopia 尚无 thread/task,只有 `world_id`。Engine 在结果里回传 `engine_*` id,Putopia 建对象后在后续 `report` 请求里回带,形成稳定映射。

## 4. Putopia → Engine 端点

### 4.1 `POST /v1/worlds/evaluate` — 初始信号:能否搜索到该平行世界

用户提交(或重扫)世界时调用。Engine 判定能否"搜到",能搜到则直接产出第 0 天题目素材。

**Request**
```jsonc
{
  "request_id": "uuid",              // 我方幂等键
  "world_id": "PROP-MQD3MAQ2",
  "name": "The City and the Dessert",
  "description": "<用户填写的平行世界描述,自然语言>",
  "locale": "zh" | "en",             // 用户语言,决定 advice 语言
  "callback_url": "https://multiverseco.org/api/webhooks/signal-engine",
  "deadline_at": "2026-07-03T16:00:00Z"  // = 扫描倒计时截止(scan_until,随机6–8h)
}
```

**Response `202`**
```jsonc
{ "engine_job_id": "job_...", "status": "accepted" }
```

异步结果 → webhook `world.evaluated`(见 §5.1)。

> **时序约束**:Engine 应在 `deadline_at` **之前**给出判定。到点仍无结果,Putopia 按"无信号"处理(见 §6 兜底)。

### 4.2 `POST /v1/rounds/report` — 一轮投票结束:回传结果,请求下一题

某一天投票窗口关闭时调用。Engine 依据结果生成下一天(`day_index + 1`)。

**Request**
```jsonc
{
  "request_id": "uuid",
  "world_id": "PROP-MQD3MAQ2",
  "engine_world_id": "...",
  "thread_id": "uuid",
  "engine_thread_id": "...",
  "task_id": "uuid",                 // 刚关闭的这一天
  "engine_task_id": "...",
  "day_index": 3,
  "closed_at": "2026-07-03T10:00:00Z",
  "participant_count": 87,
  "target_asset": {                  // 本题的隐藏真值(异类/正解),来自上一次生成
    "asset_id": "uuid", "engine_asset_id": "..."
  },
  "results": [                       // 逐资产票数分布
    { "asset_id": "uuid", "engine_asset_id": "...", "votes": 41 },
    { "asset_id": "uuid", "engine_asset_id": "...", "votes": 30 }
  ],
  "callback_url": "https://multiverseco.org/api/webhooks/signal-engine",
  "deadline_at": "2026-07-04T04:00:00Z"  // 下一天需揭示的时间,生成 SLA
}
```

**Response `202`**
```jsonc
{ "engine_job_id": "job_...", "status": "accepted" }
```

异步结果 → webhook `puzzle.generated`(见 §5.2)。

### 4.3 `GET /v1/jobs/{engine_job_id}` — 轮询兜底

webhook 未按时到达时,Putopia 轮询此端点。

**Response `200`**
```jsonc
{
  "engine_job_id": "job_...",
  "status": "pending" | "processing" | "succeeded" | "failed",
  "result": { /* 与对应 webhook 的 body 相同,succeeded 时提供 */ },
  "error": { "code": "...", "message": "..." }   // failed 时
}
```

## 5. Engine → Putopia Webhooks

统一 `POST {callback_url}`,带 §2 签名。Putopia 收到即回 `2xx`(表示已接收,处理异步进行);非 2xx 触发 Engine 重试(指数退避)。所有事件带 `event_id`(Putopia 按此去重)。

### 5.1 `world.evaluated` — 搜索判定结果

```jsonc
{
  "event": "world.evaluated",
  "event_id": "evt_...",             // 幂等键
  "occurred_at": "2026-07-03T12:30:00Z",
  "request_id": "uuid",
  "world_id": "PROP-MQD3MAQ2",
  "engine_world_id": "...",
  "engine_job_id": "job_...",

  "searchable": true,                // 能否搜到该平行世界

  // ── searchable = true 时:直接给第 0 天题目(结构同 §5.2 的 puzzle) ──
  "puzzle": { /* 见 §5.2 puzzle 对象;day_index = 0 */ },

  // ── searchable = false 时:给自然语言建议(展示在页面 + 邮件) ──
  "advice": {
    "locale": "zh",
    "text": "你的描述里缺少可辨识的视觉/声音线索。试着补充……(自然语言,面向用户)"
  }
}
```

### 5.2 `puzzle.generated` — 下一题内容

```jsonc
{
  "event": "puzzle.generated",
  "event_id": "evt_...",
  "occurred_at": "2026-07-03T12:35:00Z",
  "request_id": "uuid",
  "world_id": "PROP-MQD3MAQ2",
  "engine_world_id": "...",
  "engine_thread_id": "...",
  "day_index": 4,
  "engine_job_id": "job_...",

  "puzzle": {
    "engine_task_id": "...",
    "type": "visual_odd_one",        // visual_match | visual_odd_one | audio_odd_one | audio_match
    "prompt": "<题面文字,可空则用默认模板>",
    "assets": [
      {
        "engine_asset_id": "...",
        "media": "image",            // image | video | audio
        "source_url": "https://cosmo.../raw-material.jpg",  // 原始素材,Putopia 拉取后再 crop+glitch
        "role": "option",            // main | option  (visual_match 需要 1 个 main)
        "is_target": false,          // 隐藏真值:异类/正解。永不下发前端
        "glitch": {                  // ★ 核心参数,Putopia 据此渲染(见 §7)
          "area_ratio": 0.16,        // (a) 比例:保留原帧的面积占比 0.02–0.9
          "type": "signal_decay",    // (b) glitch 类型:signal_decay|chromatic|glitch_art|static_noise
          "intensity": 55            // (c) glitch 程度:0–100
        },
        "display_order": 1
      }
      // … 通常 1 个 target + N 个干扰项;option_count 默认 4
    ]
  }
}
```

**说明**
- `source_url` 必须是 Putopia 可直接 GET 的素材(图/视频/音频);视频用于 `audio_*` 时 Putopia 会抽音轨。
- `is_target` 是隐藏真值,Putopia 存后端、**永不下发前端**;用于回传时统计"群众是否命中"。
- `glitch` 三参数由 Engine **按世界特征**给出;`shape`(方/圆/矩)与裁剪位置由 Putopia 随机补全。
- 若某 asset `source_url` 拉取失败或音频无轨,Putopia 跳过该项并在 job 台账记录。

## 6. 「AI 为主 + 人工兜底」语义(务必对齐)

判定与兜底大多在 Putopia 侧,但契约需明确 Engine 的行为:

1. **正常**:`world.evaluated.searchable = true` 且 `puzzle.assets` 非空 → 走 AI 模式,自动出题发布。
2. **搜不到**:`searchable = false` → Putopia 存 `advice` 文案,页面展示 + 邮件引导用户优化描述,并允许 `rescan`(会再次调用 §4.1)。
3. **AI 空但人工已介入**:若 Engine 返回**空内容**(searchable=false,或 searchable=true 但 assets 为空),而在 `deadline_at` 之前**已有人工为该世界创建了任务**,则 Putopia **自动转人工模式**(`scan_source='manual'`),忽略迟到/空的 AI 结果,且不发"无信号"邮件。
4. **超时**:到 `deadline_at` 仍无任何 webhook 且轮询为 `pending/processing` → Putopia 按"无信号"或"人工兜底"处理(取决于是否已有人工任务)。

> Engine 无需感知人工介入;只需**尽早、明确**地给出 searchable 判定,不要静默超时。

## 7. Glitch / 裁剪参数映射(Putopia 渲染)

Engine 回传的 `glitch` 三参数,Putopia 映射到内部 `crop_config` 后用 `process.ts` / `av.ts` 渲染:

| 契约字段 | 内部字段 | 取值 | 含义 |
|---|---|---|---|
| `glitch.area_ratio` | `areaRatio` | 0.02–0.9 | (a) 比例:裁剪保留的帧面积占比,越小越"局部/放大" |
| `glitch.type` | `filter` | `signal_decay` \| `chromatic` \| `glitch_art` \| `static_noise` | (b) glitch 类型 |
| `glitch.intensity` | `glitchIntensity` | 0–100 | (c) glitch 程度 |

Putopia 侧随机补全:`shape`(square/circle/rect)、裁剪位置 position、片段时长。渲染产物:图=cropped WebP;视频=muted MP4 + 动图 WebP;音频=mono MP3,上传至 `signal-assets` bucket。

## 8. 幂等、重试、错误分类

- **幂等**:Putopia→Engine 用 `request_id`;Engine→Putopia 用 `event_id`。重复请求/事件必须安全(不重复计费/不重复出题)。
- **Webhook 重试**:非 2xx → 指数退避重试(建议 ≤ 24h,`event_id` 不变)。
- **错误分类**(关键——决定用户体验):

| 类别 | code 示例 | Putopia 行为 |
|---|---|---|
| 搜不到世界 | `world_not_found` | 展示 advice + 邮件引导优化(非错误,是产品态) |
| 素材/生成临时失败 | `transient`, `rate_limited` | 重试;多次失败 → 转人工兜底 + 告警 |
| 请求非法 | `invalid_request` | 不重试,记录 + 告警 |

## 9. 时延 / SLA(**OPEN**,需双方定)

| 场景 | 约束 |
|---|---|
| evaluate 判定返回 | 在 `deadline_at`(= scan_until,随机 6–8h)之前;建议 p95 < ___ 分钟 |
| 每轮 puzzle 生成 | 在该天 `deadline_at`(揭示时间)之前;建议 p95 < ___ 分钟 |
| webhook 首次投递 | 结果就绪后 < ___ 秒 |

## 10. 待确认清单(OPEN)

1. 鉴权用我方 HMAC 头,还是你们的 Svix?(§2)
2. 素材统一给 `source_url` 让我们拉取,确认可行?(§5.2)
3. `is_target` / `results` 的字段与我们理解一致?你们是否需要更多上下文(历史各天分布、世界描述全文)?(§4.2/§5.2)
4. 轮次节奏由 Putopia 揭示排期驱动(我们在轮次关闭时 `report`),Engine 只按需生成——确认?(§4.2)
5. SLA 具体数值(§9)。
6. 错误 code 全集与语义(§8)。
7. 版本与演进:接口 `/v1` 前缀;不兼容变更走 `/v2`。你们的部署/联调环境地址?

---
**变更记录**
- v0.1 (草案) — 初版,待外部团队评审。
