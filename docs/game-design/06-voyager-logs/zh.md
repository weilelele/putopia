# 06 · 航行者日志（Voyager Logs / Stories）

## 1. 定位

航行者日志是**玩家原创内容（UGC）**的舞台——航行者投稿的第一人称叙事故事，记录他们用
Multiverse Console 探索平行世界的经历。它承担了产品最强的**情感与代入感**功能（参考 `content/stories.ts`
两篇范例的基调：收到设备、被平行世界的人回看、红灯亮起）。页面 **`/logs`（VOYAGER LOGS，列表）**
与 **`/logs/[id]`（详情）**。

## 2. 玩法 / 工作流

```
航行者撰写投稿（draft, is_published=false） ──► Architect 审核 ──► 发布（is_published=true）──► 公开展示
submitStory                                    /admin/stories      publishStory
```

- **投稿**（仅 Voyager+）：标题、标签、摘要、正文、（可选 YouTube 视频）。新投稿默认**未发布草稿**。
- **作者可编辑自己的未发布草稿**；发布后由 Architect 控制。
- **审核发布**：Architect 在后台 publish/unpublish/编辑/删除，也可代笔（author_name 可为 "The Organization"，
  Signal Dispatch 发布时即用此身份自动发系统故事）。

## 3. 可见性

- 已发布故事：**仅 Voyager+ 可读**（RLS `stories_select_published`）——日志是"内圈"内容。
- 作者可读自己的任何状态故事；Architect 可读全部。

## 4. 数据与权限

| 项 | 说明 |
|---|---|
| `stories` 表 | id(slug)、title、author_id/name、date、tags[]、excerpt、content、is_published、youtube_id |
| 读 | `getPublishedStories`（含作者头像）；`getMyStories`；`getAllStories`(architect) |
| 写 | 投稿 `submitStory`（强制 draft）；作者改草稿 `updateMyStory`；Architect 全权 |
| 埋点 | 投稿发 PostHog `story_submitted` |

## 5. 当前状态与缺口

- ✅ 投稿、草稿编辑、审核发布、标签、YouTube 嵌入、作者头像、Voyager 限定可见均已上线。
- 🟡 系统也用 stories 表承载 Signal Dispatch 的"系统播报故事"（author='The Organization'），
  与玩家 UGC 共用一个流。
- ⬜ 缺少对优质日志的激励（点赞/精选/积分）。

## 6. 未来钩子

- 把日志与具体世界关联（"这篇日志发生在世界 X"），反哺世界档案的叙事厚度。
- 精选/编辑推荐机制；优质投稿给积分或荣誉标签。
