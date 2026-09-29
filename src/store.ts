import { useSyncExternalStore } from "react";
import type { Action, ColorCard, Job, State } from "./types";
import { round2 } from "./utils";

const STORAGE_KEY = "rug-restudio-state-v2";

/**
 * 初始种子数据：
 * 靛青这张卡特意与 GX-002 的快照不一致（旧名“藏青”、旧号 T-07），
 * 用来演示“色卡改名换号后，旧工序仍显示当时名称色号，库存按新卡继续算”。
 */
const SEED: State = {
  carpets: [
    {
      id: "car_car001",
      code: "CAR-001",
      origin: "波斯",
      era: "约1960s",
      knotDensity: "42 结/平方分米",
      material: "羊毛（经线棉）",
      dyeMethod: "植物染",
      damageAreas: "左侧边缘约 30cm 磨损，流苏断裂，需补线锁边",
      patternImage: null,
      markers: [],
      beforeNote: "边缘绒头磨平，基底尚完整；颜色以茜草红为主，褪色轻微。",
      afterNote: "",
      createdAt: Date.now() - 86400000 * 12,
    },
    {
      id: "car_car002",
      code: "CAR-002",
      origin: "安纳托利亚",
      era: "约1930s",
      knotDensity: "36 结/平方分米",
      material: "羊毛",
      dyeMethod: "植物染为主，局部后补化学染",
      damageAreas: "中心葵花纹样缺口约掌心大，右下角有虫蛀小洞两处",
      patternImage: null,
      markers: [],
      beforeNote: "中心纹样黄色系线缺失，需按残留纹样推断走势后补织。",
      afterNote: "",
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: "car_car003",
      code: "CAR-003",
      origin: "藏毯",
      era: "约1980s",
      knotDensity: "28 结/平方分米",
      material: "羊毛，牦牛绒包边",
      dyeMethod: "矿物染",
      damageAreas: "上部蓝底局部褪色发白，约 20×15cm",
      patternImage: null,
      markers: [],
      beforeNote: "靛蓝褪色区色差明显，已取色样与色卡比对。",
      afterNote: "已用靛青按原纹重织，顺毛方向一致，色差在可接受范围。",
      createdAt: Date.now() - 86400000 * 30,
    },
  ],
  colors: [
    { id: "col_madder", name: "茜草红", code: "XH-101", hex: "#9c3b2e", unit: "米", stock: 120 },
    { id: "col_pomegranate", name: "石榴皮黄", code: "XH-204", hex: "#c9962f", unit: "米", stock: 85 },
    { id: "col_indigo", name: "靛青", code: "IND-031", hex: "#26355d", unit: "米", stock: 46 },
    { id: "col_white", name: "羊毛本白", code: "WB-010", hex: "#e8e1d2", unit: "米", stock: 200 },
    { id: "col_turquoise", name: "松石绿", code: "FQ-512", hex: "#0f766e", unit: "米", stock: 30 },
  ],
  jobs: [
    {
      id: "job_gx001",
      code: "GX-001",
      carpetId: "car_car001",
      title: "左边缘补线锁边",
      colorCardId: "col_madder",
      colorName: "茜草红",
      colorCode: "XH-101",
      colorHex: "#9c3b2e",
      unit: "米",
      qty: 8,
      status: "active",
      note: "开工已占线，沿边缘顺经线补织。",
      createdAt: Date.now() - 86400000 * 3,
      startedAt: Date.now() - 86400000 * 3,
      finishedAt: null,
      cancelledAt: null,
    },
    {
      id: "job_gx002",
      code: "GX-002",
      carpetId: "car_car003",
      title: "上部褪色区重织",
      colorCardId: "col_indigo",
      // 开单当时的快照：藏青 / T-07（色卡后来改名为靛青、换号 IND-031）
      colorName: "藏青",
      colorCode: "T-07",
      colorHex: "#2a3a63",
      unit: "米",
      qty: 10,
      status: "done",
      note: "完工时库存已按色卡扣减。",
      createdAt: Date.now() - 86400000 * 20,
      startedAt: Date.now() - 86400000 * 19,
      finishedAt: Date.now() - 86400000 * 15,
      cancelledAt: null,
    },
    {
      id: "job_gx003",
      code: "GX-003",
      carpetId: "car_car002",
      title: "中心葵花缺口补织",
      colorCardId: "col_pomegranate",
      colorName: "石榴皮黄",
      colorCode: "XH-204",
      colorHex: "#c9962f",
      unit: "米",
      qty: 6,
      status: "planned",
      note: "待开工；纹样走势已与匠人确认。",
      createdAt: Date.now() - 86400000 * 1,
      startedAt: null,
      finishedAt: null,
      cancelledAt: null,
    },
  ],
};

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed && Array.isArray(parsed.carpets) && Array.isArray(parsed.colors) && Array.isArray(parsed.jobs)) {
        // 兼容旧数据：补齐档案编号
        parsed.carpets = parsed.carpets.map((c, i) => ({
          ...c,
          code: c.code ?? `CAR-${String(i + 1).padStart(3, "0")}`,
        }));
        return parsed;
      }
    }
  } catch {
    // 存储不可用时退回内存数据
  }
  return SEED;
}

let state: State = load();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 超出配额（通常是图片过大）时只保留内存态
  }
}

/** 某色卡当前被“占用中”工序占住的数量：完工前不动账面库存，但别人不能再领走 */
export function reservedQty(state: State, colorCardId: string): number {
  return round2(
    state.jobs
      .filter((j) => j.colorCardId === colorCardId && j.status === "active")
      .reduce((sum, j) => sum + j.qty, 0)
  );
}

/** 可开新工的余量 = 账面库存 − 占用 */
export function availableQty(state: State, colorCardId: string): number {
  const c = state.colors.find((x) => x.id === colorCardId);
  if (!c) return 0;
  return round2(c.stock - reservedQty(state, colorCardId));
}

function reducer(prev: State, action: Action): State {
  switch (action.type) {
    case "addCarpet":
      return { ...prev, carpets: [action.carpet, ...prev.carpets] };

    case "updateCarpet":
      return {
        ...prev,
        carpets: prev.carpets.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };

    case "deleteCarpet":
      return {
        ...prev,
        carpets: prev.carpets.filter((c) => c.id !== action.id),
        // 关联工序保留（可在工序页撤单），避免误删档案直接抹掉占线记录
        jobs: prev.jobs,
      };

    case "addColor":
      return { ...prev, colors: [...prev.colors, action.color] };

    case "updateColor":
      return {
        ...prev,
        // 只改当前色卡；旧工序上的 colorName/colorCode 快照不受影响
        colors: prev.colors.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
      };

    case "addJob":
      return { ...prev, jobs: [action.job, ...prev.jobs] };

    case "startJob": {
      // 开工占线：不扣库存，只把工序置为占用中；余量不足则拒绝
      const job = prev.jobs.find((j) => j.id === action.id);
      if (!job || job.status !== "planned") return prev;
      if (availableQty(prev, job.colorCardId) < job.qty) return prev;
      return {
        ...prev,
        jobs: prev.jobs.map((j) =>
          j.id === action.id ? { ...j, status: "active", startedAt: action.at } : j
        ),
      };
    }

    case "finishJob": {
      // 完工扣库存：把占用中的数量从色卡账面库存真正扣掉
      const job = prev.jobs.find((j) => j.id === action.id);
      if (!job || job.status !== "active") return prev;
      const color = prev.colors.find((c) => c.id === job.colorCardId);
      if (!color) return prev;
      const newStock = round2(color.stock - job.qty);
      if (newStock < 0) return prev;
      return {
        ...prev,
        colors: prev.colors.map((c) =>
          c.id === color.id ? { ...c, stock: newStock } : c
        ),
        jobs: prev.jobs.map((j) =>
          j.id === action.id ? { ...j, status: "done", finishedAt: action.at } : j
        ),
      };
    }

    case "cancelJob": {
      // 撤单：占用中的工序退出占用（占用量自动放回），待开工的直接取消
      const job = prev.jobs.find((j) => j.id === action.id);
      if (!job || (job.status !== "planned" && job.status !== "active")) return prev;
      return {
        ...prev,
        jobs: prev.jobs.map((j) =>
          j.id === action.id
            ? { ...j, status: "cancelled", cancelledAt: action.at }
            : j
        ),
      };
    }

    case "resetSeed":
      return SEED;

    default:
      return prev;
  }
}

export function dispatch(action: Action) {
  state = reducer(state, action);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );
}

export function useStoreState(): State {
  return useStore((s) => s);
}

/** 新建工序时取色卡当时的名称/色号做快照 */
export function snapshotColor(c: ColorCard): Pick<Job, "colorName" | "colorCode" | "colorHex" | "unit"> {
  return { colorName: c.name, colorCode: c.code, colorHex: c.hex, unit: c.unit };
}
