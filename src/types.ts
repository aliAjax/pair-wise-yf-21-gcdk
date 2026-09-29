// 业务领域模型

export type JobStatus = "draft" | "reserved" | "done" | "cancelled";

export type KnotUnit = "结/dm²" | "kpsi";

/** 纹样局部标记图上的一个破损标记点，坐标为相对图片的百分比 */
export interface Marker {
  id: string;
  x: number;
  y: number;
}

/** 地毯档案 */
export interface Carpet {
  id: string;
  /** 档案编号，如 CAR-139 */
  code: string;
  /** 产地 */
  origin: string;
  /** 年代，如 1960s */
  era: string;
  /** 结密度数值 */
  knotDensity: number | null;
  knotUnit: KnotUnit;
  /** 材质 */
  material: string;
  /** 染色方式：植物染 / 化学染 / 混合染 */
  dye: string;
  /** 破损区域描述 */
  damage: string;
  /** 纹样局部图（压缩后的 dataURL） */
  imageDataUrl: string | null;
  markers: Marker[];
  /** 修复前备注 */
  beforeNote: string;
  /** 修复后备注 */
  afterNote: string;
  createdAt: number;
}

/** 材料色卡（补线）。stock 为账面库存量（米），含在制工序的占用量 */
export interface ColorCard {
  id: string;
  /** 色名，可随时修改 */
  name: string;
  /** 色号，可随时换号 */
  code: string;
  /** 颜色（用于色块展示） */
  hex: string;
  /** 账面库存（米）= 可用余量 + 在制占用 */
  stock: number;
  createdAt: number;
}

/**
 * 工序补线明细。
 * 草稿阶段只存 cardId + length，名称/色号随色卡实时显示；
 * 开工（占线）时把当时的色名、色号、颜色快照锁进本行，
 * 此后色卡改名/换色号不影响旧工序显示，库存仍按 cardId 结算。
 */
export interface JobLine {
  cardId: string;
  /** 用量（米） */
  length: number;
  cardName?: string;
  cardCode?: string;
  cardHex?: string;
}

/** 修复工序（单据） */
export interface Job {
  id: string;
  /** 工序单号，如 GX-006 */
  code: string;
  carpetId: string;
  title: string;
  description: string;
  status: JobStatus;
  lines: JobLine[];
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  cancelledAt?: number;
}

export type LedgerType = "in" | "hold" | "consume" | "release" | "adjust";

/** 库存流水：stockDelta 影响账面库存，heldDelta 影响在制占用 */
export interface LedgerEntry {
  id: string;
  at: number;
  type: LedgerType;
  cardId: string;
  /** 记账时色名快照，色卡后来改名也不影响流水 */
  cardName: string;
  stockDelta: number;
  heldDelta: number;
  jobCode?: string;
  note?: string;
}

export interface AppState {
  carpets: Carpet[];
  cards: ColorCard[];
  jobs: Job[];
  ledger: LedgerEntry[];
  seqCarpet: number;
  seqJob: number;
}
