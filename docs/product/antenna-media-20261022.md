# Antenna 桌面静物图｜媒体记录

日期：2026-10-22。工具：内置 ImageGen；未使用 API／CLI。用户授权：将后三张嵌入式天线方案中的 Antenna 单独取下，在桌上摆放，制作现行配图。沿用此前确认的扁伞帽、嵌入式柄与底座关系。三种表面处理为设计方向，尚未确认最终量产外观和包裹数量。

## 结构参考预检

`prepare_references.py --repo /Users/will/Sites/putopia` 通过 SHA-256 校验；三张结构原图此前均已实际查看，每次生成均附图。此次不呈现 Console，原图只用于设备上下文，禁止带入最终画面。

| 原图 | SHA-256 |
| --- | --- |
| docs/device-reference/originals/01-latest-front-left.jpg | c27c42f381ee84641ca2579feba1f410a1aba47a27c389624ac2349dc0a1bbab |
| docs/device-reference/originals/02-front-right-render.jpg | 20a0fdd91188bd2d72b7c438623bc339b3ebac5c993ea4d619fccfca28e0f33b |
| docs/device-reference/originals/03-rear-render.jpg | 7f164e5154bd2b4182341d1eac796e7d30ccd89ce4127d05918038356093f082 |

## 造型输入

此前生成、用户据此要求桌面配图的 v2 文件，均已查看。源文件保留在项目 `output/console-imagery/2026-10-22-antenna-token/`，未当作原始工程依据。

| 输入 | SHA-256 |
| --- | --- |
| 01-brass-token-v2.png | 6501d889dc4d258e1ead2c8a29a66f33047a01e15d4719e077cf00672d0400e8 |
| 02-ivory-silver-v2.png | e1f440b0a967eb4fd3f6915ec5626a63d195fa9a29a3332ff5c752de2fdaa553 |
| 03-navy-orange-v2.png | 8d9fd4bdeb2b59229a0b2b1e746680f674d6fae98eb75583b622ede5424e4cae |

## 生成与导出

工具每次最多五张参考图：第一步附三张 Console 原图与黄铜、米白方案，移除 Console，生成双款桌面静物；第二步附三张原图、第一步桌面图与深蓝橙边方案，加入第三款，形成三角摆放。没有静默省略任何所选方案。

完整实际调用提示词与附图顺序保存在同目录的 `antenna-still-life-prompts.json`，源输出保留在工具生成目录和上述 output 目录。首次六图调用被参数限制拒绝，未产生图像。

- 生成 PNG：1536 × 1024，SHA-256 `8cabdf5e8657dde0452b9a47779c501bd52344f720469122a3458f8526585090`。
- 网页文件：`public/assets/voyager-initiation/antenna-still-life-v1.jpg`；sips 进行 JPEG 88 质量格式转换，未改变构图和尺寸。
- 网页 JPEG SHA-256：`f66983b31bfe087d150d6339d386de819ed05c850b351968e7b719ff2139d237`。

## 视觉检查与适用范围

已检查整图与原尺寸帽部、边缘和桌面接触关系：三种表面处理、同心环纹与低伞帽轮廓可辨；无 Console、文字、发光、屏幕、线缆或新增操作部件。黄铜款斜靠、米白和深蓝款平置，接触阴影与光源方向一致。表面纹理与自然木纹可读，未见明显融合或重复贴图。柄及接口大部分被遮挡，不能由本图判断工程结构。无需审核机身三屏，因为最终画面不含主机。

状态：用于当前页面的设计示意；不作为实物照片、量产结构或装箱清单证明。用户随后要求 Pack 2 简介只保留指定两段，因此该处不追加图注；设计示意与数量待确认的说明继续保留于 FAQ 和交付说明。图片不承诺一次交付三支或提供颜色选择。
