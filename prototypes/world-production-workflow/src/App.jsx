import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Film,
  FileText,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  MoreHorizontal,
  Play,
  Plus,
  Palette,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Trash2,
  UserCog,
  UserRound,
  WandSparkles,
} from "lucide-react";

const steps = [
  { id: 1, label: "世界设定", short: "设定", status: "approved" },
  { id: 2, label: "风格镜头", short: "风格", status: "approved" },
  { id: 3, label: "镜头延展", short: "镜头", status: "approved" },
  { id: 4, label: "角色设定", short: "角色", status: "optional", optional: true },
  { id: 5, label: "镜头事件", short: "事件", status: "review" },
  { id: 6, label: "图片生成", short: "图片", status: "locked", ai: true },
  { id: 7, label: "视频生成", short: "视频", status: "locked", ai: true },
];

const initialTimeSlots = ["清晨", "早上", "中午", "傍晚", "夜晚", "深夜"];
const initialEventPlan = {
  清晨: [
    { id: "dawn-empty", label: "退潮后的空镜", description: "雾气贴近水面，城市灯带逐层熄灭", kind: "空镜", asset: "/assets/orbit-ocean.png", imageStatus: "approved", videoStatus: "draft" },
  ],
  早上: [
    { id: "morning-arrival", label: "巡潮员抵达", description: "岚从画面右侧进入控制室，检查夜间记录", kind: "角色", asset: "/assets/fork-ice.png", imageStatus: "approved", videoStatus: "draft" },
  ],
  中午: [
    { id: "noon-calibrate", label: "校准潮汐天线", description: "设备启动，水下光束发生短促偏转", kind: "角色", asset: "/assets/helix-desert.png", imageStatus: "review", videoStatus: "locked" },
    { id: "noon-empty", label: "高亮度空镜", description: "不出现角色，只记录穹顶外的鱼群迁徙", kind: "空镜", asset: "/assets/orbit-ocean.png", imageStatus: "draft", videoStatus: "locked" },
  ],
  傍晚: [],
  夜晚: [
    { id: "night-rest", label: "短暂休息", description: "岚坐在设备旁，读取一段被覆盖的私人记忆", kind: "角色", asset: "/assets/fork-ice.png", imageStatus: "locked", videoStatus: "locked" },
  ],
  深夜: [
    { id: "late-signal", label: "异常信号出现", description: "无人值守，天线自行转向城市旧址", kind: "空镜", asset: "/assets/helix-desert.png", imageStatus: "locked", videoStatus: "locked" },
  ],
};

const shotAssets = [
  { src: "/assets/orbit-ocean.png", label: "镜头 A · 潮汐控制室", note: "起始画面 / 已确认" },
  { src: "/assets/helix-desert.png", label: "镜头 B · 赤沙回声区", note: "动态测试 / 已确认" },
  { src: "/assets/fork-ice.png", label: "镜头 C · 冰脊观测站", note: "动态测试 / 已确认" },
];

const roleProfiles = {
  admin: { label: "超级管理员", name: "Will", initial: "W", icon: ShieldCheck },
  creator: { label: "普通创作者", name: "阿沐", initial: "沐", icon: PencilLine },
};

const initialWorldExamples = [
  {
    id: "W-034",
    name: "冰脊回声站",
    currentStep: 1,
    currentStatus: "changes",
    owner: "林星",
    updated: "12 分钟前",
    asset: "/assets/fork-ice.png",
    summary: "世界规律需要补充：极夜周期如何改变居民记忆尚未说明。",
    creatorAction: "修改世界背景、运行规律、核心冲突与参考图",
    adminAction: "查看退回原因；等待创作者重新提交后审核",
  },
  {
    id: "W-028",
    name: "赤沙偏航区",
    currentStep: 2,
    currentStatus: "review",
    owner: "阿沐",
    updated: "今天 15:20",
    asset: "/assets/helix-desert.png",
    summary: "已从三个方向中锁定候选，等待确认最终风格基准镜头。",
    creatorAction: "查看候选与提交记录；审核期间不可改动",
    adminAction: "审核风格镜头，确认或退回视觉方向",
  },
  {
    id: "W-031",
    name: "月背电梯井",
    currentStep: 3,
    currentStatus: "draft",
    owner: "乔伊",
    updated: "今天 13:06",
    asset: "/assets/orbit-ocean.png",
    summary: "风格基准已通过，正在扩展电梯井内外镜头与基础动态。",
    creatorAction: "新增镜头、调整场景延展并确认基础动态",
    adminAction: "查看制作进度；创作者提交后才能正式审核",
  },
  {
    id: "W-026",
    name: "珊瑚失忆城",
    currentStep: 4,
    currentStatus: "optional",
    owner: "苏盐",
    updated: "昨天 18:40",
    asset: "/assets/persona-archives.jpg",
    summary: "镜头中可能出现档案潜水员，也可以跳过角色直接制作空镜。",
    creatorAction: "添加角色形象、环境与动机，或跳过角色步骤",
    adminAction: "确认角色步骤是否跳过；不阻塞后续事件规划",
  },
  {
    id: "W-021",
    name: "潮汐档案馆",
    currentStep: 5,
    currentStatus: "review",
    owner: "阿沐",
    updated: "今天 16:48",
    asset: "/assets/orbit-ocean.png",
    summary: "六个时段和六条事件已建立，等待审核事件结构与内容。",
    creatorAction: "查看已提交的时间与活动；退回后可继续增删修改",
    adminAction: "审核时间、活动、角色条件与后续上下文来源",
  },
  {
    id: "W-039",
    name: "永昼天线阵",
    currentStep: 6,
    currentStatus: "draft",
    owner: "林星",
    updated: "今天 11:32",
    asset: "/assets/helix-desert.png",
    summary: "事件表已通过，正在按事件生成和锁定镜头起始图片。",
    creatorAction: "选择事件、核对上下文、生成并锁定图片",
    adminAction: "查看生成来源与当前候选；提交后审核图片",
  },
  {
    id: "W-042",
    name: "旧海回声",
    currentStep: 7,
    currentStatus: "review",
    owner: "乔伊",
    updated: "今天 09:18",
    asset: "/assets/fork-ice.png",
    summary: "所有图片已锁定，三条事件视频已提交最终审核。",
    creatorAction: "查看已提交视频和生成上下文；审核期间只读",
    adminAction: "核对首帧、运动约束与视频结果，完成最终审核",
  },
];

function statusesForWorld(world) {
  return Object.fromEntries(steps.map((step) => {
    if (step.id < world.currentStep) return [step.id, "approved"];
    if (step.id === world.currentStep) return [step.id, world.currentStatus];
    return [step.id, "locked"];
  }));
}

function firstEventFrom(plan, slots) {
  for (const time of slots) {
    if (plan[time]?.[0]) return { ...plan[time][0], time };
  }
  return null;
}

function StatusBadge({ status }) {
  const config = {
    approved: ["已通过", Check],
    review: ["待审核", Clock3],
    changes: ["需修改", CircleAlert],
    locked: ["未开始", LockKeyhole],
    draft: ["可开始", ChevronRight],
    optional: ["可跳过", SkipForward],
    skipped: ["已跳过", SkipForward],
  }[status];
  const [label, Icon] = config;
  return (
    <span className="status-badge" data-status={status}>
      <Icon size={13} strokeWidth={2} />
      {label}
    </span>
  );
}

function RoleSwitcher({ role, onChange }) {
  const [open, setOpen] = useState(false);
  const current = roleProfiles[role];
  return (
    <div className="role-switcher">
      <button className="user-chip" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)} type="button">
        <span>{current.initial}</span><strong>{current.name} · {current.label}</strong><ChevronDown size={14} />
      </button>
      {open && <div className="role-menu" role="menu" aria-label="切换体验身份">
        <span>体验身份</span>
        {Object.entries(roleProfiles).map(([id, profile]) => {
          const Icon = profile.icon;
          return <button data-active={role === id} key={id} onClick={() => { onChange(id); setOpen(false); }} role="menuitem" type="button"><Icon size={17} /><span><strong>{profile.label}</strong><small>{id === "admin" ? "审核、通过或退回每个步骤" : "创作、修改并提交当前步骤"}</small></span>{role === id && <Check size={15} />}</button>;
        })}
      </div>}
    </div>
  );
}

function AppTopbar({ role, onRoleChange }) {
  return (
    <header className="topbar">
      <div className="brand-lockup"><img src="/assets/vi-wordmark.png" alt="Multiverse Collective" /><span>WORLD WORKFLOW</span></div>
      <div className="topbar-meta"><span className="prototype-tag">交互原型</span><RoleSwitcher role={role} onChange={onRoleChange} /></div>
    </header>
  );
}

function WorldProgress({ currentStep }) {
  return <div className="world-progress" aria-label={`当前位于第 ${currentStep} 步`}>{steps.map((step) => <span data-state={step.id < currentStep ? "complete" : step.id === currentStep ? "current" : "future"} key={step.id} title={`Step ${step.id} · ${step.label}`} />)}</div>;
}

function WorldOverview({ worlds, role, onOpenWorld }) {
  const isAdmin = role === "admin";
  const reviewCount = worlds.filter((world) => world.currentStatus === "review").length;
  const editableCount = worlds.filter((world) => ["draft", "changes", "optional"].includes(world.currentStatus)).length;
  return (
    <main className="overview-workspace">
      <header className="overview-header">
        <div><span className="eyebrow">WORLD PRODUCTION</span><h1>世界制作流程</h1><p>用不同阶段的实例确认每一步能够完成什么，以及当前身份可以修改哪些内容。</p></div>
        {!isAdmin && <button className="primary-button" type="button"><Plus size={16} />新建世界</button>}
      </header>

      <section className="overview-role-panel">
        <div className="overview-role-icon">{isAdmin ? <ShieldCheck size={22} /> : <PencilLine size={22} />}</div>
        <div><span className="eyebrow">CURRENT ROLE</span><h2>{roleProfiles[role].label}视角</h2><p>{isAdmin ? "你可以进入待审核实例，检查当前步骤的输入、输出和生成上下文，并决定通过或退回。创作内容保持只读。" : "你可以继续编辑草稿或被退回的步骤，并提交给超级管理员；已提交和已通过的步骤保持只读。"}</p></div>
        <div className="overview-stats"><div><strong>{worlds.length}</strong><span>示例世界</span></div><div><strong>{isAdmin ? reviewCount : editableCount}</strong><span>{isAdmin ? "等待审核" : "可以编辑"}</span></div></div>
      </section>

      <div className="overview-section-title"><div><span className="eyebrow">WORKFLOW EXAMPLES</span><h2>不同阶段的世界</h2></div><span>点击任一实例查看该步骤的实际操作</span></div>
      <section className="world-grid">
        {worlds.map((world) => {
          const currentStep = steps.find((step) => step.id === world.currentStep);
          const action = isAdmin ? world.adminAction : world.creatorAction;
          const canAct = isAdmin ? world.currentStatus === "review" : ["draft", "changes", "optional"].includes(world.currentStatus);
          return <article className="world-card" key={world.id}>
            <div className="world-card-media"><img src={world.asset} alt={`${world.name}世界预览`} /><span>{world.id}</span><StatusBadge status={world.currentStatus} /></div>
            <div className="world-card-body">
              <div className="world-card-title"><div><span>STEP {world.currentStep} / 7</span><h3>{world.name}</h3></div><strong>{currentStep.label}</strong></div>
              <WorldProgress currentStep={world.currentStep} />
              <p>{world.summary}</p>
              <div className="world-permission"><span>{isAdmin ? "此身份可执行" : "此阶段可修改"}</span><strong>{action}</strong></div>
              <div className="world-card-footer"><span>创作者：{world.owner} · {world.updated}</span><button className={canAct ? "primary-button" : "secondary-button"} onClick={() => onOpenWorld(world)} type="button">{isAdmin ? (canAct ? "进入审核" : "查看阶段") : (canAct ? "继续创作" : "查看进度")}<ArrowRight size={15} /></button></div>
            </div>
          </article>;
        })}
      </section>
    </main>
  );
}

function WorkflowRail({ activeStep, stepStatuses, onSelect }) {
  return (
    <nav className="workflow-rail" aria-label="世界创建步骤">
      {steps.map((step, index) => {
        const status = stepStatuses[step.id] ?? step.status;
        const Icon = status === "approved" ? Check : status === "locked" ? LockKeyhole : status === "optional" || status === "skipped" ? SkipForward : Clock3;
        return (
          <button
            className="workflow-step"
            data-active={activeStep === step.id}
            data-status={status}
            key={step.id}
            onClick={() => onSelect(step.id)}
            type="button"
          >
            <span className="step-node">
              <Icon size={14} strokeWidth={2.25} />
            </span>
            <span className="step-copy">
              <span className="step-kicker">STEP {step.id}</span>
              <span className="step-label">{step.label}</span>
            </span>
            {step.ai && <span className="ai-mini">AI</span>}
            {step.optional && <span className="optional-mini">OPTIONAL</span>}
            {index < steps.length - 1 && <span className="step-line" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
}

function StepOne({ canEdit }) {
  return (
    <div className="step-stack">
      <section className="panel">
        <div className="field-stack">
          <div className="section-heading">
            <div>
              <span className="eyebrow">WORLD BIBLE</span>
              <h2>只定义世界，不锁定视觉</h2>
            </div>
            <StatusBadge status="approved" />
          </div>
          <label className="field-label" htmlFor="world-bible">核心设定</label>
          <textarea disabled={!canEdit} id="world-bible" defaultValue="一颗被潮汐锁定的海洋行星。城市依靠收集月潮中的记忆残片维持运转；每次涨潮都会改写部分公共历史，只有巡潮员能够辨认被替换的现实。" />
          <div className="three-fields">
            <div><span>世界规律</span><strong>记忆随潮汐重写</strong></div>
            <div><span>核心冲突</span><strong>真实与存续不可兼得</strong></div>
            <div><span>叙事视角</span><strong>观察式 / 低对白</strong></div>
          </div>
        </div>
        <div className="reference-section">
          <div className="reference-title"><div><span className="eyebrow">OPTIONAL REFERENCES</span><h3>参考素材</h3></div><span>仅帮助理解设定，不作为最终风格依据</span></div>
          <div className="reference-strip">
            {shotAssets.slice(0, 2).map((shot) => <figure className="reference-card" key={shot.src}><img src={shot.src} alt="世界设定参考素材" /><figcaption><ImageIcon size={13} />设定参考</figcaption></figure>)}
            <button className="add-reference" disabled={!canEdit} type="button"><Plus size={19} /><span>添加参考图</span></button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StepTwo({ canEdit }) {
  const [chosenStyle, setChosenStyle] = useState(0);
  return (
    <div className="step-stack">
      <section className="panel">
        <div className="section-heading">
          <div><span className="eyebrow">STYLE ANCHOR</span><h2>锁定一个风格基准镜头</h2></div>
          <StatusBadge status="approved" />
        </div>
        <p className="section-intro">基于世界设定生成候选画面；最终只确认一张，作为后续所有镜头的材质、色温、镜头语言与细节密度标准。</p>
        <div className="style-candidates">
          {shotAssets.map((shot, index) => <button className="style-card" data-selected={chosenStyle === index} disabled={!canEdit} key={shot.src} onClick={() => setChosenStyle(index)} type="button"><img src={shot.src} alt={`风格候选 ${index + 1}`} /><span className="style-index">方向 0{index + 1}</span><span className="style-choice">{chosenStyle === index ? <><Check size={14} />已选为风格基准</> : "选择此方向"}</span></button>)}
        </div>
        <div className="style-lockbar"><div><span>当前风格基准</span><strong>{["冷蓝水下城市 · 暖橙设备光", "赤沙行星 · 低照度工业设备", "极地冰脊 · 紫色极光环境"][chosenStyle]}</strong></div><button className="primary-button" disabled={!canEdit} type="button"><ShieldCheck size={15} />确认并锁定风格</button></div>
      </section>
    </div>
  );
}

function StepThree({ canEdit }) {
  return (
    <div className="step-stack">
      <section className="panel">
        <div className="section-heading">
          <div><span className="eyebrow">SHOT EXTENSION</span><h2>镜头与基础动态</h2></div>
          <StatusBadge status="approved" />
        </div>
        <p className="section-intro">以 Step 2 锁定的风格基准镜头延展场景，并为每个镜头确认 4–6 秒的基础动态。</p>
        <div className="shot-grid">
          {shotAssets.map((shot, index) => <article className="shot-card" key={shot.label}><div className="shot-image"><img src={shot.src} alt={shot.label} /><button type="button" aria-label={`播放${shot.label}动态`}><Play size={17} fill="currentColor" /></button><span>00:0{index + 4}</span></div><div className="shot-copy"><strong>{shot.label}</strong><span>{shot.note}</span></div></article>)}
          <button className="add-shot" disabled={!canEdit} type="button"><Plus size={20} /><span>添加镜头</span></button>
        </div>
      </section>
    </div>
  );
}

function StepFour({ canEdit, characterStatus, onSkip, onRestore }) {
  const skipped = characterStatus === "skipped";
  return (
    <div className="step-stack">
      <section className="panel character-panel">
        <div className="section-heading">
          <div><span className="eyebrow">OPTIONAL CHARACTER RECORD</span><h2>角色设定</h2></div>
          <StatusBadge status={characterStatus} />
        </div>
        <div className="optional-notice"><SkipForward size={17} /><div><strong>这个世界可以没有角色</strong><span>跳过后仍可直接规划空镜与环境事件，也不会阻塞后续图片和视频生成。</span></div><button className="secondary-button" disabled={!canEdit} onClick={skipped ? onRestore : onSkip} type="button">{skipped ? "恢复角色设定" : "跳过此步骤"}</button></div>
        {!skipped ? <div className="character-layout">
            <img className="character-portrait" src="/assets/persona-archives.jpg" alt="巡潮员岚的人物形象" />
            <div className="character-body">
              <div className="character-title"><div><span>主要角色 01</span><h3>巡潮员 · 岚</h3></div><button className="icon-button" disabled={!canEdit} type="button" aria-label="更多角色操作"><MoreHorizontal size={18} /></button></div>
              <p>档案馆最后一位仍能记住旧世界的人。她每次进入潮汐站，都会失去一段属于自己的记忆。</p>
              <div className="character-facts">
                <div><span>环境</span><strong>潮汐控制室 / 城市外缘</strong></div>
                <div><span>行为动机</span><strong>保存城市被抹除前的最后一份真实记录</strong></div>
                <div><span>动作边界</span><strong>克制、观察、只在设备失控时快速移动</strong></div>
              </div>
            </div>
          </div> : <div className="skipped-state"><SkipForward size={24} /><strong>已跳过角色设定</strong><span>Step 5 将只显示空镜与环境事件；你也可以随时回来恢复角色。</span></div>}
      </section>
    </div>
  );
}

function SparseEventBoard({ eventPlan, timeSlots, selectedId, onSelectEvent, onAddEvent, onAddTime, onDeleteEvent, onDeleteTime, editable = false }) {
  return (
    <div className="event-board-wrap">
      <div className="event-board-scroll" tabIndex="0" aria-label="按时段组织的镜头事件列表，可横向滚动">
        <div className="event-board" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, minmax(184px, 1fr))` }}>
        {timeSlots.map((time) => <section className="time-lane" key={time}>
          <header><div><Clock3 size={14} /><strong>{time}</strong></div><span>{eventPlan[time].length} 个活动</span>{editable && <button className="lane-delete" onClick={() => onDeleteTime(time)} type="button" aria-label={`删除时段 ${time}`} title="删除时段"><Trash2 size={13} /></button>}</header>
          <div className="lane-events">
            {eventPlan[time].map((event) => <article className="event-card" data-selected={selectedId === event.id} key={event.id}><button className="event-card-main" onClick={() => onSelectEvent({ ...event, time })} type="button"><span className="event-kind">{event.kind}</span><strong>{event.label}</strong><span>{event.description}</span><small><ImageIcon size={12} />图片 <i /> <Film size={12} />视频</small></button>{editable && <button className="event-delete" onClick={() => onDeleteEvent(time, event.id)} type="button" aria-label={`删除活动 ${event.label}`} title="删除活动"><Trash2 size={13} /></button>}</article>)}
            {eventPlan[time].length === 0 && <div className="empty-lane"><span>此时段暂无活动</span><small>不需要为了填满表格而创建内容</small></div>}
          </div>
          {editable && <button className="add-event-button" onClick={() => onAddEvent(time)} type="button"><Plus size={15} />添加活动</button>}
        </section>)}
        </div>
      </div>
      {editable && <button className="add-time-button" onClick={onAddTime} type="button"><Plus size={15} />添加时段</button>}
    </div>
  );
}

function StepFive({ canEdit, eventPlan, timeSlots, selected, onSelectEvent, onAddEvent, onAddTime, onDeleteEvent, onDeleteTime }) {
  return (
    <div className="step-stack">
      <section className="panel matrix-panel">
        <div className="section-heading">
          <div><span className="eyebrow">EVENTS BY TIME</span><h2>按时段规划镜头事件</h2></div>
          <StatusBadge status="review" />
        </div>
        <div className="matrix-instruction"><CircleAlert size={15} /><span>每个时段独立维护活动：有内容才添加，没有内容可以保持为空。图片和视频阶段会直接沿用这里确认的事件。</span></div>
        <SparseEventBoard editable={canEdit} eventPlan={eventPlan} timeSlots={timeSlots} selectedId={selected?.id} onSelectEvent={onSelectEvent} onAddEvent={onAddEvent} onAddTime={onAddTime} onDeleteEvent={onDeleteEvent} onDeleteTime={onDeleteTime} />
      </section>
      {selected ? <section className="panel cell-detail">
        <div className="cell-detail-copy">
          <span className="eyebrow">SELECTED EVENT</span>
          <h3>{selected.time} · {selected.label}</h3>
          <p>{selected.description}。先根据该时段推断空镜，再加入此活动；后续图片候选和视频镜头都绑定到这条事件记录。</p>
          <div className="prompt-chain"><span>01 时段空镜</span><ChevronRight size={14} /><span>02 当前活动</span><ChevronRight size={14} /><span>03 图片候选</span><ChevronRight size={14} /><span>04 视频镜头</span></div>
        </div>
        <div className="cell-preview">
          <img src={selected.asset} alt={`${selected.time}${selected.label}画面预览`} />
          <span>绑定风格基准 · V03</span>
        </div>
        <div className="cell-actions"><button className="secondary-button" disabled={!canEdit} type="button"><MoreHorizontal size={15} />编辑事件</button><button className="primary-button" disabled={!canEdit} type="button"><Check size={15} />确认此事件</button></div>
      </section> : <section className="panel no-selection"><ImageIcon size={22} /><strong>还没有可选择的事件</strong><span>请先添加一个时段和活动。</span></section>}
    </div>
  );
}

function ProductionMaterials({ canEdit, selected, mode }) {
  const isImage = mode === "image";
  if (!selected) return <section className="panel no-selection"><ImageIcon size={22} /><strong>没有生成任务</strong><span>回到 Step 5 添加至少一条事件后，这里才会出现素材。</span></section>;
  const materials = isImage
    ? shotAssets.map((shot, index) => ({ ...shot, label: `候选图 0${index + 1}`, meta: index === 1 ? "当前选中" : "等待选择" }))
    : shotAssets.map((shot, index) => ({ ...shot, label: `动态版本 0${index + 1}`, meta: `${index + 4} 秒 · 24 FPS` }));
  return (
    <section className="panel material-panel">
      <div className="material-header"><div><span className="eyebrow">{isImage ? "IMAGE MATERIALS" : "VIDEO MATERIALS"}</span><h3>{selected.time} · {selected.label}</h3><p>{selected.description}</p></div><StatusBadge status={isImage ? selected.imageStatus : selected.videoStatus} /></div>
      <div className="material-grid">
        {materials.map((material, index) => <article className="material-card" data-selected={index === 1} key={material.label}><div className="material-image"><img src={material.src} alt={`${selected.label} ${material.label}`} />{!isImage && <button type="button" aria-label={`播放${material.label}`}><Play size={18} fill="currentColor" /></button>}{index === 1 && <span><Check size={12} />当前候选</span>}</div><div><strong>{material.label}</strong><small>{material.meta}</small></div></article>)}
      </div>
      <div className="material-actions"><button className="secondary-button" disabled={!canEdit} type="button"><RefreshCw size={15} />重新生成</button><button className="primary-button" disabled={!canEdit} type="button"><Check size={15} />{isImage ? "锁定此图片" : "确认此视频"}</button></div>
    </section>
  );
}

const timeAtmospheres = {
  清晨: "低照度冷蓝环境，退潮雾气贴近水面，城市灯带正在熄灭",
  早上: "漫射晨光进入穹顶，设备从夜间模式恢复，空间开始有人活动",
  中午: "高亮度水下环境，穹顶外鱼群清晰，设备表面出现硬质反光",
  傍晚: "环境亮度快速下降，远处城市灯带逐层点亮",
  夜晚: "设备暖橙光成为主光源，空间安静且具有私人感",
  深夜: "无人值守、深蓝低照度，仅保留异常设备信号与城市余光",
};

function GenerationContext({ selected, mode }) {
  const [showPrompt, setShowPrompt] = useState(false);
  if (!selected) return null;

  const isImage = mode === "image";
  const hasCharacter = selected.kind === "角色";
  const atmosphere = timeAtmospheres[selected.time] ?? `${selected.time}的环境光线、空间状态与天气连续性`;
  const contexts = [
    {
      id: "world",
      step: "STEP 1",
      title: "世界设定",
      target: "System Prompt",
      detail: "潮汐锁定的海洋行星；城市以月潮中的记忆残片维持运转，涨潮会改写公共历史。",
      icon: BookOpenText,
      included: true,
    },
    {
      id: "style",
      step: "STEP 2",
      title: "风格基准",
      target: "System Prompt + 参考图",
      detail: "冷蓝水下城市、暖橙设备光；观察式镜头、低对白、写实工业材质与克制构图。",
      icon: Palette,
      included: true,
    },
    {
      id: "shot",
      step: "STEP 3",
      title: "镜头与场景",
      target: "参考图 + 镜头约束",
      detail: "沿用已确认的潮汐控制室镜头空间、机位关系和基础动态，不重新设计场景结构。",
      icon: ImageIcon,
      included: true,
    },
    {
      id: "character",
      step: "STEP 4",
      title: "角色设定",
      target: hasCharacter ? "System Prompt" : "本次不引入",
      detail: hasCharacter
        ? "巡潮员岚；活动环境为潮汐控制室 / 城市外缘，动机是保存城市被抹除前的最后一份真实记录。"
        : "当前事件为空镜，不包含角色，因此不会把人物形象、动机或行为约束写入本次生成上下文。",
      icon: UserRound,
      included: hasCharacter,
    },
    {
      id: "time",
      step: "STEP 5 · 时间",
      title: selected.time,
      target: "System Prompt",
      detail: atmosphere,
      icon: Clock3,
      included: true,
    },
    {
      id: "event",
      step: "STEP 5 · 活动",
      title: selected.label,
      target: "任务 Prompt",
      detail: selected.description,
      icon: FileText,
      included: true,
    },
    {
      id: "production",
      step: isImage ? "STEP 6" : "STEP 7",
      title: isImage ? "图片生成约束" : "视频生成约束",
      target: isImage ? "生成参数" : "参考图 + 运动 Prompt",
      detail: isImage
        ? "16:9 横向构图，保持风格基准与镜头连续性；输出可供后续视频生成使用的起始画面。"
        : "使用已锁定图片作为首帧；4–6 秒、24 FPS，仅延展事件动作和环境动态，不改变人物与空间设定。",
      icon: isImage ? ImageIcon : Film,
      included: true,
    },
  ];
  const includedContexts = contexts.filter((context) => context.included);
  const systemContexts = contexts.filter((context) => context.included && context.target.includes("System Prompt"));

  return (
    <section className="panel generation-context">
      <div className="context-heading">
        <div>
          <span className="eyebrow">GENERATION CONTEXT · ACCUMULATED</span>
          <h3>这个单元格会引入哪些生成背景</h3>
          <p>上下文从前序步骤逐层累积，并根据当前事件决定是否加入角色信息。</p>
        </div>
        <div className="context-summary"><Layers3 size={16} /><strong>{includedContexts.length}</strong><span>项已引入</span></div>
      </div>

      <div className="context-stack" aria-label={`${selected.time} ${selected.label} 的生成背景信息`}>
        {contexts.map(({ id, step, title, target, detail, icon: Icon, included }) => (
          <article className="context-item" data-included={included} key={id}>
            <div className="context-source"><Icon size={16} /><span>{step}</span></div>
            <div className="context-copy"><strong>{title}</strong><p>{detail}</p></div>
            <div className="context-target"><span>{target}</span><small>{included ? <><Check size={12} />已引入</> : "条件不匹配"}</small></div>
          </article>
        ))}
      </div>

      <div className="prompt-preview">
        <button className="prompt-preview-toggle" aria-expanded={showPrompt} onClick={() => setShowPrompt((open) => !open)} type="button">
          <span><FileText size={15} /><strong>查看合成后的 Prompt 结构</strong><small>{systemContexts.length} 段系统上下文 · 1 段任务描述 · {isImage ? "1 组图片参数" : "1 张首帧参考 + 1 组运动参数"}</small></span>
          <ChevronDown size={16} data-open={showPrompt} />
        </button>
        {showPrompt && <div className="prompt-preview-body">
          <div><span>SYSTEM CONTEXT</span><p>{systemContexts.map((context) => context.detail).join("\n\n")}</p></div>
          <div><span>TASK PROMPT</span><p>在「{selected.time}」的既定环境中呈现「{selected.label}」：{selected.description}。</p></div>
          <div><span>{isImage ? "IMAGE CONSTRAINTS" : "VIDEO CONSTRAINTS"}</span><p>{contexts.at(-1).detail}</p></div>
        </div>}
      </div>
    </section>
  );
}

function StepSix({ canEdit, eventPlan, timeSlots, selected, onSelectEvent }) {
  return (
    <div className="step-stack"><section className="panel"><div className="section-heading"><div><span className="eyebrow">IMAGE PRODUCTION · FROM EVENTS</span><h2>在事件表中选择图片任务</h2></div><span className="ai-badge"><WandSparkles size={14} />适合 AI 接管</span></div><p className="section-intro">沿用 Step 5 的完整时段与活动结构。选择一条事件后，先核对它累积的生成背景，再查看、生成和锁定图片候选。</p><SparseEventBoard eventPlan={eventPlan} timeSlots={timeSlots} selectedId={selected?.id} onSelectEvent={onSelectEvent} /></section><GenerationContext selected={selected} mode="image" /><ProductionMaterials canEdit={canEdit} selected={selected} mode="image" /></div>
  );
}

function StepSeven({ canEdit, eventPlan, timeSlots, selected, onSelectEvent }) {
  return (
    <div className="step-stack"><section className="panel"><div className="section-heading"><div><span className="eyebrow">VIDEO PRODUCTION · FROM EVENTS</span><h2>在事件表中选择视频任务</h2></div><span className="ai-badge"><Film size={14} />适合 AI 接管</span></div><p className="section-intro">同样保留完整事件表。选择一条事件后，先核对它累积的生成背景，再查看绑定该事件及其已锁定图片的视频版本。</p><SparseEventBoard eventPlan={eventPlan} timeSlots={timeSlots} selectedId={selected?.id} onSelectEvent={onSelectEvent} /></section><GenerationContext selected={selected} mode="video" /><ProductionMaterials canEdit={canEdit} selected={selected} mode="video" /></div>
  );
}

function RolePermissionBanner({ canEdit, currentStatus, role }) {
  const isAdmin = role === "admin";
  const canReview = isAdmin && currentStatus === "review";
  return <div className="role-permission-banner" data-role={role}>{isAdmin ? <UserCog size={18} /> : <PencilLine size={18} />}<div><span>{roleProfiles[role].label}权限</span><strong>{isAdmin ? (canReview ? "当前步骤可审核，创作内容只读" : "可以查看全部步骤，等待创作者提交后审核") : (canEdit ? "当前步骤可编辑，并可提交给超级管理员" : "当前步骤只读；已提交、已通过或未解锁")}</strong></div></div>;
}

function ReviewPanel({ activeStep, canEdit, currentStatus, onApprove, onRequestChanges, onSubmit, note, role, setNote }) {
  const step = steps.find((item) => item.id === activeStep);
  const isAdmin = role === "admin";
  const reviewable = isAdmin && currentStatus === "review";
  if (!isAdmin) {
    const creatorTasks = {
      1: "撰写世界背景与规律，维护非绑定参考图",
      2: "比较候选画面并锁定一个风格基准",
      3: "增加镜头并确认每个镜头的基础动态",
      4: "补充角色形象、环境与动机，或跳过步骤",
      5: "增加或删除时段与活动，编辑事件内容",
      6: "核对生成上下文，生成、选择并锁定图片",
      7: "核对首帧和运动约束，生成并确认视频",
    };
    return <aside className="review-panel creator-panel">
      <div className="review-top"><div className="review-title"><PencilLine size={19} /><div><span>CREATOR WORKSPACE</span><strong>普通创作者</strong></div></div><StatusBadge status={currentStatus} /></div>
      <div className="review-stage"><span>当前创作步骤</span><strong>Step {activeStep} · {step.label}</strong><small>{canEdit ? "拥有编辑权限" : "当前为只读状态"}</small></div>
      <div className="creator-task"><span className="review-label">本步骤能做什么</span><p>{creatorTasks[activeStep]}</p></div>
      <div className="creator-boundary"><LockKeyhole size={16} /><span>{canEdit ? "你可以修改本步骤，但不能审核自己的提交。" : currentStatus === "review" ? "内容已提交，超级管理员处理前不可继续修改。" : "已通过或未解锁的步骤不能修改。"}</span></div>
      <button className="primary-button creator-submit" disabled={!canEdit} onClick={onSubmit} type="button"><ShieldCheck size={15} />{currentStatus === "review" ? "等待审核" : "提交超级管理员审核"}</button>
      <div className="review-history"><span className="review-label">最近协作记录</span><div><i /><p><strong>创作者保存了当前草稿</strong><span>所有变更已自动保存。</span><small>阿沐 · 16:48</small></p></div><div><i /><p><strong>超级管理员通过上一步</strong><span>当前步骤已解锁。</span><small>Will · 昨天</small></p></div></div>
    </aside>;
  }
  return (
    <aside className="review-panel">
      <div className="review-top">
        <div className="review-title"><ShieldCheck size={19} /><div><span>SUPER ADMIN REVIEW</span><strong>步骤审核</strong></div></div>
        <StatusBadge status={currentStatus} />
      </div>
      <div className="review-stage"><span>当前审核对象</span><strong>Step {activeStep} · {step.label}</strong><small>提交人：阿沐 · 08 月 12 日 16:42</small></div>
      <div className="checklist">
        <span className="review-label">审核检查</span>
        {[
          "与上一步已确认内容保持一致",
          activeStep === 5 ? "每个活动都属于明确的时段，不要求填满所有时段" : "必填信息与素材齐全",
          activeStep >= 6 ? "生成背景来源与条件引入清晰可追溯" : "关键创作决策有明确记录",
        ].map((item) => <label key={item}><input defaultChecked type="checkbox" /><span><Check size={12} />{item}</span></label>)}
      </div>
      <label className="review-label" htmlFor="review-note">审核意见</label>
      <textarea disabled={!reviewable} id="review-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="写下通过依据，或明确需要修改的内容…" />
      <div className="review-actions">
        <button className="secondary-button danger" disabled={!reviewable} onClick={onRequestChanges} type="button"><MessageSquareText size={15} />退回修改</button>
        <button className="primary-button" disabled={!reviewable} onClick={onApprove} type="button"><ShieldCheck size={15} />审核通过</button>
      </div>
      <div className="review-history"><span className="review-label">审核记录</span><div><i /><p><strong>Step 3 已通过</strong><span>镜头延展与风格基准保持一致。</span><small>超级管理员 · 14:18</small></p></div><div><i /><p><strong>Step 2 已通过</strong><span>风格基准镜头已锁定。</span><small>超级管理员 · 昨天</small></p></div></div>
    </aside>
  );
}

function StepContent({ activeStep, canEdit, characterStatus, eventPlan, timeSlots, selected, onAddEvent, onAddTime, onDeleteEvent, onDeleteTime, onRestoreCharacter, onSelectEvent, onSkipCharacter }) {
  if (activeStep === 1) return <StepOne canEdit={canEdit} />;
  if (activeStep === 2) return <StepTwo canEdit={canEdit} />;
  if (activeStep === 3) return <StepThree canEdit={canEdit} />;
  if (activeStep === 4) return <StepFour canEdit={canEdit} characterStatus={characterStatus} onSkip={onSkipCharacter} onRestore={onRestoreCharacter} />;
  if (activeStep === 5) return <StepFive canEdit={canEdit} eventPlan={eventPlan} timeSlots={timeSlots} selected={selected} onSelectEvent={onSelectEvent} onAddEvent={onAddEvent} onAddTime={onAddTime} onDeleteEvent={onDeleteEvent} onDeleteTime={onDeleteTime} />;
  if (activeStep === 6) return <StepSix canEdit={canEdit} eventPlan={eventPlan} timeSlots={timeSlots} selected={selected} onSelectEvent={onSelectEvent} />;
  return <StepSeven canEdit={canEdit} eventPlan={eventPlan} timeSlots={timeSlots} selected={selected} onSelectEvent={onSelectEvent} />;
}

export function App() {
  const [screen, setScreen] = useState("overview");
  const [role, setRole] = useState("admin");
  const [worlds, setWorlds] = useState(initialWorldExamples);
  const [selectedWorldId, setSelectedWorldId] = useState("W-021");
  const [activeStep, setActiveStep] = useState(5);
  const [stepStatuses, setStepStatuses] = useState(statusesForWorld(initialWorldExamples.find((world) => world.id === "W-021")));
  const [timeSlots, setTimeSlots] = useState(initialTimeSlots);
  const [eventPlan, setEventPlan] = useState(initialEventPlan);
  const [selected, setSelected] = useState({ ...initialEventPlan.中午[0], time: "中午" });
  const [note, setNote] = useState("事件与时段独立建立；图片和视频生成前需核对上下文来源、条件引入和素材绑定。\n");
  const [toast, setToast] = useState("");
  const currentStep = useMemo(() => steps.find((step) => step.id === activeStep), [activeStep]);
  const currentWorld = useMemo(() => worlds.find((world) => world.id === selectedWorldId), [selectedWorldId, worlds]);
  const currentStatus = stepStatuses[activeStep];
  const canEdit = role === "creator" && ["draft", "changes", "optional", "skipped"].includes(currentStatus);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function approveStep() {
    if (role !== "admin" || currentStatus !== "review") return;
    setStepStatuses((statuses) => ({ ...statuses, [activeStep]: "approved", ...(activeStep < 7 ? { [activeStep + 1]: "draft" } : {}) }));
    if (activeStep === currentWorld.currentStep) setWorlds((items) => items.map((world) => world.id === currentWorld.id ? { ...world, currentStep: activeStep < 7 ? activeStep + 1 : activeStep, currentStatus: activeStep < 7 ? "draft" : "approved", updated: "刚刚" } : world));
    showToast(`Step ${activeStep} 已通过，下一步已解锁`);
  }

  function requestChanges() {
    if (role !== "admin" || currentStatus !== "review") return;
    setStepStatuses((statuses) => ({ ...statuses, [activeStep]: "changes" }));
    if (activeStep === currentWorld.currentStep) setWorlds((items) => items.map((world) => world.id === currentWorld.id ? { ...world, currentStatus: "changes", updated: "刚刚" } : world));
    showToast(`已将 Step ${activeStep} 退回创作者修改`);
  }

  function submitForReview() {
    if (!canEdit) return;
    setStepStatuses((statuses) => ({ ...statuses, [activeStep]: "review" }));
    if (activeStep === currentWorld.currentStep) setWorlds((items) => items.map((world) => world.id === currentWorld.id ? { ...world, currentStatus: "review", updated: "刚刚" } : world));
    showToast(`Step ${activeStep} 已提交超级管理员审核`);
  }

  function openWorld(world) {
    setSelectedWorldId(world.id);
    setActiveStep(world.currentStep);
    setStepStatuses(statusesForWorld(world));
    setSelected(firstEventFrom(initialEventPlan, initialTimeSlots));
    setScreen("workflow");
  }

  function addEvent(time) {
    const newEvent = { id: `${time}-${Date.now()}`, label: "新活动", description: "补充这个时段可能发生的内容", kind: "待定义", asset: shotAssets[Math.max(0, timeSlots.indexOf(time)) % shotAssets.length].src, imageStatus: "locked", videoStatus: "locked" };
    setEventPlan((plan) => ({ ...plan, [time]: [...plan[time], newEvent] }));
    setSelected({ ...newEvent, time });
    showToast(`已在${time}添加一条新活动`);
  }

  function addTime() {
    let suffix = 1;
    while (timeSlots.includes(`新时段 ${suffix}`)) suffix += 1;
    const newTime = `新时段 ${suffix}`;
    setTimeSlots((slots) => [...slots, newTime]);
    setEventPlan((plan) => ({ ...plan, [newTime]: [] }));
    showToast(`已添加${newTime}`);
  }

  function deleteEvent(time, eventId) {
    const nextPlan = { ...eventPlan, [time]: eventPlan[time].filter((event) => event.id !== eventId) };
    setEventPlan(nextPlan);
    if (selected?.id === eventId) {
      const nextSelected = firstEventFrom(nextPlan, timeSlots);
      setSelected(nextSelected);
    }
    showToast(`已从${time}删除活动`);
  }

  function deleteTime(time) {
    if (timeSlots.length === 1) {
      showToast("至少需要保留一个时段");
      return;
    }
    const nextSlots = timeSlots.filter((item) => item !== time);
    const nextPlan = { ...eventPlan };
    const removedIds = new Set((nextPlan[time] ?? []).map((event) => event.id));
    delete nextPlan[time];
    setTimeSlots(nextSlots);
    setEventPlan(nextPlan);
    if (selected && removedIds.has(selected.id)) {
      const nextSelected = firstEventFrom(nextPlan, nextSlots);
      setSelected(nextSelected);
    }
    showToast(`已删除时段 ${time}`);
  }

  function skipCharacter() {
    setStepStatuses((statuses) => ({ ...statuses, 4: "skipped" }));
    if (currentWorld.currentStep === 4) setWorlds((items) => items.map((world) => world.id === currentWorld.id ? { ...world, currentStatus: "skipped", updated: "刚刚" } : world));
    showToast("已跳过角色设定，不影响后续事件规划");
  }

  function restoreCharacter() {
    setStepStatuses((statuses) => ({ ...statuses, 4: "optional" }));
    if (currentWorld.currentStep === 4) setWorlds((items) => items.map((world) => world.id === currentWorld.id ? { ...world, currentStatus: "optional", updated: "刚刚" } : world));
    showToast("角色设定已恢复为可选步骤");
  }

  return (
    <div className="prototype-shell">
      <AppTopbar role={role} onRoleChange={setRole} />

      {screen === "overview" ? <WorldOverview worlds={worlds} role={role} onOpenWorld={openWorld} /> : <>

      <main className="workspace">
        <div className="world-header">
          <div className="world-title-row"><button className="back-button" onClick={() => setScreen("overview")} type="button" aria-label="返回世界列表"><ArrowLeft size={18} /></button><div><span className="eyebrow">WORLD / {currentWorld.id}</span><h1>{currentWorld.name}</h1></div></div>
          <div className="world-meta"><StatusBadge status={currentStatus} /><span className="save-state"><Check size={13} />已自动保存 · {currentWorld.updated}</span><button className="icon-button" type="button" aria-label="更多世界操作"><MoreHorizontal size={18} /></button></div>
        </div>

        <WorkflowRail activeStep={activeStep} stepStatuses={stepStatuses} onSelect={setActiveStep} />

        <RolePermissionBanner canEdit={canEdit} currentStatus={currentStatus} role={role} />

        <div className="active-step-header">
          <div><span className="step-index">0{activeStep}</span><div><span className="eyebrow">CURRENT STAGE</span><h2>{currentStep.label}</h2><p>{activeStep === 5 ? "按时段分别添加真实存在的活动，不需要把每个时段填满。" : activeStep === 4 ? "可选流程：没有角色的世界可以直接跳过。" : activeStep >= 6 ? "选择事件，核对逐步累积的生成背景，再生成与审核素材。" : "查看本步骤的创作输入、输出与审核状态。"}</p></div></div>
          {currentStep.ai && <span className="ai-badge"><Sparkles size={14} />AI 优先执行</span>}
        </div>

        <div className="content-layout">
          <section className="step-content"><StepContent activeStep={activeStep} canEdit={canEdit} characterStatus={stepStatuses[4]} eventPlan={eventPlan} timeSlots={timeSlots} selected={selected} onAddEvent={addEvent} onAddTime={addTime} onDeleteEvent={deleteEvent} onDeleteTime={deleteTime} onRestoreCharacter={restoreCharacter} onSelectEvent={setSelected} onSkipCharacter={skipCharacter} /></section>
          <ReviewPanel activeStep={activeStep} canEdit={canEdit} currentStatus={currentStatus} note={note} role={role} setNote={setNote} onApprove={approveStep} onRequestChanges={requestChanges} onSubmit={submitForReview} />
        </div>
      </main>
      </>}

      {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    </div>
  );
}
