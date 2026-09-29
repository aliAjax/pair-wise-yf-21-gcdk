import { useState } from "react";
import { Carpet } from "../types";
import { actions, CarpetDraft } from "../store";
import { DYE_OPTIONS, ORIGIN_OPTIONS } from "../utils";
import { Field } from "./Modal";
import { MarkerEditor } from "./MarkerEditor";
import { useToast } from "./Toast";

function blankDraft(): CarpetDraft {
  return {
    origin: ORIGIN_OPTIONS[0],
    era: "",
    knotDensity: null,
    knotUnit: "结/dm²",
    material: "羊毛",
    dye: DYE_OPTIONS[0],
    damage: "",
    imageDataUrl: null,
    markers: [],
    beforeNote: "",
    afterNote: "",
  };
}

function draftFromCarpet(c: Carpet): CarpetDraft {
  const { origin, era, knotDensity, knotUnit, material, dye, damage, imageDataUrl, markers, beforeNote, afterNote } = c;
  return { origin, era, knotDensity, knotUnit, material, dye, damage, imageDataUrl, markers, beforeNote, afterNote };
}

export function CarpetForm({
  editing,
  onClose,
  onSaved,
}: {
  editing?: Carpet;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const notify = useToast();
  // 组件随模态框打开而挂载、关闭而卸载，初始值直接取自当前编辑对象即可
  const [draft, setDraft] = useState<CarpetDraft>(() => (editing ? draftFromCarpet(editing) : blankDraft()));
  const [originMode, setOriginMode] = useState<"pick" | "custom">(
    editing && !ORIGIN_OPTIONS.includes(editing.origin as (typeof ORIGIN_OPTIONS)[number]) ? "custom" : "pick"
  );

  function set<K extends keyof CarpetDraft>(k: K, v: CarpetDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function save() {
    if (!draft.origin.trim()) return notify("请填写产地", "error");
    if (!draft.era.trim()) return notify("请填写年代", "error");
    if (!draft.material.trim()) return notify("请填写材质", "error");
    const payload: CarpetDraft = {
      ...draft,
      origin: draft.origin.trim(),
      era: draft.era.trim(),
      material: draft.material.trim(),
    };
    if (editing) {
      const err = actions.updateCarpet(editing.id, payload);
      if (err) return notify(err, "error");
      notify("档案已更新");
      onSaved(editing.id);
    } else {
      const res = actions.addCarpet(payload);
      if ("error" in res) return notify(res.error, "error");
      notify(`档案 ${res.code} 已建立`);
      onSaved(res.id);
    }
    onClose();
  }

  return (
    <div className="form-grid">
      <Field label="地毯产地" required>
        {originMode === "pick" ? (
          <div className="col-gap">
            <select className="ctrl" value={draft.origin} onChange={(e) => set("origin", e.target.value)}>
              {ORIGIN_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <button type="button" className="link-btn" onClick={() => setOriginMode("custom")}>
              产地不在列表？手填
            </button>
          </div>
        ) : (
          <div className="col-gap">
            <input
              className="ctrl"
              value={draft.origin}
              placeholder="如：波斯克尔曼"
              onChange={(e) => set("origin", e.target.value)}
            />
            <button type="button" className="link-btn" onClick={() => setOriginMode("pick")}>
              改回常用产地
            </button>
          </div>
        )}
      </Field>

      <Field label="年代" required>
        <input
          className="ctrl"
          value={draft.era}
          placeholder="如 1920s / 清末 / 约1960年"
          onChange={(e) => set("era", e.target.value)}
        />
      </Field>

      <Field label="结密度" hint="单位面积结数，古董毯常用 kpsi">
        <div className="inline-gap">
          <input
            className="ctrl"
            type="number"
            min={0}
            step="0.1"
            value={draft.knotDensity ?? ""}
            placeholder="数值"
            onChange={(e) => set("knotDensity", e.target.value === "" ? null : Number(e.target.value))}
          />
          <select
            className="ctrl narrow"
            value={draft.knotUnit}
            onChange={(e) => set("knotUnit", e.target.value as Carpet["knotUnit"])}
          >
            <option>结/dm²</option>
            <option>kpsi</option>
          </select>
        </div>
      </Field>

      <Field label="材质" required>
        <input
          className="ctrl"
          value={draft.material}
          placeholder="如 羊毛 / 丝 / 羊毛（棉经）"
          onChange={(e) => set("material", e.target.value)}
        />
      </Field>

      <Field label="染色方式" required>
        <select className="ctrl" value={draft.dye} onChange={(e) => set("dye", e.target.value)}>
          {DYE_OPTIONS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>

      <Field label="破损区域" required>
        <input
          className="ctrl"
          value={draft.damage}
          placeholder="如 中心纹样缺口、左边缘 40cm 磨损"
          onChange={(e) => set("damage", e.target.value)}
        />
      </Field>

      <div className="form-full">
        <Field label="纹样局部标记图">
          <MarkerEditor
            image={draft.imageDataUrl}
            markers={draft.markers}
            onNotify={notify}
            onChange={(next) => {
              set("imageDataUrl", next.imageDataUrl);
              set("markers", next.markers);
            }}
          />
        </Field>
      </div>

      <div className="form-full">
        <Field label="修复前备注">
          <textarea
            className="ctrl"
            rows={3}
            value={draft.beforeNote}
            placeholder="原线材质、褪色情况、纹样走向、对色要求等"
            onChange={(e) => set("beforeNote", e.target.value)}
          />
        </Field>
      </div>

      {editing && (
        <div className="form-full">
          <Field label="修复后备注" hint="完工后回填，也可在工序完工时填写">
            <textarea
              className="ctrl"
              rows={3}
              value={draft.afterNote}
              placeholder="补结方法、对色结果、客户验收情况等"
              onChange={(e) => set("afterNote", e.target.value)}
            />
          </Field>
        </div>
      )}

      <div className="form-actions form-full">
        <button type="button" onClick={onClose}>
          取消
        </button>
        <button type="button" className="primary" onClick={save}>
          {editing ? "保存修改" : "建立档案"}
        </button>
      </div>
    </div>
  );
}
