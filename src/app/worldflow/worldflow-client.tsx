"use client";

import { useRef, useState, useTransition, type RefObject } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Cloud,
  Image as ImageIcon,
  Layers3,
  LockKeyhole,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SkipForward,
  Trash2,
  Undo2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  createWorldflowWorld,
  reviewWorldflowStep,
  saveWorldflowState,
  submitWorldflowStep,
  type WorldflowAsset,
  type WorldflowCloudAsset,
  type WorldflowCosmoChannel,
  type WorldflowEvent,
  type WorldflowState,
  type WorldflowStepStatus,
  type WorldflowWorld,
} from "@/lib/actions/worldflow";
import { buildWorldflowVideoSequence } from "@/lib/worldflow-production";
import {
  isWorldflowMaterialTargetPersisted,
  type WorldflowMaterialTarget,
} from "@/lib/worldflow-material-target";
import styles from "./worldflow.module.css";

const STEPS = [
  ["世界设定", "建立世界背景、规律与冲突", "foundation"],
  ["风格镜头", "用本地参考图确认视觉基准", "foundation"],
  ["镜头延展", "建立镜头清单和基础素材", "foundation"],
  ["角色设定", "可选：维护角色、环境与动机", "ongoing"],
  ["镜头事件", "逐镜头维护独立的时间与事件", "ongoing"],
  ["图片素材", "持续为事件添加图片版本", "ongoing"],
  ["视频素材", "持续为事件添加视频版本", "ongoing"],
] as const;

const STATUS: Record<WorldflowStepStatus, string> = {
  draft: "草稿",
  review: "待审核",
  changes: "需修改",
  approved: "已通过",
  optional: "可跳过",
  skipped: "已跳过",
};

function statusOf(state: WorldflowState, step: number): WorldflowStepStatus {
  return state.stepStatuses[String(step)] ?? "draft";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function scrollHorizontal(
  ref: RefObject<HTMLDivElement | null>,
  direction: -1 | 1,
) {
  const element = ref.current;
  if (!element) return;
  element.scrollBy({
    behavior: "smooth",
    left: direction * Math.max(220, Math.round(element.clientWidth * 0.78)),
  });
}

async function deleteWorldflowAsset(assetId: string) {
  const response = await fetch(`/api/worldflow/assets/${assetId}`, {
    method: "DELETE",
  });
  const result = (await response.json()) as { error?: string };
  return response.ok ? null : (result.error ?? "移除素材失败。");
}

function normalizeState(state: WorldflowState): WorldflowState {
  return {
    ...state,
    characters: state.characters.map((character) => ({
      ...character,
      description: character.description ?? "",
    })),
    eventSystems: Object.fromEntries(
      Object.entries(state.eventSystems).map(([shotId, system]) => [
        shotId,
        {
          ...system,
          timeSlots: system.timeSlots.map((slot) => ({
            ...slot,
            events: slot.events.map((event) => ({
              ...event,
              subEvents: event.subEvents ?? [],
            })),
          })),
        },
      ]),
    ),
  };
}

function findEventSelection(
  timeSlots: WorldflowState["eventSystems"][string]["timeSlots"],
  selectedId: string | null,
) {
  if (!selectedId) return null;
  for (const slot of timeSlots) {
    for (const parent of slot.events) {
      if (parent.id === selectedId)
        return { parent, slot, subject: parent, isSubEvent: false as const };
      const subEvent = parent.subEvents.find((item) => item.id === selectedId);
      if (subEvent)
        return { parent, slot, subject: subEvent, isSubEvent: true as const };
    }
  }
  return null;
}

function MaterialUploader({
  assets,
  beforeUpload,
  canUpload,
  characterId,
  eventId,
  mediaKind = "mixed",
  onDeleted,
  onUploaded,
  shotId,
  step,
  targetLabel,
  title,
  worldId,
}: {
  assets: WorldflowAsset[];
  beforeUpload: (
    target: WorldflowMaterialTarget,
  ) => Promise<string | null>;
  canUpload: boolean;
  characterId?: string | null;
  eventId?: string | null;
  mediaKind?: "image" | "mixed" | "video";
  onDeleted: (assetId: string) => void;
  onUploaded: (asset: WorldflowAsset) => void;
  shotId?: string | null;
  step: number;
  targetLabel: string;
  title: string;
  worldId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);
  const bandListRef = useRef<HTMLDivElement>(null);
  const cloudAssetListRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudAssets, setCloudAssets] = useState<WorldflowCloudAsset[]>([]);
  const [cosmoChannels, setCosmoChannels] = useState<WorldflowCosmoChannel[]>(
    [],
  );
  const [channelQuery, setChannelQuery] = useState("");
  const [selectedCosmoChannelId, setSelectedCosmoChannelId] = useState("");
  const [selectedCosmoBandId, setSelectedCosmoBandId] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const accept =
    mediaKind === "video"
      ? "video/mp4,video/webm,video/quicktime"
      : mediaKind === "image"
        ? "image/jpeg,image/png,image/webp"
        : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const saveError = await beforeUpload({ characterId, eventId, shotId });
      if (saveError) {
        setError(`自动保存失败：${saveError}`);
        return;
      }

      const form = new FormData();
      form.set("file", file);
      form.set("worldId", worldId);
      form.set("step", String(step));
      if (shotId) form.set("shotId", shotId);
      if (eventId) form.set("eventId", eventId);
      if (characterId) form.set("characterId", characterId);
      const response = await fetch("/api/worldflow/assets", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "上传失败。");
        return;
      }
      onUploaded(result as WorldflowAsset);
    } catch {
      setError("自动保存或上传失败，请重试。");
    } finally {
      setUploading(false);
    }
  }

  const selectedCosmoChannel = cosmoChannels.find(
    (channel) => channel.id === selectedCosmoChannelId,
  );

  async function loadCosmoChannels(query = channelQuery) {
    setCloudLoading(true);
    setError("");
    setCloudAssets([]);
    setSelectedCosmoChannelId("");
    setSelectedCosmoBandId("");
    try {
      const response = await fetch(
        `/api/worldflow/cosmo-assets?media=${mediaKind}&q=${encodeURIComponent(query.trim())}`,
      );
      const result = (await response.json()) as {
        channels?: WorldflowCosmoChannel[];
        error?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "Cosmo 频道读取失败。");
        return;
      }
      setCosmoChannels(result.channels ?? []);
    } catch {
      setError("Cosmo 频道读取失败，请重试。");
    } finally {
      setCloudLoading(false);
    }
  }

  async function loadCosmoAssets(channelId: string, bandId: string) {
    setSelectedCosmoBandId(bandId);
    setCloudLoading(true);
    setError("");
    setCloudAssets([]);
    try {
      const response = await fetch(
        `/api/worldflow/cosmo-assets?media=${mediaKind}&channelId=${encodeURIComponent(channelId)}&bandId=${encodeURIComponent(bandId)}`,
      );
      const result = (await response.json()) as {
        assets?: WorldflowCloudAsset[];
        error?: string;
      };
      if (!response.ok) {
        setError(result.error ?? "Cosmo 素材读取失败。");
        return;
      }
      setCloudAssets(result.assets ?? []);
    } catch {
      setError("Cosmo 素材读取失败，请重试。");
    } finally {
      setCloudLoading(false);
    }
  }

  async function openCloudLibrary() {
    const nextOpen = !cloudOpen;
    setCloudOpen(nextOpen);
    if (!nextOpen || cosmoChannels.length) return;
    await loadCosmoChannels("");
  }

  async function linkCloudAsset(cloudAsset: WorldflowCloudAsset) {
    const alreadyLinked = assets.some(
      (asset) =>
        asset.source_type === "cloud" &&
        asset.source_provider === cloudAsset.provider &&
        asset.source_asset_id === cloudAsset.id,
    );
    if (alreadyLinked) {
      setError("这个素材已经关联到当前位置。");
      return;
    }
    setLinkingId(cloudAsset.id);
    setError("");
    try {
      const saveError = await beforeUpload({ characterId, eventId, shotId });
      if (saveError) {
        setError(`自动保存失败：${saveError}`);
        return;
      }
      const response = await fetch("/api/worldflow/assets/link", {
        body: JSON.stringify({
          characterId,
          channelId: cloudAsset.channel_id,
          bandId: cloudAsset.band_id,
          eventId,
          provider: cloudAsset.provider,
          shotId,
          sourceAssetId: cloudAsset.id,
          sourceMedia: cloudAsset.media_type,
          step,
          worldId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "云端素材关联失败。");
        return;
      }
      onUploaded(result as WorldflowAsset);
    } catch {
      setError("自动保存或云端关联失败，请重试。");
    } finally {
      setLinkingId(null);
    }
  }

  async function removeAsset(asset: WorldflowAsset) {
    setDeletingId(asset.id);
    setError("");
    try {
      const deleteError = await deleteWorldflowAsset(asset.id);
      if (deleteError) {
        setError(deleteError);
        return;
      }
      onDeleted(asset.id);
    } catch {
      setError("移除素材失败，请重试。");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className={styles.materialSection}>
      <header>
        <div>
          <span>MATERIALS · FORGE / COSMO / LOCAL</span>
          <h3>{title}</h3>
          <p className={styles.materialTarget}>
            <span>关联位置</span>
            <strong>{targetLabel}</strong>
          </p>
        </div>
        {canUpload ? (
          <div className={styles.materialActions}>
            <button
              aria-label={`为${title}添加本地素材`}
              className={styles.addMaterial}
              disabled={uploading || Boolean(linkingId)}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <Plus size={20} />
              {uploading ? "保存并上传中…" : "本地上传"}
            </button>
            <button
              aria-expanded={cloudOpen}
              className={styles.secondary}
              disabled={uploading || Boolean(linkingId)}
              onClick={() => void openCloudLibrary()}
              type="button"
            >
              <Cloud size={18} />
              Forge / Cosmo
              {cloudOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        ) : (
          <span className={styles.readOnly}>只读</span>
        )}
      </header>
      <input
        ref={inputRef}
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
        type="file"
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      {cloudOpen ? (
        <div className={styles.cloudLibrary}>
          <header>
            <div>
              <strong>Forge / Cosmo 素材库</strong>
              <span>按频道名称、频率或频道编号搜索；关联不会复制原文件。</span>
            </div>
            <span>
              {selectedCosmoBandId
                ? `${cloudAssets.length} 份可用素材`
                : `${cosmoChannels.length} 个频道`}
            </span>
          </header>
          <form
            className={styles.cosmoSearch}
            onSubmit={(event) => {
              event.preventDefault();
              void loadCosmoChannels();
            }}
          >
            <label>
              <span>搜索 Cosmo 频道</span>
              <input
                onChange={(event) => setChannelQuery(event.target.value)}
                placeholder="频道名称、频率或频道 ID"
                value={channelQuery}
              />
            </label>
            <button
              className={styles.secondary}
              disabled={cloudLoading}
              type="submit"
            >
              <Search size={17} />
              搜索
            </button>
          </form>
          {cloudLoading ? (
            <p className={styles.cloudStatus}>正在读取 Forge / Cosmo…</p>
          ) : null}
          {!cloudLoading && !cosmoChannels.length ? (
            <p className={styles.cloudStatus}>
              没有找到符合条件的 Cosmo 频道。
            </p>
          ) : null}
          {cosmoChannels.length ? (
            <>
              <div className={styles.scrollRegionHeader}>
                <span>频道结果</span>
                <div className={styles.scrollControls}>
                  <button
                    aria-label="向左浏览频道"
                    onClick={() => scrollHorizontal(channelListRef, -1)}
                    type="button"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    aria-label="向右浏览频道"
                    onClick={() => scrollHorizontal(channelListRef, 1)}
                    type="button"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div
                aria-label="Cosmo 频道搜索结果"
                className={styles.cosmoChannelList}
                ref={channelListRef}
              >
                {cosmoChannels.map((channel) => (
                  <button
                    data-active={selectedCosmoChannelId === channel.id}
                    key={channel.id}
                    onClick={() => {
                      setSelectedCosmoChannelId(channel.id);
                      setSelectedCosmoBandId("");
                      setCloudAssets([]);
                    }}
                    type="button"
                  >
                    <span>
                      {channel.number !== null
                        ? `频道 ${channel.number}`
                        : "未分配频率"}
                    </span>
                    <strong>{channel.name || "未命名频道"}</strong>
                    <small>{channel.id}</small>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {selectedCosmoChannel ? (
            <section className={styles.cosmoBands}>
              <header>
                <div>
                  <strong>{selectedCosmoChannel.name}</strong>
                  <span>选择一个波段以加载其中的图片和视频。</span>
                </div>
                <div className={styles.scrollMeta}>
                  <small>{selectedCosmoChannel.id}</small>
                  <div className={styles.scrollControls}>
                    <button
                      aria-label="向左浏览波段"
                      onClick={() => scrollHorizontal(bandListRef, -1)}
                      type="button"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button
                      aria-label="向右浏览波段"
                      onClick={() => scrollHorizontal(bandListRef, 1)}
                      type="button"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </header>
              <div ref={bandListRef}>
                {selectedCosmoChannel.bands.map((band) => {
                  const availableCount =
                    mediaKind === "image"
                      ? band.image_count
                      : mediaKind === "video"
                        ? band.video_count
                        : band.image_count + band.video_count;
                  return (
                    <button
                      data-active={selectedCosmoBandId === band.id}
                      disabled={!availableCount || cloudLoading}
                      key={band.id}
                      onClick={() =>
                        void loadCosmoAssets(selectedCosmoChannel.id, band.id)
                      }
                      type="button"
                    >
                      <strong>{band.name || "未命名波段"}</strong>
                      <span>
                        {band.image_count} 图片 · {band.video_count} 视频
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
          {!cloudLoading && selectedCosmoBandId && !cloudAssets.length ? (
            <p className={styles.cloudStatus}>这个波段暂无适用素材。</p>
          ) : null}
          {cloudAssets.length ? (
            <div className={styles.scrollRegionHeader}>
              <span>波段素材 · 将关联到 {targetLabel}</span>
              <div className={styles.scrollControls}>
                <button
                  aria-label="向左浏览素材"
                  onClick={() => scrollHorizontal(cloudAssetListRef, -1)}
                  type="button"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  aria-label="向右浏览素材"
                  onClick={() => scrollHorizontal(cloudAssetListRef, 1)}
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
          <div className={styles.cloudAssetGrid} ref={cloudAssetListRef}>
            {cloudAssets.map((asset) => {
              const alreadyLinked = assets.some(
                (linkedAsset) =>
                  linkedAsset.source_type === "cloud" &&
                  linkedAsset.source_provider === asset.provider &&
                  linkedAsset.source_asset_id === asset.id,
              );
              return (
                <button
                  className={styles.cloudAssetCard}
                  disabled={Boolean(linkingId) || alreadyLinked}
                  key={`${asset.provider}:${asset.band_id}:${asset.id}`}
                  onClick={() => void linkCloudAsset(asset)}
                  type="button"
                >
                  {asset.media_type === "video" &&
                  /\.(mp4|webm|mov)(\?|$)/i.test(asset.preview_url) ? (
                    <video muted preload="metadata" src={asset.preview_url} />
                  ) : (
                    <Image
                      alt={asset.name}
                      height={180}
                      src={asset.preview_url}
                      unoptimized
                      width={320}
                    />
                  )}
                  <span>{asset.media_type === "image" ? "图片" : "视频"}</span>
                  <strong>{asset.name}</strong>
                  <small>
                    {asset.channel_number !== null &&
                    asset.channel_number !== undefined
                      ? `${asset.channel_number} · `
                      : ""}
                    {asset.channel_name} / {asset.band_name}
                  </small>
                  <small>
                    {alreadyLinked
                      ? "已关联到当前位置"
                      : linkingId === asset.id
                        ? "关联中…"
                        : `关联到：${targetLabel}`}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className={styles.assetGrid}>
        {assets.map((asset) => (
          <article className={styles.assetCard} key={asset.id}>
            {asset.media_type === "image" ? (
              <Image
                alt={asset.file_name}
                height={540}
                src={asset.public_url}
                unoptimized
                width={960}
              />
            ) : (
              <video controls preload="metadata" src={asset.public_url} />
            )}
            <div>
              <strong>{asset.file_name}</strong>
              <span>
                V{asset.version} ·{" "}
                {asset.media_type === "image" ? "图片" : "视频"} ·{" "}
                {asset.source_type === "cloud" ? "云端关联" : "本地上传"} ·{" "}
                {formatDate(asset.created_at)}
              </span>
              {canUpload ? (
                <button
                  aria-label={`${asset.source_type === "cloud" ? "移除关联" : "删除素材"} ${asset.file_name}`}
                  className={styles.removeAsset}
                  disabled={deletingId === asset.id}
                  onClick={() => void removeAsset(asset)}
                  type="button"
                >
                  <Trash2 size={15} />
                  {deletingId === asset.id
                    ? "移除中…"
                    : asset.source_type === "cloud"
                      ? "移除关联"
                      : "删除素材"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!assets.length && canUpload ? (
          <button
            className={styles.emptyAsset}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Plus size={24} />
            <strong>添加第一份素材</strong>
            <span>优先从 Forge / Cosmo 关联，也可以从本地上传。</span>
          </button>
        ) : null}
        {!assets.length && !canUpload ? (
          <div className={styles.emptyAsset}>
            <LockKeyhole size={22} />
            <strong>尚未添加素材</strong>
            <span>只有这个世界的创建者可以上传或关联。</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContextAssetRefs({
  assets,
  label,
}: {
  assets: WorldflowAsset[];
  label: string;
}) {
  const images = assets.filter((asset) => asset.media_type === "image");
  if (!images.length) return null;
  return (
    <div className={styles.contextAssetRefs} aria-label={label}>
      {images.slice(0, 4).map((asset) => (
        <Image
          alt={asset.file_name}
          height={90}
          key={asset.id}
          src={asset.public_url}
          unoptimized
          width={160}
        />
      ))}
      {images.length > 4 ? <span>+{images.length - 4}</span> : null}
    </div>
  );
}

type EventSlots = WorldflowState["eventSystems"][string]["timeSlots"];
type UndoSnapshot = {
  activeShotId: string;
  label: string;
  selectedEventId: string | null;
  state: WorldflowState;
};

function EventStructureEditor({
  editable,
  selectedEventId,
  slots,
  onChange,
  onSelect,
}: {
  editable: boolean;
  selectedEventId: string | null;
  slots: EventSlots;
  onChange: (
    mutator: (slots: EventSlots) => EventSlots,
    undoLabel?: string,
  ) => void;
  onSelect: (eventId: string | null) => void;
}) {
  return (
    <section className={styles.structureEditor}>
      <header>
        <div>
          <strong>镜头事件结构</strong>
          <span>时段依次横向排列；这里的调整会立即继承到图片和视频表格。</span>
        </div>
        {editable ? (
          <button
            className={styles.secondary}
            onClick={() =>
              onChange((current) => [
                ...current,
                { id: crypto.randomUUID(), name: "新时段", events: [] },
              ], "新增时段")
            }
            type="button"
          >
            <Plus size={16} />
            添加时段
          </button>
        ) : null}
      </header>
      <div aria-label="时段列表，可左右滑动浏览" className={styles.eventBoard}>
        {slots.map((slot) => (
          <article className={styles.timeLane} key={slot.id}>
            <header>
              <Clock3 size={16} />
              <input
                disabled={!editable}
                onChange={(change) =>
                  onChange((current) =>
                    current.map((item) =>
                      item.id === slot.id
                        ? { ...item, name: change.target.value }
                        : item,
                    ),
                  )
                }
                value={slot.name}
              />
              {editable ? (
                <button
                  aria-label={`删除时段 ${slot.name}`}
                  onClick={() => {
                    const removedIds = slot.events.flatMap((event) => [
                      event.id,
                      ...event.subEvents.map((subEvent) => subEvent.id),
                    ]);
                    onChange(
                      (current) =>
                        current.filter((item) => item.id !== slot.id),
                      `删除时段“${slot.name}”`,
                    );
                    if (selectedEventId && removedIds.includes(selectedEventId))
                      onSelect(null);
                  }}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </header>
            {slot.events.map((event) => (
              <div className={styles.eventGroup} key={event.id}>
                <div className={styles.eventRow}>
                  <button
                    data-active={selectedEventId === event.id}
                    onClick={() => onSelect(event.id)}
                    type="button"
                  >
                    <strong>{event.name}</strong>
                    <span>
                      {event.description || "尚未填写事件说明"} ·{" "}
                      {event.subEvents.length} 个子事件
                    </span>
                  </button>
                  {editable ? (
                    <button
                      aria-label={`删除事件 ${event.name}`}
                      onClick={() => {
                        onChange(
                          (current) =>
                            current.map((item) =>
                              item.id === slot.id
                                ? {
                                    ...item,
                                    events: item.events.filter(
                                      (itemEvent) => itemEvent.id !== event.id,
                                    ),
                                  }
                                : item,
                            ),
                          `删除父事件“${event.name}”`,
                        );
                        if (
                          selectedEventId === event.id ||
                          event.subEvents.some(
                            (item) => item.id === selectedEventId,
                          )
                        )
                          onSelect(null);
                      }}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
                {event.subEvents.length ? (
                  <div className={styles.subEventList}>
                    {event.subEvents.map((subEvent) => (
                      <div className={styles.subEventRow} key={subEvent.id}>
                        <button
                          data-active={selectedEventId === subEvent.id}
                          onClick={() => onSelect(subEvent.id)}
                          type="button"
                        >
                          <span>子事件</span>
                          <strong>{subEvent.name}</strong>
                        </button>
                        {editable ? (
                          <button
                            aria-label={`删除子事件 ${subEvent.name}`}
                            onClick={() => {
                              onChange(
                                (current) =>
                                  current.map((item) => ({
                                    ...item,
                                    events: item.events.map((parent) =>
                                      parent.id === event.id
                                        ? {
                                            ...parent,
                                            subEvents: parent.subEvents.filter(
                                              (item) => item.id !== subEvent.id,
                                            ),
                                          }
                                        : parent,
                                    ),
                                  })),
                                `删除子事件“${subEvent.name}”`,
                              );
                              if (selectedEventId === subEvent.id)
                                onSelect(null);
                            }}
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {editable ? (
                  <button
                    className={styles.addSubEvent}
                    onClick={() => {
                      const id = crypto.randomUUID();
                      onChange(
                        (current) =>
                          current.map((item) => ({
                            ...item,
                            events: item.events.map((parent) =>
                              parent.id === event.id
                                ? {
                                    ...parent,
                                    subEvents: [
                                      ...parent.subEvents,
                                      { id, name: "新子事件", description: "" },
                                    ],
                                  }
                                : parent,
                            ),
                          })),
                        `在“${event.name}”内新增子事件`,
                      );
                      onSelect(id);
                    }}
                    type="button"
                  >
                    <Plus size={14} />
                    添加子事件
                  </button>
                ) : null}
              </div>
            ))}
            {editable ? (
              <button
                className={styles.addEvent}
                onClick={() =>
                  onChange(
                    (current) =>
                      current.map((item) =>
                        item.id === slot.id
                          ? {
                              ...item,
                              events: [
                                ...item.events,
                                {
                                  id: crypto.randomUUID(),
                                  name: "新事件",
                                  description: "",
                                  subEvents: [],
                                },
                              ],
                            }
                          : item,
                      ),
                    `在“${slot.name}”内新增父事件`,
                  )
                }
                type="button"
              >
                <Plus size={15} />
                添加父事件
              </button>
            ) : null}
          </article>
        ))}
        {!slots.length ? (
          <div className={styles.emptyStructure}>
            还没有时段，请先添加一个时段。
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function WorldflowClient({
  assets: initialAssets,
  initialSelectedId,
  user,
  worlds,
}: {
  assets: WorldflowAsset[];
  initialSelectedId: string | null;
  user: { id: string; name: string; role: string };
  worlds: WorldflowWorld[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    initialSelectedId && worlds.some((world) => world.id === initialSelectedId)
      ? initialSelectedId
      : null,
  );
  const selectedSource =
    worlds.find((world) => world.id === selectedId) ?? null;
  const [state, setState] = useState<WorldflowState | null>(
    selectedSource ? normalizeState(selectedSource.workflow_state) : null,
  );
  const persistedStateRef = useRef<WorldflowState | null>(
    selectedSource ? normalizeState(selectedSource.workflow_state) : null,
  );
  const [activeStep, setActiveStep] = useState(
    selectedSource?.current_step ?? 1,
  );
  const [activeShotId, setActiveShotId] = useState(
    selectedSource?.workflow_state.shots[0]?.id ?? "",
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [shotSetupExpanded, setShotSetupExpanded] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [message, setMessage] = useState("");
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [removingAssetId, setRemovingAssetId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isArchitect = user.role === "architect";
  const isOwner = selectedSource?.owner_id === user.id;

  const activeShot =
    state?.shots.find((shot) => shot.id === activeShotId) ?? state?.shots[0];
  const eventSystem = activeShot
    ? state?.eventSystems[activeShot.id]
    : undefined;
  const eventSelection = eventSystem
    ? findEventSelection(eventSystem.timeSlots, selectedEventId)
    : null;
  const selectedEvent = eventSelection?.subject ?? null;
  const selectedParentEvent = eventSelection?.parent ?? null;
  const selectedTimeSlot = eventSelection?.slot ?? null;
  const videoSequence = state ? buildWorldflowVideoSequence(state, assets) : [];

  function selectEvent(eventId: string | null) {
    setSelectedEventId(eventId);
    setContextExpanded(false);
  }

  function assetsForScope(
    step: number,
    scope: {
      characterId?: string | null;
      eventId?: string | null;
      shotId?: string | null;
    } = {},
  ) {
    return assets.filter(
      (asset) =>
        asset.world_id === selectedId &&
        asset.step === step &&
        asset.character_id === (scope.characterId ?? null) &&
        asset.event_id === (scope.eventId ?? null) &&
        asset.shot_id === (scope.shotId ?? null),
    );
  }

  function removeAssetFromState(assetId: string) {
    setAssets((items) => items.filter((item) => item.id !== assetId));
  }

  function openWorld(world: WorldflowWorld) {
    const nextState = normalizeState(world.workflow_state);
    setSelectedId(world.id);
    setState(nextState);
    persistedStateRef.current = nextState;
    setActiveStep(world.current_step);
    setActiveShotId(world.workflow_state.shots[0]?.id ?? "");
    selectEvent(null);
    setShotSetupExpanded(false);
    setUndoSnapshot(null);
    setMessage("");
    window.history.replaceState(null, "", `/worldflow?world=${world.id}`);
  }

  function updateState(update: (current: WorldflowState) => WorldflowState) {
    if (!state || !isOwner) return;
    setState(update(state));
    setMessage("尚未保存");
  }

  function updateStructure(
    label: string,
    update: (current: WorldflowState) => WorldflowState,
  ) {
    if (!state || !isOwner) return;
    setUndoSnapshot({
      activeShotId,
      label,
      selectedEventId,
      state,
    });
    updateState(update);
  }

  function undoStructureChange() {
    if (!undoSnapshot) return;
    setState(undoSnapshot.state);
    setActiveShotId(undoSnapshot.activeShotId);
    setSelectedEventId(undoSnapshot.selectedEventId);
    setUndoSnapshot(null);
    setMessage("已撤回上一步结构调整，保存后生效");
  }

  async function removeLinkedAsset(assetId: string) {
    setRemovingAssetId(assetId);
    try {
      const deleteError = await deleteWorldflowAsset(assetId);
      if (deleteError) {
        setMessage(deleteError);
      } else {
        setAssets((items) => items.filter((item) => item.id !== assetId));
        setMessage("已从内容编排中移除素材");
      }
    } catch {
      setMessage("移除素材失败，请重试。");
    } finally {
      setRemovingAssetId(null);
    }
  }

  function save() {
    if (!state || !selectedSource) return;
    startTransition(async () => {
      const result = await saveWorldflowState({
        worldId: selectedSource.id,
        state,
        currentStep: activeStep >= 5 ? selectedSource.current_step : activeStep,
      });
      setMessage(result.error ?? "已保存");
      if (!result.error) {
        persistedStateRef.current = state;
        router.refresh();
      }
    });
  }

  async function saveBeforeMaterialUpload(target: WorldflowMaterialTarget) {
    if (!state || !selectedSource) return "当前世界尚未准备好。";
    if (isWorldflowMaterialTargetPersisted(persistedStateRef.current, target)) {
      return null;
    }
    const result = await saveWorldflowState({
      worldId: selectedSource.id,
      state,
      currentStep: activeStep >= 5 ? selectedSource.current_step : activeStep,
    });
    if (result.error) return result.error;
    persistedStateRef.current = state;
    setMessage("已自动保存当前草稿");
    return null;
  }

  function submit() {
    if (!state || !selectedSource) return;
    startTransition(async () => {
      const result = await submitWorldflowStep({
        worldId: selectedSource.id,
        state,
        step: activeStep,
      });
      if (result.state) {
        setState(result.state);
        persistedStateRef.current = result.state;
      }
      setMessage(result.error ?? "已提交 architect 审核");
      if (!result.error) router.refresh();
    });
  }

  function review(decision: "approve" | "changes") {
    if (!state || !selectedSource) return;
    startTransition(async () => {
      const result = await reviewWorldflowStep({
        worldId: selectedSource.id,
        state,
        step: activeStep,
        decision,
      });
      if (result.state) {
        setState(result.state);
        persistedStateRef.current = result.state;
      }
      if (result.nextStep) setActiveStep(result.nextStep);
      setMessage(
        result.error ?? (decision === "approve" ? "审核通过" : "已退回修改"),
      );
      if (!result.error) router.refresh();
    });
  }

  if (!selectedSource || !state)
    return (
      <main className={styles.page}>
        <header className={styles.overviewHeader}>
          <div>
            <span>WORLD PRODUCTION</span>
            <h1>世界制作工作台</h1>
            <p>
              每个人都可以从世界设定开始创建；architect 同时拥有创作和审核能力。
            </p>
          </div>
          <button
            className={styles.primary}
            onClick={() => setCreating(true)}
            type="button"
          >
            <Plus size={18} />
            创建世界
          </button>
        </header>
        <section className={styles.lifecycle}>
          <div>
            <strong>准备阶段 · STEP 1–4</strong>
            <span>世界设定、风格基准、镜头清单和可选角色，通常一次确认。</span>
          </div>
          <ChevronRight />
          <div>
            <strong>持续制作工作台 · STEP 5–7</strong>
            <span>事件始终可编辑，并按里程碑逐步解锁图片、视频和编排。</span>
          </div>
        </section>
        <section className={styles.worldList}>
          {worlds.map((world) => (
            <button
              className={styles.worldCard}
              key={world.id}
              onClick={() => openWorld(world)}
              type="button"
            >
              <span>
                STEP {world.current_step} · {STATUS[world.current_status]}
              </span>
              <h2>{world.name}</h2>
              <p>{world.description || "尚未填写世界简介。"}</p>
              <footer>
                <span>
                  {world.owner_name}
                  {world.owner_id === user.id ? " · 我创建的" : ""}
                </span>
                <span>
                  {formatDate(world.updated_at)} <ChevronRight size={15} />
                </span>
              </footer>
            </button>
          ))}
          {!worlds.length ? (
            <div className={styles.emptyWorld}>
              <Layers3 size={28} />
              <strong>还没有世界</strong>
              <span>创建第一个世界，从 Step 1 开始完整跑通工作流。</span>
              <button
                className={styles.primary}
                onClick={() => setCreating(true)}
                type="button"
              >
                <Plus size={18} />
                创建世界
              </button>
            </div>
          ) : null}
        </section>
        {creating ? (
          <div className={styles.modalBackdrop}>
            <form
              className={styles.modal}
              onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                  const result = await createWorldflowWorld({
                    name: newName,
                    description: newDescription,
                  });
                  if (result.id)
                    window.location.href = `/worldflow?world=${result.id}`;
                  else setMessage(result.error ?? "创建失败");
                });
              }}
            >
              <header>
                <div>
                  <span>NEW WORLD</span>
                  <h2>创建一个世界</h2>
                </div>
                <button onClick={() => setCreating(false)} type="button">
                  关闭
                </button>
              </header>
              <label>
                世界名称
                <input
                  autoFocus
                  maxLength={120}
                  onChange={(event) => setNewName(event.target.value)}
                  required
                  value={newName}
                />
              </label>
              <label>
                一句话描述
                <textarea
                  maxLength={2000}
                  onChange={(event) => setNewDescription(event.target.value)}
                  value={newDescription}
                />
              </label>
              {message ? <p className={styles.error}>{message}</p> : null}
              <button
                className={styles.primary}
                disabled={pending}
                type="submit"
              >
                {pending ? "创建中…" : "创建并进入 Step 1"}
              </button>
            </form>
          </div>
        ) : null}
      </main>
    );

  const stepStatus = statusOf(state, activeStep);
  const milestoneEditable =
    isOwner &&
    activeStep <= selectedSource.current_step &&
    stepStatus !== "review" &&
    stepStatus !== "approved";
  const productionEditable = isOwner && selectedSource.current_step >= 5;
  const continuingShotEdit =
    isOwner && activeStep === 3 && selectedSource.current_step >= 5;
  const editable =
    activeStep >= 5
      ? productionEditable
      : milestoneEditable || continuingShotEdit;
  const canSubmitMilestone =
    isOwner &&
    activeStep <= selectedSource.current_step &&
    !["review", "approved"].includes(stepStatus);

  function beginNewIteration() {
    updateState((current) => ({
      ...current,
      stepStatuses: { ...current.stepStatuses, [String(activeStep)]: "draft" },
    }));
    setMessage("本里程碑已重新打开；持续制作内容仍可随时修改");
  }

  function updateEventSystem(
    mutator: (
      slots: NonNullable<typeof eventSystem>["timeSlots"],
    ) => NonNullable<typeof eventSystem>["timeSlots"],
    undoLabel?: string,
  ) {
    if (!activeShot || !eventSystem) return;
    const update = (current: WorldflowState) => ({
      ...current,
      eventSystems: {
        ...current.eventSystems,
        [activeShot.id]: {
          version: eventSystem.version + 1,
          timeSlots: mutator(eventSystem.timeSlots),
        },
      },
    });
    if (undoLabel) updateStructure(undoLabel, update);
    else updateState(update);
  }

  function updateEventSubject(
    subjectId: string,
    patch: Partial<Pick<WorldflowEvent, "description" | "name">>,
  ) {
    updateEventSystem((slots) =>
      slots.map((slot) => ({
        ...slot,
        events: slot.events.map((event) =>
          event.id === subjectId
            ? { ...event, ...patch }
            : {
                ...event,
                subEvents: event.subEvents.map((subEvent) =>
                  subEvent.id === subjectId
                    ? { ...subEvent, ...patch }
                    : subEvent,
                ),
              },
        ),
      })),
    );
  }

  function deleteShot(shotId: string) {
    if (!state || state.shots.length <= 1) return;
    const remaining = state.shots.filter((shot) => shot.id !== shotId);
    if (activeShot?.id === shotId) {
      setActiveShotId(remaining[0]?.id ?? "");
      selectEvent(null);
    }
    const deletedShot = state.shots.find((shot) => shot.id === shotId);
    updateStructure(`删除镜头“${deletedShot?.name || "未命名镜头"}”`, (current) => {
      const eventSystems = { ...current.eventSystems };
      delete eventSystems[shotId];
      return {
        ...current,
        eventSystems,
        shots: current.shots.filter((shot) => shot.id !== shotId),
      };
    });
  }

  function addShot() {
    if (!state) return;
    const id = crypto.randomUUID();
    updateStructure("新增镜头", (current) => ({
      ...current,
      shots: [
        ...current.shots,
        {
          id,
          name: `镜头 ${String.fromCharCode(65 + current.shots.length)}`,
          description: "",
        },
      ],
      eventSystems: {
        ...current.eventSystems,
        [id]: { version: 1, timeSlots: [] },
      },
    }));
    setActiveShotId(id);
    selectEvent(null);
    setShotSetupExpanded(true);
  }

  const activeShotImageCount = activeShot
    ? assetsForScope(3, { shotId: activeShot.id }).filter(
        (asset) => asset.media_type === "image",
      ).length
    : 0;

  return (
    <main className={styles.page}>
      <header className={styles.workspaceHeader}>
        <button
          className={styles.back}
          onClick={() => {
            setSelectedId(null);
            window.history.replaceState(null, "", "/worldflow");
          }}
          type="button"
        >
          <ArrowLeft size={18} />
          所有世界
        </button>
        <div>
          <span>WORLD / {selectedSource.id.slice(0, 8).toUpperCase()}</span>
          <h1>{selectedSource.name}</h1>
          <p>
            创建者：{selectedSource.owner_name} · 当前账号：{user.name} /{" "}
            {user.role}
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.status} data-status={stepStatus}>
            {STATUS[stepStatus]}
          </span>
          {isOwner ? (
            <button
              className={styles.secondary}
              disabled={pending}
              onClick={save}
              type="button"
            >
              <Save size={16} />
              保存
            </button>
          ) : null}
        </div>
      </header>

      <nav className={styles.stepNav} aria-label="世界制作步骤">
        <div>
          <header>
            基础构建 <span>通常一次确认</span>
          </header>
          {STEPS.slice(0, 3).map((step, index) => (
            <button
              data-active={activeStep === index + 1}
              key={step[0]}
              onClick={() => {
                setActiveStep(index + 1);
                setContextExpanded(false);
              }}
              type="button"
            >
              <span>0{index + 1}</span>
              <strong>{step[0]}</strong>
              <small>{STATUS[statusOf(state, index + 1)]}</small>
            </button>
          ))}
        </div>
        <div>
          <header>
            持续生产 <span>统一工作台</span>
          </header>
          {STEPS.slice(3, 4).map((step, index) => (
            <button
              data-active={activeStep === index + 4}
              key={step[0]}
              onClick={() => {
                setActiveStep(index + 4);
                setContextExpanded(false);
              }}
              type="button"
            >
              <span>0{index + 4}</span>
              <strong>{step[0]}</strong>
              <small>{STATUS[statusOf(state, index + 4)]}</small>
            </button>
          ))}
          <button
            data-active={activeStep >= 5}
            disabled={selectedSource.current_step < 5}
            onClick={() => {
              setActiveStep(Math.max(5, selectedSource.current_step));
              setContextExpanded(false);
            }}
            type="button"
          >
            <span>05–07</span>
            <strong>持续制作工作台</strong>
            <small>
              {selectedSource.current_step < 5
                ? "完成角色设定后解锁"
                : `已解锁至 STEP ${selectedSource.current_step}`}
            </small>
          </button>
        </div>
      </nav>

      <section className={styles.permission}>
        <div>
          {isArchitect ? <ShieldCheck size={19} /> : <UserRound size={19} />}
          <p>
            <strong>
              {isOwner
                ? "你是这个世界的创建者"
                : isArchitect
                  ? "Architect 审核视角"
                  : "协作查看"}
            </strong>
            <span>
              {isOwner
                ? activeStep >= 5
                  ? "事件与时段提交后仍可修改；审核只负责解锁下一层素材能力。"
                  : "可编辑、上传或关联素材并提交审核。"
                : isArchitect
                  ? "可查看全部内容并处理待审核步骤；你仍然可以创建自己的世界。"
                  : "可以浏览，但只有创建者能修改。"}
            </span>
          </p>
        </div>
        <button
          className={styles.secondary}
          onClick={() => {
            setSelectedId(null);
            setCreating(true);
            window.history.replaceState(null, "", "/worldflow");
          }}
          type="button"
        >
          <Plus size={16} />
          创建我的世界
        </button>
      </section>

      <div className={styles.stepTitle}>
        <span>{activeStep >= 5 ? "05–07" : `0${activeStep}`}</span>
        <div>
          <small>
            {STEPS[activeStep - 1][2] === "foundation"
              ? "FOUNDATION · LOW FREQUENCY"
              : "ONGOING · CONTINUOUS"}
          </small>
          <h2>
            {activeStep >= 5 ? "持续制作工作台" : STEPS[activeStep - 1][0]}
          </h2>
          <p>
            {activeStep >= 5
              ? "统一维护镜头、时段、事件、图片和视频；里程碑审核逐步解锁新能力。"
              : STEPS[activeStep - 1][1]}
          </p>
        </div>
      </div>

      {activeStep >= 5 ? (
        <section className={styles.productionMilestones}>
          {[5, 6, 7].map((step) => {
            const unlocked = selectedSource.current_step >= step;
            return (
              <button
                data-active={activeStep === step}
                data-unlocked={unlocked}
                disabled={!unlocked}
                key={step}
                onClick={() => {
                  setActiveStep(step);
                  setContextExpanded(false);
                }}
                type="button"
              >
                <span>STEP 0{step}</span>
                <strong>{STEPS[step - 1][0]}</strong>
                <small>
                  {unlocked
                    ? STATUS[statusOf(state, step)]
                    : "完成前一里程碑审核后解锁"}
                </small>
              </button>
            );
          })}
        </section>
      ) : null}

      {activeStep >= 5 ? (
        <section className={styles.shotSelector}>
          <header>
            <div>
              <span>SHOT SYSTEMS</span>
              <h3>选择镜头</h3>
            </div>
            {editable ? (
              <button
                className={styles.secondary}
                onClick={addShot}
                type="button"
              >
                <Plus size={16} />
                添加镜头
              </button>
            ) : null}
          </header>
          <div>
            {state.shots.map((shot) => (
              <article className={styles.shotOption} key={shot.id}>
                <button
                  data-active={activeShot?.id === shot.id}
                  onClick={() => {
                    setActiveShotId(shot.id);
                    selectEvent(null);
                    setShotSetupExpanded(false);
                  }}
                  type="button"
                >
                  <strong>{shot.name}</strong>
                  <span>
                    {state.eventSystems[shot.id]?.timeSlots.length ?? 0} 个时段
                    · V{state.eventSystems[shot.id]?.version ?? 1}
                  </span>
                </button>
                {editable && state.shots.length > 1 ? (
                  <button
                    aria-label={`删除镜头 ${shot.name}`}
                    className={styles.deleteShot}
                    onClick={() => deleteShot(shot.id)}
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeStep >= 5 && activeShot ? (
        <section className={styles.shotFoundation}>
          <header>
            <div>
              <span>ACTIVE SHOT FOUNDATION</span>
              <strong>{activeShot.name || "未命名镜头"}</strong>
              <small data-required={activeShotImageCount === 0}>
                {activeShotImageCount
                  ? `${activeShotImageCount} 张起始图片`
                  : "需要至少 1 张起始图片"}
              </small>
            </div>
            <button
              aria-expanded={shotSetupExpanded}
              className={styles.secondary}
              onClick={() => setShotSetupExpanded((expanded) => !expanded)}
              type="button"
            >
              {shotSetupExpanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
              {shotSetupExpanded ? "收起镜头基础" : "编辑镜头基础"}
            </button>
          </header>
          {shotSetupExpanded ? (
            <div>
              <label>
                镜头名称
                <input
                  disabled={!productionEditable}
                  onChange={(event) =>
                    updateState((current) => ({
                      ...current,
                      shots: current.shots.map((shot) =>
                        shot.id === activeShot.id
                          ? { ...shot, name: event.target.value }
                          : shot,
                      ),
                    }))
                  }
                  value={activeShot.name}
                />
              </label>
              <label>
                镜头描述
                <textarea
                  disabled={!productionEditable}
                  onChange={(event) =>
                    updateState((current) => ({
                      ...current,
                      shots: current.shots.map((shot) =>
                        shot.id === activeShot.id
                          ? { ...shot, description: event.target.value }
                          : shot,
                      ),
                    }))
                  }
                  value={activeShot.description}
                />
              </label>
              <MaterialUploader
                assets={assetsForScope(3, { shotId: activeShot.id })}
                beforeUpload={saveBeforeMaterialUpload}
                canUpload={productionEditable}
                mediaKind="image"
                onDeleted={removeAssetFromState}
                onUploaded={(asset) =>
                  setAssets((items) => [asset, ...items])
                }
                shotId={activeShot.id}
                step={3}
                targetLabel={`镜头 / ${activeShot.name || "未命名镜头"}`}
                title="镜头起始图片"
                worldId={selectedSource.id}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={styles.editor}>
        {activeStep === 1 ? (
          <div className={styles.fields}>
            <label>
              世界设定
              <textarea
                disabled={!editable}
                onChange={(event) =>
                  updateState((current) => ({
                    ...current,
                    worldBible: event.target.value,
                  }))
                }
                value={state.worldBible}
              />
            </label>
            <label>
              世界运行规律
              <textarea
                disabled={!editable}
                onChange={(event) =>
                  updateState((current) => ({
                    ...current,
                    worldRules: event.target.value,
                  }))
                }
                value={state.worldRules}
              />
            </label>
            <label>
              核心冲突
              <textarea
                disabled={!editable}
                onChange={(event) =>
                  updateState((current) => ({
                    ...current,
                    coreConflict: event.target.value,
                  }))
                }
                value={state.coreConflict}
              />
            </label>
            <MaterialUploader
              beforeUpload={saveBeforeMaterialUpload}
              assets={assetsForScope(1)}
              canUpload={editable}
              onDeleted={removeAssetFromState}
              onUploaded={(asset) => setAssets((items) => [asset, ...items])}
              step={1}
              targetLabel={`${selectedSource.name} / 世界设定`}
              title="世界参考素材"
              worldId={selectedSource.id}
            />
          </div>
        ) : null}
        {activeStep === 2 ? (
          <div className={styles.fields}>
            <label>
              风格方向说明
              <textarea
                disabled={!editable}
                onChange={(event) =>
                  updateState((current) => ({
                    ...current,
                    visualDirection: event.target.value,
                  }))
                }
                value={state.visualDirection}
              />
            </label>
            <MaterialUploader
              beforeUpload={saveBeforeMaterialUpload}
              assets={assetsForScope(2)}
              canUpload={editable}
              onDeleted={removeAssetFromState}
              onUploaded={(asset) => setAssets((items) => [asset, ...items])}
              step={2}
              targetLabel={`${selectedSource.name} / 风格基准`}
              title="风格基准候选"
              worldId={selectedSource.id}
            />
          </div>
        ) : null}
        {activeStep === 3 ? (
          <div>
            <div className={styles.recordList}>
              {state.shots.map((shot) => (
                <article className={styles.assetRecord} key={shot.id}>
                  <div className={styles.recordFields}>
                    <ImageIcon size={18} />
                    <input
                      disabled={!editable}
                      onChange={(event) =>
                        updateState((current) => ({
                          ...current,
                          shots: current.shots.map((item) =>
                            item.id === shot.id
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        }))
                      }
                      value={shot.name}
                    />
                    <textarea
                      disabled={!editable}
                      onChange={(event) =>
                        updateState((current) => ({
                          ...current,
                          shots: current.shots.map((item) =>
                            item.id === shot.id
                              ? { ...item, description: event.target.value }
                              : item,
                          ),
                        }))
                      }
                      value={shot.description}
                    />
                    {editable && state.shots.length > 1 ? (
                      <button
                        aria-label="删除镜头"
                        onClick={() => deleteShot(shot.id)}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                  <MaterialUploader
                    beforeUpload={saveBeforeMaterialUpload}
                    assets={assetsForScope(3, { shotId: shot.id })}
                    canUpload={editable}
                    mediaKind="mixed"
                    onDeleted={removeAssetFromState}
                    onUploaded={(asset) =>
                      setAssets((items) => [asset, ...items])
                    }
                    shotId={shot.id}
                    step={3}
                    targetLabel={`镜头 / ${shot.name || "未命名镜头"}`}
                    title={`${shot.name || "未命名镜头"}的起始图片`}
                    worldId={selectedSource.id}
                  />
                </article>
              ))}
            </div>
            {editable ? (
              <button
                className={styles.dashed}
                onClick={addShot}
                type="button"
              >
                <Plus size={18} />
                添加镜头
              </button>
            ) : null}
          </div>
        ) : null}
        {activeStep === 4 ? (
          <div>
            <div className={styles.optional}>
              <SkipForward size={18} />
              <p>
                <strong>角色是可选内容</strong>
                <span>
                  可以添加多个角色；一旦添加，每个角色都需要描述和至少一张形象图片。
                </span>
              </p>
              {editable ? (
                <button
                  className={styles.secondary}
                  onClick={() =>
                    updateState((current) => ({
                      ...current,
                      stepStatuses: {
                        ...current.stepStatuses,
                        "4":
                          statusOf(current, 4) === "skipped"
                            ? "optional"
                            : "skipped",
                      },
                    }))
                  }
                  type="button"
                >
                  {stepStatus === "skipped" ? "恢复角色设定" : "跳过角色设定"}
                </button>
              ) : null}
            </div>
            {stepStatus !== "skipped" ? (
              <>
                <div className={styles.recordList}>
                  {state.characters.map((character) => (
                    <article className={styles.assetRecord} key={character.id}>
                      <div className={styles.characterHeader}>
                        <UserRound size={18} />
                        <strong>{character.name || "未命名角色"}</strong>
                        {editable ? (
                          <button
                            aria-label={`删除角色 ${character.name || "未命名角色"}`}
                            onClick={() =>
                              updateState((current) => ({
                                ...current,
                                characters: current.characters.filter(
                                  (item) => item.id !== character.id,
                                ),
                              }))
                            }
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                      <div className={styles.characterFields}>
                        <label>
                          角色名称
                          <input
                            disabled={!editable}
                            onChange={(event) =>
                              updateState((current) => ({
                                ...current,
                                characters: current.characters.map((item) =>
                                  item.id === character.id
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="角色名称"
                            value={character.name}
                          />
                        </label>
                        <label>
                          角色描述
                          <textarea
                            disabled={!editable}
                            onChange={(event) =>
                              updateState((current) => ({
                                ...current,
                                characters: current.characters.map((item) =>
                                  item.id === character.id
                                    ? {
                                        ...item,
                                        description: event.target.value,
                                      }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="外观、性格、身份与显著特征"
                            value={character.description}
                          />
                        </label>
                        <label>
                          出现环境
                          <textarea
                            disabled={!editable}
                            onChange={(event) =>
                              updateState((current) => ({
                                ...current,
                                characters: current.characters.map((item) =>
                                  item.id === character.id
                                    ? {
                                        ...item,
                                        environment: event.target.value,
                                      }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="角色通常出现在哪里"
                            value={character.environment}
                          />
                        </label>
                        <label>
                          行为动机
                          <textarea
                            disabled={!editable}
                            onChange={(event) =>
                              updateState((current) => ({
                                ...current,
                                characters: current.characters.map((item) =>
                                  item.id === character.id
                                    ? {
                                        ...item,
                                        motivation: event.target.value,
                                      }
                                    : item,
                                ),
                              }))
                            }
                            placeholder="角色为什么采取这些行动"
                            value={character.motivation}
                          />
                        </label>
                      </div>
                      <MaterialUploader
                        beforeUpload={saveBeforeMaterialUpload}
                        assets={assetsForScope(4, {
                          characterId: character.id,
                        })}
                        canUpload={editable}
                        characterId={character.id}
                        mediaKind="image"
                        onDeleted={removeAssetFromState}
                        onUploaded={(asset) =>
                          setAssets((items) => [asset, ...items])
                        }
                        step={4}
                        targetLabel={`角色 / ${character.name || "未命名角色"}`}
                        title={`${character.name || "未命名角色"}的形象图片`}
                        worldId={selectedSource.id}
                      />
                    </article>
                  ))}
                </div>
                {editable ? (
                  <button
                    className={styles.dashed}
                    onClick={() =>
                      updateState((current) => ({
                        ...current,
                        characters: [
                          ...current.characters,
                          {
                            id: crypto.randomUUID(),
                            name: "",
                            description: "",
                            environment: "",
                            motivation: "",
                          },
                        ],
                      }))
                    }
                    type="button"
                  >
                    <Plus size={18} />
                    添加角色
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
        {activeStep >= 5 && activeShot && eventSystem ? (
          <div>
            <EventStructureEditor
              editable={editable}
              onChange={updateEventSystem}
              onSelect={selectEvent}
              selectedEventId={selectedEventId}
              slots={eventSystem.timeSlots}
            />
            {selectedEvent && selectedParentEvent ? (
              <div className={styles.eventDetail}>
                <div className={styles.eventType}>
                  <span>
                    {eventSelection?.isSubEvent ? "子事件" : "父事件"}
                  </span>
                  <strong>
                    {eventSelection?.isSubEvent
                      ? `继承自：${selectedParentEvent.name}`
                      : `${selectedParentEvent.subEvents.length} 个子事件`}
                  </strong>
                </div>
                <label>
                  {eventSelection?.isSubEvent ? "子事件名称" : "父事件名称"}
                  <input
                    disabled={!editable}
                    onChange={(change) =>
                      updateEventSubject(selectedEvent.id, {
                        name: change.target.value,
                      })
                    }
                    value={selectedEvent.name}
                  />
                </label>
                <label>
                  {eventSelection?.isSubEvent ? "子事件说明" : "父事件说明"}
                  <textarea
                    disabled={!editable}
                    onChange={(change) =>
                      updateEventSubject(selectedEvent.id, {
                        description: change.target.value,
                      })
                    }
                    value={selectedEvent.description}
                  />
                </label>
                {editable && !eventSelection?.isSubEvent ? (
                  <button
                    className={styles.dashed}
                    onClick={() => {
                      const id = crypto.randomUUID();
                      updateEventSystem(
                        (slots) =>
                          slots.map((slot) => ({
                            ...slot,
                            events: slot.events.map((event) =>
                              event.id === selectedParentEvent.id
                                ? {
                                    ...event,
                                    subEvents: [
                                      ...event.subEvents,
                                      { id, name: "新子事件", description: "" },
                                    ],
                                  }
                                : event,
                            ),
                          })),
                        `在“${selectedParentEvent.name}”内新增子事件`,
                      );
                      selectEvent(id);
                    }}
                    type="button"
                  >
                    <Plus size={16} />
                    在“{selectedParentEvent.name}”内添加子事件
                  </button>
                ) : null}
                <MaterialUploader
                  beforeUpload={saveBeforeMaterialUpload}
                  assets={assetsForScope(5, {
                    eventId: selectedEvent.id,
                    shotId: activeShot.id,
                  })}
                  canUpload={editable}
                  eventId={selectedEvent.id}
                  onDeleted={removeAssetFromState}
                  onUploaded={(asset) =>
                    setAssets((items) => [asset, ...items])
                  }
                  shotId={activeShot.id}
                  step={5}
                  targetLabel={`${activeShot.name} / ${selectedTimeSlot?.name || "未命名时段"} / ${selectedParentEvent.name}${eventSelection?.isSubEvent ? ` / ${selectedEvent.name}` : ""}`}
                  title={
                    eventSelection?.isSubEvent
                      ? "子事件参考素材"
                      : "父事件参考素材"
                  }
                  worldId={selectedSource.id}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {activeStep >= 5 && activeShot && eventSystem ? (
          <div>
            <div className={styles.subjectTable}>
              <div className={styles.subjectTableIntro}>
                <strong>选择素材单元</strong>
                <span>
                  父事件与子事件都会继承到这张表中；点击单元后查看完整生成背景。
                </span>
              </div>
              <div className={styles.subjectColumns}>
                {eventSystem.timeSlots.map((slot) => (
                  <section className={styles.subjectColumn} key={slot.id}>
                    <header>
                      <Clock3 size={15} />
                      <strong>{slot.name}</strong>
                    </header>
                    {slot.events.map((event) => (
                      <div className={styles.subjectGroup} key={event.id}>
                        <button
                          data-active={selectedEventId === event.id}
                          onClick={() => selectEvent(event.id)}
                          type="button"
                        >
                          <small>父事件</small>
                          <strong>{event.name}</strong>
                        </button>
                        {event.subEvents.map((subEvent) => (
                          <button
                            data-active={selectedEventId === subEvent.id}
                            key={subEvent.id}
                            onClick={() => selectEvent(subEvent.id)}
                            type="button"
                          >
                            <small>↳ 子事件</small>
                            <strong>{subEvent.name}</strong>
                          </button>
                        ))}
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            </div>
            {selectedEvent && selectedParentEvent ? (
              <>
                <section className={styles.selectionSummary}>
                  <span>当前素材关联位置</span>
                  <strong>
                    {activeShot.name} / {selectedTimeSlot?.name || "未命名时段"} /{" "}
                    {selectedParentEvent.name}
                    {eventSelection?.isSubEvent
                      ? ` / 子事件：${selectedEvent.name}`
                      : " / 父事件"}
                  </strong>
                  <p>
                    下方新增的参考、图片和视频只会进入这个位置；切换表格单元后，关联位置会同步更新。
                  </p>
                </section>
                <section className={styles.context}>
                  <header>
                    <Layers3 size={19} />
                    <div>
                      <strong>本次素材会引入的生成背景</strong>
                      <span>
                        {contextExpanded
                          ? "这些信息会累积为当前单元的生成上下文。"
                          : `已准备 ${3 + (state.characters.length ? 1 : 0) + 1 + (eventSelection?.isSubEvent ? 1 : 0)} 层生成信息，默认保持收起。`}
                      </span>
                    </div>
                    <button
                      aria-expanded={contextExpanded}
                      className={styles.secondary}
                      onClick={() =>
                        setContextExpanded((expanded) => !expanded)
                      }
                      type="button"
                    >
                      {contextExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      {contextExpanded ? "收起背景" : "查看生成背景"}
                    </button>
                  </header>
                  {contextExpanded ? (
                    <div className={styles.contextLayers}>
                      <article>
                        <small>01 · 世界基础</small>
                        <strong>{selectedSource.name}</strong>
                        <p>{state.worldBible || "未填写世界设定"}</p>
                        <p>{state.worldRules || "未填写世界规律"}</p>
                      </article>
                      <article>
                        <small>02 · 视觉基准</small>
                        <strong>风格方向</strong>
                        <p>{state.visualDirection || "未填写风格方向"}</p>
                        <ContextAssetRefs
                          assets={assetsForScope(2)}
                          label="风格基准图片"
                        />
                      </article>
                      <article>
                        <small>03 · 镜头与时间</small>
                        <strong>
                          {activeShot.name} ·{" "}
                          {selectedTimeSlot?.name || "未命名时段"}
                        </strong>
                        <p>{activeShot.description || "未填写镜头说明"}</p>
                        <ContextAssetRefs
                          assets={assetsForScope(3, { shotId: activeShot.id })}
                          label={`${activeShot.name}的起始图片`}
                        />
                      </article>
                      {state.characters.length ? (
                        <article>
                          <small>04 · 角色信息</small>
                          <strong>
                            {state.characters
                              .map(
                                (character) => character.name || "未命名角色",
                              )
                              .join("、")}
                          </strong>
                          <p>
                            {state.characters
                              .map(
                                (character) =>
                                  `${character.name || "角色"}：${character.description || "未填写角色描述"}；动机：${character.motivation || "未填写动机"}`,
                              )
                              .join("；")}
                          </p>
                          <ContextAssetRefs
                            assets={state.characters.flatMap((character) =>
                              assetsForScope(4, { characterId: character.id }),
                            )}
                            label="角色形象图片"
                          />
                        </article>
                      ) : null}
                      <article>
                        <small>
                          {state.characters.length ? "05" : "04"} · 父事件
                        </small>
                        <strong>{selectedParentEvent.name}</strong>
                        <p>
                          {selectedParentEvent.description ||
                            "未填写父事件说明"}
                        </p>
                      </article>
                      {eventSelection?.isSubEvent ? (
                        <article>
                          <small>
                            {state.characters.length ? "06" : "05"} · 子事件主体
                          </small>
                          <strong>{selectedEvent.name}</strong>
                          <p>
                            {selectedEvent.description || "未填写子事件说明"}
                          </p>
                        </article>
                      ) : null}
                    </div>
                  ) : null}
                </section>
                {selectedSource.current_step >= 6 ? (
                  <section className={styles.productionSection}>
                    <header>
                      <div>
                        <span>STEP 06 · UNLOCKED</span>
                        <h3>图片素材</h3>
                      </div>
                      <small>{STATUS[statusOf(state, 6)]}</small>
                    </header>
                    <MaterialUploader
                      beforeUpload={saveBeforeMaterialUpload}
                      assets={assetsForScope(6, {
                        eventId: selectedEvent.id,
                        shotId: activeShot.id,
                      })}
                      canUpload={productionEditable}
                      eventId={selectedEvent.id}
                      mediaKind="image"
                      onDeleted={removeAssetFromState}
                      onUploaded={(asset) =>
                        setAssets((items) => [asset, ...items])
                      }
                      shotId={activeShot.id}
                      step={6}
                      targetLabel={`${activeShot.name} / ${selectedTimeSlot?.name || "未命名时段"} / ${selectedParentEvent.name}${eventSelection?.isSubEvent ? ` / ${selectedEvent.name}` : ""}`}
                      title={`${eventSelection?.isSubEvent ? "子事件" : "父事件"}图片版本`}
                      worldId={selectedSource.id}
                    />
                  </section>
                ) : (
                  <section className={styles.unlockPanel}>
                    <LockKeyhole size={21} />
                    <div>
                      <strong>图片素材尚未解锁</strong>
                      <span>STEP 5 审核通过后，会在同一页面开放图片素材。</span>
                    </div>
                  </section>
                )}
                {selectedSource.current_step >= 7 ? (
                  <section className={styles.productionSection}>
                    <header>
                      <div>
                        <span>STEP 07 · UNLOCKED</span>
                        <h3>视频素材</h3>
                      </div>
                      <small>{STATUS[statusOf(state, 7)]}</small>
                    </header>
                    <MaterialUploader
                      beforeUpload={saveBeforeMaterialUpload}
                      assets={assetsForScope(7, {
                        eventId: selectedEvent.id,
                        shotId: activeShot.id,
                      })}
                      canUpload={productionEditable}
                      eventId={selectedEvent.id}
                      mediaKind="video"
                      onDeleted={removeAssetFromState}
                      onUploaded={(asset) =>
                        setAssets((items) => [asset, ...items])
                      }
                      shotId={activeShot.id}
                      step={7}
                      targetLabel={`${activeShot.name} / ${selectedTimeSlot?.name || "未命名时段"} / ${selectedParentEvent.name}${eventSelection?.isSubEvent ? ` / ${selectedEvent.name}` : ""}`}
                      title={`${eventSelection?.isSubEvent ? "子事件" : "父事件"}视频版本`}
                      worldId={selectedSource.id}
                    />
                  </section>
                ) : (
                  <section className={styles.unlockPanel}>
                    <LockKeyhole size={21} />
                    <div>
                      <strong>视频素材与编排尚未解锁</strong>
                      <span>STEP 6 审核通过后，会继续在这里开放视频能力。</span>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className={styles.noSelection}>
                <LockKeyhole size={22} />
                <strong>请选择一个父事件或子事件</strong>
                <span>素材会绑定到当前镜头和事件主体，不会混入其他镜头。</span>
              </div>
            )}
            {selectedSource.current_step >= 7 ? (
              <section className={styles.videoSequence}>
                <header>
                  <div>
                    <span>FINAL VIDEO ORCHESTRATION</span>
                    <h3>视频内容编排</h3>
                    <p>
                      这里汇总所有已在 Step 7
                      关联的视频；删除镜头或事件后，对应素材不会进入编排。
                    </p>
                  </div>
                  <strong>{videoSequence.length} 段视频</strong>
                </header>
                {videoSequence.length ? (
                  <ol>
                    {videoSequence.map((item, index) => (
                      <li key={item.asset.id}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <video
                          controls
                          preload="metadata"
                          src={item.asset.public_url}
                        />
                        <div>
                          <small>
                            {item.shotName} · {item.timeSlotName}
                          </small>
                          <strong>{item.eventName}</strong>
                          <p>
                            完整位置：{item.shotName} / {item.timeSlotName} /{" "}
                            {item.parentEventName}
                            {item.isSubEvent ? ` / ${item.eventName}` : ""} · V
                            {item.asset.version}
                          </p>
                          <p>
                            {item.asset.source_type === "cloud"
                              ? "云端关联"
                              : "本地上传"}{" "}
                            · {item.asset.file_name}
                          </p>
                          {isOwner ? (
                            <button
                              className={styles.removeSequenceAsset}
                              disabled={removingAssetId === item.asset.id}
                              onClick={() =>
                                void removeLinkedAsset(item.asset.id)
                              }
                              type="button"
                            >
                              <Trash2 size={15} />
                              {removingAssetId === item.asset.id
                                ? "移除中…"
                                : "从编排移除"}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className={styles.emptySequence}>
                    还没有已关联的 Step 7
                    视频。选择上方单元后，可以上传本地视频或关联云端视频。
                  </div>
                )}
              </section>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className={styles.actionBar}>
        <span>
          {message ||
            (editable
              ? activeStep >= 5
                ? "事件、时段与已解锁素材可持续维护；里程碑审核不会锁死内容。"
                : "修改后请保存；准备好后提交审核。"
              : "当前内容为只读。")}
        </span>
        <div>
          {isOwner && editable && undoSnapshot ? (
            <button
              className={styles.secondary}
              disabled={pending}
              onClick={undoStructureChange}
              type="button"
            >
              <Undo2 size={16} />
              撤回：{undoSnapshot.label}
            </button>
          ) : null}
          {isOwner && stepStatus === "approved" && activeStep >= 5 ? (
            <button
              className={styles.secondary}
              onClick={beginNewIteration}
              type="button"
            >
              重新提交本里程碑
            </button>
          ) : null}
          {isOwner && editable ? (
            <>
              <button
                className={styles.secondary}
                disabled={pending}
                onClick={save}
                type="button"
              >
                <Save size={16} />
                保存草稿
              </button>
              {canSubmitMilestone ? (
                <button
                  className={styles.primary}
                  disabled={pending}
                  onClick={submit}
                  type="button"
                >
                  <Upload size={16} />
                  提交 STEP {activeStep} 审核
                </button>
              ) : null}
            </>
          ) : null}
          {isArchitect && stepStatus === "review" ? (
            <>
              <button
                className={styles.secondary}
                disabled={pending}
                onClick={() => review("changes")}
                type="button"
              >
                退回修改
              </button>
              <button
                className={styles.primary}
                disabled={pending}
                onClick={() => review("approve")}
                type="button"
              >
                <Check size={16} />
                审核通过
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
