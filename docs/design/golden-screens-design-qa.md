## 2026-09-10 紧凑呈现修正

已按用户截图对照 Voyagers 批次切换：44px 独立箭头不覆盖标签，移动端点击可切换，边界禁用；无页面横向溢出。390px Dashboard 欢迎标题为 BROKER、原角色标签仍显示实际身份。Intel 首条宽幅图片保留，Recent 使用右侧缩略图、16px 标题和作者头像。Devices 的 KYOTO 标签在手机及 1280px 桌面左对齐；导航使用原品牌图形。667px Worlds Live 无横向溢出，独立 loading 不再含归档标题。补齐现有 Kyoto One 数据引用的同名原始素材，未修改产品记录。

本轮截图保存在本地验收目录，不向公开仓库上传账户截图。原生离线代码同步，但 iOS 真机视觉验收仍待完成。

## 2026-09-10 修正验收（覆盖下方历史记录中的同项结论）

- Dashboard：游客只显示原口径三项统计，登录后只显示身份、Path、Signal Dispatch、Days。加载时使用中性占位，避免短暂展示错误身份状态。
- 浏览器只读实测：390px Intel 作者头像及媒体、Dashboard 游客/登录状态；667×375 Dashboard 与 Worlds 无横向溢出；844×390 Devices 媒体与操作双栏；1280px Devices、Intel、Voyagers 以及 1440px Dashboard 的完整品牌侧栏与宽屏布局。
- 发现并修正：窄横屏昵称逐字换行；宽屏媒体占满首屏；Worlds 旧最小高度导致横屏媒体过高。新闻原始拼图保留；单图与多图使用不同响应式尺寸。
- UI Kit 提供 Guest / Signed in / Applicant 互斥样板。新闻与 Updates 使用共享作者、媒体组件。Updates 信息类型与有效期未调整。
- iOS 离线页同步条件展示、作者/图片及横屏导航；原生运行与真机验收仍待完成。静态检查不能替代原生视觉验收。
- 本轮不宣称全部深层业务流程通过；未测试付款、资料保存、发帖等生产写入。后续以用户对视觉与信息口径的确认继续迭代。

> **RETIRED — 历史记录，不再作为产品 UI 规范。** 当前唯一规范为 [UI 2.3](../design-system.md)，交互示例为 `/ui-kit`。历史图片和验收结果不能覆盖现行规范。

# Golden Page Examples — Design QA

## Comparison target

- Source visual targets: the three approved Image Gen concepts for content
  discovery, focused participation, and identity/progress.
- Browser-rendered implementation: `/ui-kit`, **GOLDEN PAGE EXAMPLES**.
- Primary viewport: 390×844 CSS px.
- Progressive-enhancement viewport: 1440×1024 CSS px.

## Findings

- All three coded examples preserve the approved information hierarchy and
  portrait composition while using deterministic project styles.
- Computed font family is `Courier Prime`; the minimum computed text size is
  12px in every example.
- Computed base colors are the canonical deep-space blue `#080C20` and
  off-white `#F5F5F5`; primary and active controls use `#E35205` through the
  canonical tokens.
- Each portrait reference frame is 844px tall. At the 390px viewport the frames
  shrink to the available content width without horizontal overflow; at the
  1440px viewport each frame renders at the full 390px reference width.
- Every link and button in the examples has a rendered target of at least
  44×44px.
- The Signal Check choice and submission states were exercised in the browser:
  selection updates `aria-checked` and submission changes the action to
  `OBSERVATION RECORDED`.
- No browser console errors were observed.
- The diff-aware design gate passes this change set and rejects a synthetic
  newly added gradient declaration.

## Deliberate differences from the generated concepts

- Image-generated typography was replaced with the actual project font.
- Approximate generated colors were replaced with canonical tokens.
- The circular progress markers in the identity concept were changed to flat
  square markers so they do not establish a new gauge motif.
- Decorative crosshairs and ornamental interface marks were omitted.
- Content images remain photographic; surrounding UI uses flat color, hairline
  separation, and no glow, blur, or gradient.

## Result

No blocking or major review findings remain. The automated gate intentionally
checks only newly added UI lines; visual hierarchy, image judgment, and restrained
use of the clipped corner remain part of human screenshot review.

final result: passed
