/** 纹样局部标记点，坐标用 0~1 的相对比例，缩放不失真 */
export interface PatternMarker {
  id: string;
  x: number;
  y: number;
  note: string;
}

/** 地毯修复档案 */
export interface Carpet {
  id: string; // 内部 id
  code: string; // 档案编号 CAR-001
  origin: string; // 产地
  era: string; // 年代
  knotDensity: string; // 结密度
  material: string; // 材质
  dyeMethod: string; // 染色方式
  damageAreas: string; // 破损区域
  patternImage: string | null; // 纹样局部标记图（压缩后的 dataURL）
  markers: PatternMarker[]; // 图上标记
  beforeNote: string; // 修复前备注
  afterNote: string; // 修复后备注
  createdAt: number;
}

/** 材料色卡（补线） */
export interface ColorCard {
  id: string;
  name: string; // 当前名称（可改，不影响旧工序快照）
  code: string; // 当前色号（可改，不影响旧工序快照）
  hex: string; // 色样
  unit: string; // 计量单位：米 / 绞 / 支
  stock: number; // 账面库存
}

export type JobStatus = "planned" | "active" | "done" | "cancelled";

/** 修复工序（补线单） */
export interface Job {
  id: string;
  code: string; // 工序单号 GX-001
  carpetId: string; // 关联档案
  title: string; // 工序内容
  colorCardId: string; // 关联色卡，库存始终按此卡结算
  colorName: string; // 开单时的色卡名称快照
  colorCode: string; // 开单时的色号快照
  colorHex: string; // 开单时的色样快照
  unit: string; // 开单时的单位快照
  qty: number; // 补线数量
  status: JobStatus;
  note: string;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  cancelledAt: number | null;
}

export interface State {
  carpets: Carpet[];
  colors: ColorCard[];
  jobs: Job[];
}

export type Action =
  | { type: "addCarpet"; carpet: Carpet }
  | { type: "updateCarpet"; id: string; patch: Partial<Carpet> }
  | { type: "deleteCarpet"; id: string }
  | { type: "addColor"; color: ColorCard }
  | { type: "updateColor"; id: string; patch: Partial<ColorCard> }
  | { type: "addJob"; job: Job }
  | { type: "startJob"; id: string; at: number }
  | { type: "finishJob"; id: string; at: number }
  | { type: "cancelJob"; id: string; at: number }
  | { type: "resetSeed" };
