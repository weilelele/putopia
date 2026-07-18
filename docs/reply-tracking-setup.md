# 回信自动追踪 — 配置说明

让 campaign 邮件的回信自动落库，"有几个人回了"变成一句 SQL，不用再手数收件箱。

## 原理
1. 发信时给每个收件人设 `Reply-To: replies+<token>@inbound.multiverseco.org`
2. 用户回信 → 进 **inbound 子域**（MX 指向 Resend）→ Resend 解析后 POST 到我们的 webhook
3. webhook 校验签名 → 按 token / 发件人邮箱匹配回 `outreach_log` → 写 `replied_at` + `reply_count`，并在 `outreach_replies` 留全量审计 → 给 `architect@` 发一条提醒

> **为什么用子域 `inbound.multiverseco.org`**：只给子域加 MX，**不动主域 `multiverseco.org` 的 MX**，所以 `architect@` 现有收件箱完全不受影响。Resend 官方也推荐子域。

## 一次性配置（你来做，控制台 + DNS）
1. **Resend → Domains**：添加并验证 `inbound.multiverseco.org`，开启 Inbound，拿到它给的 **MX 记录**。
2. **DNS**：给 `inbound.multiverseco.org` 加那条 MX（不要碰主域 MX）。
3. **Resend → Webhooks/Inbound**：把端点指向
   `https://multiverseco.org/api/webhooks/resend-inbound`
   订阅 `email.received` 事件，复制 **Signing Secret**（`whsec_...`）。
4. **环境变量**（Vercel 生产 + 本地 `.env.local`）：
   ```
   RESEND_INBOUND_SIGNING_SECRET=whsec_xxx
   REPLY_INBOUND_ADDRESS=replies@inbound.multiverseco.org
   # 可选，提醒收件人，默认 architect@multiverseco.org
   OUTREACH_NOTIFY_TO=architect@multiverseco.org
   ```

## 之后每次发信
脚本检测到 `REPLY_INBOUND_ADDRESS` 就自动开启追踪（每人一个 +token）：
```bash
node scripts/send-campaign.mjs --campaign=high_activity_2026_07 --send
# 日志会显示 "Reply tracking ON"
```
不设这个变量 → 退回旧行为（回信进 architect@，不自动追踪）。

## 查回流数据
```sql
-- 有几个人回了（按 campaign）
select campaign, count(*) filter (where replied_at is not null) as replied,
       count(*) as sent,
       round(100.0*count(*) filter (where replied_at is not null)/count(*),1) as reply_rate_pct
from outreach_log group by campaign order by campaign desc;

-- 具体谁回了
select email, campaign, replied_at, reply_count
from outreach_log where replied_at is not null order by replied_at desc;

-- 全量回信审计
select email, campaign, subject, received_at from outreach_replies order by received_at desc;
```

## 注意
- **首批 30 人（high_activity_2026_06）不会自动追踪**：发的时候 Reply-To 还是 `architect@`，回信不经过 webhook。这批先人工数。可靠的自动追踪从下一次 campaign 起。
- 想给首批也补上：在 `architect@` 邮箱加一条转发规则 → inbound 地址。但转发后 `from` 会变，匹配不一定准；建议就从下一批开始用自动追踪。
- webhook 用 message_id 幂等，Resend 重投不会重复计数。
- 人工可见性：每来一封回信，webhook 会给 `OUTREACH_NOTIFY_TO` 发提醒（reply-to 设成原发件人，可直接回复续聊），全文在 Resend inbound 日志里。
- 相关文件：`src/app/api/webhooks/resend-inbound/route.ts`、`src/lib/resend-webhook.ts`、迁移 `supabase/schema_v28.sql`。
