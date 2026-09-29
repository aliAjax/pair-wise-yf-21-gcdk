import { AppState, ColorCard, Carpet, Job, JobLine, LedgerEntry } from "./types";
import { sampleRugDataUrl, uid } from "./utils";

/** 2026 年本地时间戳，便于演示排序 */
function t(s: string): number {
  return new Date(s.replace(" ", "T")).getTime();
}

function line(
  cardId: string,
  length: number,
  snapshot?: { name: string; code: string; hex: string }
): JobLine {
  if (!snapshot) return { cardId, length };
  return { cardId, length, cardName: snapshot.name, cardCode: snapshot.code, cardHex: snapshot.hex };
}

export function createSeedState(): AppState {
  const c1 = uid("c");
  const c2 = uid("c");
  const c3 = uid("c");
  const c4 = uid("c");
  const c5 = uid("c");
  const p1 = uid("p");
  const p2 = uid("p");
  const p3 = uid("p");
  const p4 = uid("p");
  const j1 = uid("j");
  const j2 = uid("j");
  const j3 = uid("j");
  const j4 = uid("j");

  const cards: ColorCard[] = [
    { id: c1, name: "赭石暖红", code: "R-201", hex: "#9c3b1e", stock: 30, createdAt: t("2026-09-01 09:00") },
    { id: c2, name: "靛青", code: "B-102", hex: "#1f3a93", stock: 20, createdAt: t("2026-09-01 09:00") },
    { id: c3, name: "藤黄", code: "Y-203", hex: "#d4a017", stock: 18, createdAt: t("2026-09-01 09:00") },
    { id: c4, name: "核桃棕", code: "N-304", hex: "#6b4423", stock: 16, createdAt: t("2026-09-01 09:00") },
    { id: c5, name: "松石绿", code: "T-405", hex: "#0f766e", stock: 10, createdAt: t("2026-09-01 09:00") },
  ];

  const carpets: Carpet[] = [
    {
      id: p1,
      code: "CAR-092",
      origin: "波斯",
      era: "1960s",
      knotDensity: 36,
      knotUnit: "结/dm²",
      material: "羊毛",
      dye: "植物染",
      damage: "左侧边缘约 40cm 磨损脱线，边角一处小破洞",
      imageDataUrl: sampleRugDataUrl(1),
      markers: [
        { id: uid("m"), x: 14, y: 58 },
        { id: uid("m"), x: 19, y: 76 },
      ],
      beforeNote: "边缘绒头高低不齐，原有补线偏橙，需改用赭石暖红按原斜纹走向接结。",
      afterNote: "",
      createdAt: t("2026-09-02 10:20"),
    },
    {
      id: p2,
      code: "CAR-117",
      origin: "安纳托利亚",
      era: "1920s",
      knotDensity: 42,
      knotUnit: "kpsi",
      material: "羊毛",
      dye: "植物染",
      damage: "中心葵花纹样缺口约 8×6cm，缺经纬线",
      imageDataUrl: sampleRugDataUrl(2),
      markers: [
        { id: uid("m"), x: 50, y: 48 },
        { id: uid("m"), x: 53, y: 53 },
      ],
      beforeNote: "中心纹样棕线断裂，绿松石色勾边缺线，先重建经线再按双结法补织。",
      afterNote: "",
      createdAt: t("2026-09-05 14:00"),
    },
    {
      id: p3,
      code: "CAR-138",
      origin: "藏毯",
      era: "1980s",
      knotDensity: 52,
      knotUnit: "结/dm²",
      material: "羊毛",
      dye: "植物染",
      damage: "右下方局部褪色，约 20×20cm",
      imageDataUrl: sampleRugDataUrl(3),
      markers: [{ id: uid("m"), x: 72, y: 70 }],
      beforeNote: "褪色区域原为靛蓝地色，需低饱和度靛青补线，避免新线过跳。",
      afterNote: "09-15 完工：分两次染色对色，补结方向顺原纹，毯面平整，自然阴干后色差不明显。",
      createdAt: t("2026-09-08 11:30"),
    },
    {
      id: p4,
      code: "CAR-141",
      origin: "高加索",
      era: "1900s",
      knotDensity: 28,
      knotUnit: "kpsi",
      material: "羊毛（局部山羊毛经）",
      dye: "混合染",
      damage: "右上角虫蛀破洞 3×3cm，流苏短缺",
      imageDataUrl: sampleRugDataUrl(4),
      markers: [
        { id: uid("m"), x: 84, y: 16 },
        { id: uid("m"), x: 90, y: 10 },
      ],
      beforeNote: "客户曾计划补藤黄线，后改方案重做流苏，该单撤销。",
      afterNote: "撤单，占用线量已放回库存。",
      createdAt: t("2026-09-12 16:10"),
    },
  ];

  const jobs: Job[] = [
    {
      id: j1,
      code: "GX-001",
      carpetId: p1,
      title: "左边缘磨损补织",
      description: "沿斜纹走向补结赭石暖红，补后修平绒头。",
      status: "reserved",
      lines: [line(c1, 3, { name: "西红花红", code: "R-101", hex: "#a6401d" })],
      createdAt: t("2026-09-19 09:30"),
      startedAt: t("2026-09-20 08:40"),
    },
    {
      id: j2,
      code: "GX-002",
      carpetId: p2,
      title: "中心葵花纹样缺口重建",
      description: "重建经线，双结法补棕地与松石绿勾边。",
      status: "reserved",
      lines: [
        line(c4, 2.5, { name: "核桃棕", code: "N-304", hex: "#6b4423" }),
        line(c5, 4, { name: "松石绿", code: "T-405", hex: "#0f766e" }),
      ],
      createdAt: t("2026-09-21 15:00"),
      startedAt: t("2026-09-22 09:00"),
    },
    {
      id: j3,
      code: "GX-003",
      carpetId: p3,
      title: "靛蓝褪色区补线",
      description: "靛青补线分两批对色，顺原纹补结。",
      status: "done",
      lines: [line(c2, 5, { name: "洋靛", code: "B-018", hex: "#2747a8" })],
      createdAt: t("2026-09-09 10:00"),
      startedAt: t("2026-09-10 09:00"),
      finishedAt: t("2026-09-15 17:20"),
    },
    {
      id: j4,
      code: "GX-004",
      carpetId: p4,
      title: "右上角破洞补织（已撤）",
      description: "原计划藤黄补线，客户改做流苏方案。",
      status: "cancelled",
      lines: [line(c3, 2, { name: "槐黄", code: "Y-120", hex: "#c99a12" })],
      createdAt: t("2026-09-18 13:00"),
      startedAt: t("2026-09-19 09:10"),
      cancelledAt: t("2026-09-19 15:40"),
    },
  ];

  const ledger: LedgerEntry[] = [
    { id: uid("l"), at: t("2026-09-01 09:05"), type: "in", cardId: c1, cardName: "西红花红", stockDelta: 30, heldDelta: 0, note: "期初建卡入库" },
    { id: uid("l"), at: t("2026-09-01 09:05"), type: "in", cardId: c2, cardName: "洋靛", stockDelta: 25, heldDelta: 0, note: "期初建卡入库" },
    { id: uid("l"), at: t("2026-09-01 09:05"), type: "in", cardId: c3, cardName: "槐黄", stockDelta: 18, heldDelta: 0, note: "期初建卡入库" },
    { id: uid("l"), at: t("2026-09-01 09:05"), type: "in", cardId: c4, cardName: "核桃棕", stockDelta: 20, heldDelta: 0, note: "期初建卡入库" },
    { id: uid("l"), at: t("2026-09-01 09:05"), type: "in", cardId: c5, cardName: "松石绿", stockDelta: 12, heldDelta: 0, note: "期初建卡入库" },
    { id: uid("l"), at: t("2026-09-08 17:30"), type: "adjust", cardId: c5, cardName: "松石绿", stockDelta: -2, heldDelta: 0, note: "理库报损：两轴线受潮" },
    { id: uid("l"), at: t("2026-09-10 09:00"), type: "hold", cardId: c2, cardName: "洋靛", stockDelta: 0, heldDelta: 5, jobCode: "GX-003", note: "开工占线" },
    { id: uid("l"), at: t("2026-09-15 17:20"), type: "consume", cardId: c2, cardName: "洋靛", stockDelta: -5, heldDelta: -5, jobCode: "GX-003", note: "完工扣库存" },
    { id: uid("l"), at: t("2026-09-19 09:10"), type: "hold", cardId: c3, cardName: "槐黄", stockDelta: 0, heldDelta: 2, jobCode: "GX-004", note: "开工占线" },
    { id: uid("l"), at: t("2026-09-19 15:40"), type: "release", cardId: c3, cardName: "槐黄", stockDelta: 0, heldDelta: -2, jobCode: "GX-004", note: "撤单放回" },
    { id: uid("l"), at: t("2026-09-20 08:40"), type: "hold", cardId: c1, cardName: "西红花红", stockDelta: 0, heldDelta: 3, jobCode: "GX-001", note: "开工占线" },
    { id: uid("l"), at: t("2026-09-22 09:00"), type: "hold", cardId: c4, cardName: "核桃棕", stockDelta: 0, heldDelta: 2.5, jobCode: "GX-002", note: "开工占线" },
    { id: uid("l"), at: t("2026-09-22 09:00"), type: "hold", cardId: c5, cardName: "松石绿", stockDelta: 0, heldDelta: 4, jobCode: "GX-002", note: "开工占线" },
  ];

  return {
    carpets,
    cards,
    jobs,
    ledger,
    seqCarpet: 141,
    seqJob: 4,
  };
}
