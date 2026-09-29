import { useSyncExternalStore } from "react";
import { createContext, useContext } from "react";
import {
  AppState,
  Carpet,
  ColorCard,
  Job,
  JobLine,
  LedgerEntry,
  LedgerType,
} from "./types";
import { createSeedState } from "./seed";
import { pad, uid } from "./utils";

const STORAGE_KEY = "carpet-restudio-state-v1";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.carpets && parsed.cards && parsed.jobs && parsed.ledger) return parsed;
    }
  } catch {
    // 存储损坏时回退到演示数据
  }
  return createSeedState();
}

let state: AppState = loadState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(mutate: (draft: AppState) => void): string | null {
  const draft: AppState = structuredClone(state);
  let error: string | null = null;
  try {
    mutate(draft);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (error) return error;
  // 落库成功后再更新内存，避免本地存储配额溢出导致数据与界面不一致
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    return "浏览器本地存储已满，图片可能过大，请删除部分档案的标记图后重试";
  }
  state = draft;
  emit();
  return null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// ---------- 选择器 ----------

/** 每张色卡当前被在制（reserved）工序占用的数量，按 cardId 聚合，与名称/色号无关 */
export function heldByCard(s: AppState): Record<string, number> {
  const held: Record<string, number> = {};
  for (const job of s.jobs) {
    if (job.status !== "reserved") continue;
    for (const line of job.lines) {
      held[line.cardId] = (held[line.cardId] ?? 0) + line.length;
    }
  }
  return held;
}

export function heldOfCard(s: AppState, cardId: string): number {
  return heldByCard(s)[cardId] ?? 0;
}

export function availableOfCard(s: AppState, cardId: string): number {
  const card = s.cards.find((c) => c.id === cardId);
  if (!card) return 0;
  return card.stock - heldOfCard(s, cardId);
}

export function carpetById(s: AppState, id: string): Carpet | undefined {
  return s.carpets.find((c) => c.id === id);
}

export function cardById(s: AppState, cardId: string): ColorCard | undefined {
  return s.cards.find((c) => c.id === cardId);
}

/**
 * 一行补线当前应显示的名称/色号：
 * 已快照（开工后）显示快照里的旧名称旧色号；草稿跟随色卡当前名称。
 */
export function lineDisplay(s: AppState, line: JobLine): {
  name: string;
  code: string;
  hex: string;
  renamed: boolean;
  missing: boolean;
} {
  const current = cardById(s, line.cardId);
  if (line.cardName !== undefined && line.cardCode !== undefined) {
    return {
      name: line.cardName,
      code: line.cardCode,
      hex: line.cardHex ?? "#9ca3af",
      renamed: current ? current.name !== line.cardName || current.code !== line.cardCode : false,
      missing: !current,
    };
  }
  if (current) {
    return { name: current.name, code: current.code, hex: current.hex, renamed: false, missing: false };
  }
  return { name: "（色卡已删除）", code: "—", hex: "#d1d5db", renamed: false, missing: true };
}

export function totalLength(job: Job): number {
  return job.lines.reduce((sum, l) => sum + l.length, 0);
}

export function originList(s: AppState): string[] {
  const set = new Set(s.carpets.map((c) => c.origin));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

// ---------- 变更动作 ----------

function addLedger(
  draft: AppState,
  entry: Omit<LedgerEntry, "id" | "at" | "cardName"> & { cardName?: string }
) {
  draft.ledger.push({
    id: uid("l"),
    at: Date.now(),
    cardName: entry.cardName ?? draft.cards.find((c) => c.id === entry.cardId)?.name ?? "未知色卡",
    ...entry,
  });
}

export interface CarpetDraft {
  origin: string;
  era: string;
  knotDensity: number | null;
  knotUnit: Carpet["knotUnit"];
  material: string;
  dye: string;
  damage: string;
  imageDataUrl: string | null;
  markers: Carpet["markers"];
  beforeNote: string;
  afterNote: string;
}

export const actions = {
  addCarpet(draft: CarpetDraft): { id: string; code: string } | { error: string } {
    let result: { id: string; code: string } | undefined;
    const err = commit((s) => {
      s.seqCarpet += 1;
      const code = `CAR-${s.seqCarpet}`;
      const id = uid("p");
      s.carpets.push({
        id,
        code,
        createdAt: Date.now(),
        ...draft,
      });
      result = { id, code };
    });
    return err ? { error: err } : result!;
  },

  updateCarpet(id: string, patch: Partial<CarpetDraft>): string | null {
    return commit((s) => {
      const c = s.carpets.find((x) => x.id === id);
      if (!c) throw new Error("档案不存在");
      Object.assign(c, patch);
    });
  },

  deleteCarpet(id: string): string | null {
    return commit((s) => {
      const active = s.jobs.some((j) => j.carpetId === id && (j.status === "draft" || j.status === "reserved"));
      if (active) throw new Error("该地毯还有草稿或在制工序，请先完工或撤单后再删除档案");
      s.carpets = s.carpets.filter((c) => c.id !== id);
    });
  },

  addCard(input: { name: string; code: string; hex: string; stock: number }): string | null {
    return commit((s) => {
      const name = input.name.trim();
      const code = input.code.trim();
      if (!name) throw new Error("请填写色名");
      if (!code) throw new Error("请填写色号");
      if (s.cards.some((c) => c.code === code)) throw new Error(`色号 ${code} 已存在`);
      const stock = Number(input.stock) || 0;
      if (stock < 0) throw new Error("初始库存不能为负");
      const card: ColorCard = {
        id: uid("c"),
        name,
        code,
        hex: input.hex,
        stock,
        createdAt: Date.now(),
      };
      s.cards.push(card);
      if (stock > 0) addLedger(s, { type: "in", cardId: card.id, stockDelta: stock, heldDelta: 0, note: "建卡入库" });
    });
  },

  /** 改名 / 换色号 / 改色块：只影响色卡自身与库存，已开工工序的快照不变 */
  updateCard(id: string, patch: Partial<Pick<ColorCard, "name" | "code" | "hex">>): string | null {
    return commit((s) => {
      const card = s.cards.find((c) => c.id === id);
      if (!card) throw new Error("色卡不存在");
      if (patch.code && patch.code !== card.code && s.cards.some((c) => c.id !== id && c.code === patch.code)) {
        throw new Error(`色号 ${patch.code} 已被其他色卡使用`);
      }
      if (patch.name !== undefined && !patch.name.trim()) throw new Error("色名不能为空");
      Object.assign(card, patch);
    });
  },

  /** 入库：增加账面库存 */
  restock(cardId: string, amount: number, note: string): string | null {
    return commit((s) => {
      if (!(amount > 0)) throw new Error("入库数量必须大于 0");
      const card = s.cards.find((c) => c.id === cardId);
      if (!card) throw new Error("色卡不存在");
      card.stock += amount;
      addLedger(s, {
        type: "in",
        cardId,
        stockDelta: amount,
        heldDelta: 0,
        note: note.trim() || "采购入库",
      });
    });
  },

  /** 盘点调整（盘亏传负值），不能把可用库存调成负数 */
  adjustStock(cardId: string, delta: number, note: string): string | null {
    return commit((s) => {
      if (!delta) throw new Error("调整数量不能为 0");
      const card = s.cards.find((c) => c.id === cardId);
      if (!card) throw new Error("色卡不存在");
      const available = card.stock - heldOfCard(s, cardId);
      if (available + delta < 0) {
        throw new Error(`可用余量仅 ${available} 米，无法盘亏 ${Math.abs(delta)} 米（在制占用不可盘亏）`);
      }
      card.stock += delta;
      addLedger(s, {
        type: "adjust",
        cardId,
        stockDelta: delta,
        heldDelta: 0,
        note: note.trim() || (delta > 0 ? "盘盈" : "盘亏"),
      });
    });
  },

  deleteCard(id: string): string | null {
    return commit((s) => {
      if (heldOfCard(s, id) > 0) throw new Error("该色卡有在制工序占用，不能删除");
      if (s.jobs.some((j) => j.status === "draft" && j.lines.some((l) => l.cardId === id))) {
        throw new Error("草稿工序仍在使用该色卡，请先改选其他补线");
      }
      s.cards = s.cards.filter((c) => c.id !== id);
    });
  },

  addJob(input: { carpetId: string; title: string; description: string; lines: JobLine[] }):
    | { id: string; code: string }
    | { error: string } {
    let result: { id: string; code: string } | undefined;
    const err = commit((s) => {
      if (!s.carpets.some((c) => c.id === input.carpetId)) throw new Error("请选择地毯档案");
      if (!input.title.trim()) throw new Error("请填写工序名称");
      const lines = input.lines.filter((l) => l.length > 0);
      if (lines.length === 0) throw new Error("请至少添加一条补线");
      for (const l of lines) {
        if (!s.cards.some((c) => c.id === l.cardId)) throw new Error("存在已删除的色卡，请重新选线");
      }
      s.seqJob += 1;
      const code = `GX-${pad(s.seqJob, 3)}`;
      const id = uid("j");
      s.jobs.push({
        id,
        code,
        carpetId: input.carpetId,
        title: input.title.trim(),
        description: input.description.trim(),
        status: "draft",
        lines,
        createdAt: Date.now(),
      });
      result = { id, code };
    });
    return err ? { error: err } : result!;
  },

  /** 草稿阶段可继续编辑（名称/色号跟随色卡实时显示，故不存快照） */
  updateJobDraft(
    id: string,
    patch: Partial<Pick<Job, "title" | "description" | "carpetId">> & { lines?: JobLine[] }
  ): string | null {
    return commit((s) => {
      const job = s.jobs.find((j) => j.id === id);
      if (!job) throw new Error("工序不存在");
      if (job.status !== "draft") throw new Error("只有草稿工序可以编辑");
      const lines = patch.lines ? patch.lines.filter((l) => l.length > 0) : job.lines;
      if (patch.lines && lines.length === 0) throw new Error("请至少保留一条补线");
      if (lines.some((l) => !s.cards.some((c) => c.id === l.cardId))) {
        throw new Error("存在已删除的色卡，请重新选线");
      }
      if (patch.carpetId && !s.carpets.some((c) => c.id === patch.carpetId)) throw new Error("地毯档案不存在");
      Object.assign(job, patch, { lines });
    });
  },

  deleteJob(id: string): string | null {
    return commit((s) => {
      const job = s.jobs.find((j) => j.id === id);
      if (!job) return;
      if (job.status === "reserved") throw new Error("在制工序不能直接删除，请先完工或撤单");
      s.jobs = s.jobs.filter((j) => j.id !== id);
    });
  },

  /** 开工占线：校验可用库存 → 锁定当时色名/色号/颜色 → 登记占用流水 */
  startJob(id: string): string | null {
    return commit((s) => {
      const job = s.jobs.find((j) => j.id === id);
      if (!job) throw new Error("工序不存在");
      if (job.status !== "draft") throw new Error("只有草稿工序可以开工");
      const lines = job.lines.filter((l) => l.length > 0);
      if (lines.length === 0) throw new Error("请至少添加一条补线");

      // 同一事务内按占用后口径逐行校验
      const tentative = heldByCard(s);
      for (const l of lines) {
        const card = s.cards.find((c) => c.id === l.cardId);
        if (!card) throw new Error("补线引用的色卡已删除，请重新选线");
        const alreadyHeld = tentative[card.id] ?? 0;
        if (alreadyHeld + l.length > card.stock) {
          throw new Error(
            `「${card.name} ${card.code}」可用余量 ${(card.stock - alreadyHeld).toFixed(1)} 米，本单需 ${l.length} 米，库存不足`
          );
        }
        tentative[card.id] = alreadyHeld + l.length;
      }

      // 锁定快照：此后色卡改名/换色号，旧工序仍显示这里的名称和色号
      for (const l of lines) {
        const card = s.cards.find((c) => c.id === l.cardId)!;
        l.cardName = card.name;
        l.cardCode = card.code;
        l.cardHex = card.hex;
      }
      job.status = "reserved";
      job.startedAt = Date.now();

      for (const l of lines) {
        addLedger(s, {
          type: "hold",
          cardId: l.cardId,
          stockDelta: 0,
          heldDelta: l.length,
          jobCode: job.code,
          note: `开工占线：${job.title}`,
        });
      }
    });
  },

  /** 完工扣库存：账面 stock 扣掉实际用量，同时释放占用 */
  completeJob(id: string, afterNote?: string): string | null {
    return commit((s) => {
      const job = s.jobs.find((j) => j.id === id);
      if (!job) throw new Error("工序不存在");
      if (job.status !== "reserved") throw new Error("只有在制工序可以完工");
      job.status = "done";
      job.finishedAt = Date.now();
      for (const l of job.lines) {
        const card = s.cards.find((c) => c.id === l.cardId);
        if (card) card.stock -= l.length;
        addLedger(s, {
          type: "consume",
          cardId: l.cardId,
          stockDelta: -l.length,
          heldDelta: -l.length,
          jobCode: job.code,
          note: `完工扣库存：${job.title}`,
        });
      }
      if (afterNote !== undefined) {
        const carpet = s.carpets.find((c) => c.id === job.carpetId);
        if (carpet) {
          carpet.afterNote = afterNote.trim();
        }
      }
    });
  },

  /** 撤单放回：不动账面库存，仅释放占用 */
  cancelJob(id: string, reason: string): string | null {
    return commit((s) => {
      const job = s.jobs.find((j) => j.id === id);
      if (!job) throw new Error("工序不存在");
      if (job.status !== "reserved") throw new Error("只有在制工序可以撤单");
      job.status = "cancelled";
      job.cancelledAt = Date.now();
      if (reason.trim()) job.description = `${job.description}（撤单原因：${reason.trim()}）`;
      for (const l of job.lines) {
        addLedger(s, {
          type: "release",
          cardId: l.cardId,
          stockDelta: 0,
          heldDelta: -l.length,
          jobCode: job.code,
          note: `撤单放回：${reason.trim() || job.title}`,
        });
      }
    });
  },

  resetAll(): string | null {
    return commit((s) => {
      const fresh = createSeedState();
      s.carpets = fresh.carpets;
      s.cards = fresh.cards;
      s.jobs = fresh.jobs;
      s.ledger = fresh.ledger;
      s.seqCarpet = fresh.seqCarpet;
      s.seqJob = fresh.seqJob;
    });
  },
};

// ---------- React 绑定 ----------

const StoreContext = createContext<{ subscribe: typeof subscribe; getState: () => AppState } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = { subscribe, getState: getSnapshot };
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): AppState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("StoreProvider missing");
  return useSyncExternalStore(ctx.subscribe, ctx.getState, ctx.getState);
}

export const ledgerTypeLabel: Record<LedgerType, string> = {
  in: "入库",
  hold: "占线",
  consume: "完工扣库",
  release: "撤单放回",
  adjust: "盘点调整",
};
