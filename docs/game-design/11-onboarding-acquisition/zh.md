# 11 · 获客与引导（Onboarding & Acquisition）

## 1. 定位

这一层负责把"广告点击 / 陌生访客"转化为"申请人→航行者"。它是产品的**入口漏斗**，
高度结合营销投放（UTM、A/B、邮件名单），并用一套"心理代入"文案把冷流量引入世界观。

## 2. 入口漏斗 `/new`（落地引导）

根路由 `/` 会重定向：带 query 参数（UTM/预览）→ `/new?<params>`；否则 → `/console`。
`/new` 是**营销落地的核心交互漏斗**（`OnboardingClient`），典型节奏：

1. **Q1 心理钩子**："你有多强烈地觉得，此刻存在着另一个版本的你的人生？"（强度滑条/选择）
2. **Q2 愿望**："你最希望找到哪一个平行世界？"
3. **肯定 / 召唤**："Yes, it's you. You are the Voyager we've been looking for."（确认身份）
4. **留资 CTA**：留下邮箱"申请席位、锁定你的 Multiverse Console" → 进入申请。

> 配套一段设备视频（`device-reel.mp4`）。整体是把"申请"包装成"被组织选中"的仪式感。

## 3. UTM 变体（按广告组承接）

落地文案与视频可按 `utm_content`（广告组 id）切换，由 `onboarding_variants` 表驱动（Architect 可编辑）：

- **默认行**（match_key='')持基线文案；变体行只覆盖它设置的字段（null=继承）。
- `resolveVariant()` 按访客 `utm_content`（或 `?variant=` 预览覆盖）匹配变体，叠在默认与兜底文案之上，
  保证永不空白。支持精确匹配（"a3"）或长串里的 token（"metaeyes_a3_v2"）。
- 后台预览：`/admin/onboarding-preview`（可被授予 `can_edit_onboarding` 页面级权限，无需 architect）。
- 已知广告组变体：A3 / S1 / A2 等（见记忆 onboarding-variants）。

## 4. 申请 `/apply`

经典申请表：姓名/别名、邮箱、地点、**申请理由**（5 选 1：ANOMALY / REFERRAL / VERIFICATION /
DIRECT CONTACT / OTHER 自填）。提交后：

1. 写/累加 `applications`（按邮箱去重，记 `submission_count`、UTM、`landing_page_variant`）。
2. **Supabase `inviteUserByEmail`** 发邀请邮件（→ `/auth/callback?next=/register`）；已注册则改走重发访问链接。
3. 同步到 **Loops**（newsletter）与 **Beehiiv**（订阅）。
4. 埋点 `application_submitted`。

## 5. 注册 `/register`

收到邀请邮件 → callback → `/register` 设置 display_name + 密码 → 完成注册（写 `registered_at`）。
此时 profile 已由触发器建好（role=applicant）。

> **口径**：`registered_at` 非空才算"真注册"；`joined_at` 仅表示邀请已发出。

## 6. 邮件与名单

- **Resend**（事务邮件）：评论回复通知、访问链接重发等（`src/lib/email.ts` / `auth-resend.ts`）。
- **Loops**（newsletter）：申请时自动 upsert 联系人（带 userGroup/UTM）；群发支持后台 Campaign 或
  Transactional API；应急可用 Resend 直发 HTML（`scripts/send-campaign.mjs`）。
- **Beehiiv**：申请时订阅（best-effort，失败不阻断）。
- **邀请补发**：曾有约 140 封因发送上限失败的 invite，配有补发队列 + drip + 追溯面板。

## 7. A/B 实验（升级路径）

见 [01 §6]：`experiment_group ∈ {direct, task_gated}` 决定首页广告位指向 `/voyager-pack`（直接买）
还是 `/voyager-path`（任务门控）。PostHog 全程埋点（落地浏览、CTA 点击、礼包浏览/状态）。

## 8. 数据与权限要点

| 项 | 说明 |
|---|---|
| `applications` | email/reason/status/utm_*/landing_page_variant/submission_count |
| `onboarding_variants` | match_key/label/各文案字段/video_url/enabled |
| `voyager_profiles.registered_at` | 真注册标记 |
| `experiment_group` | A/B 分组 |
| 第三方 | Supabase Auth（邀请）、Loops、Beehiiv、Resend、PostHog |

## 9. 当前状态与缺口

- ✅ `/new` 漏斗、UTM 变体、申请、邀请、注册、Loops/Beehiiv 同步、A/B、PostHog 埋点均已上线。
- 🟡 申请审核既可在后台改 status=approved 直接升 voyager，也并行存在"付费/任务"升级，两条口径需对齐。
- ⬜ 漏斗各步的精细化转化看板/归因仍在完善（有 `/admin/analytics` + PostHog）。

## 10. 未来钩子

- 把 `/new` 的 Q1/Q2 答案带入后续个性化（如推荐"你最想找的平行世界"对应的调谐世界）。
- 引荐机制（REFERRAL 理由已埋）→ 老带新奖励。
