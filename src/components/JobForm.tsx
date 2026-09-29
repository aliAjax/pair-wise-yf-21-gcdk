import { useState } from "react";
import { Job, JobLine } from "../types";
import { actions, availableOfCard, cardById, useStore } from "../store";
import { Field } from "./Modal";
import { useToast } from "./Toast";

export function JobForm({
  presetCarpetId,
  editing,
  onClose,
}: {
  presetCarpetId?: string;
  editing?: Job;
  onClose: () => void;
}) {
  const s = useStore();
  const notify = useToast();

  const [carpetId, setCarpetId] = useState(editing?.carpetId ?? presetCarpetId ?? s.carpets[0]?.id ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [lines, setLines] = useState<JobLine[]>(
    editing?.lines.map((l) => ({ cardId: l.cardId, length: l.length })) ?? [{ cardId: "", length: 0 }]
  );

  function patchLine(i: number, patch: Partial<JobLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { cardId: "", length: 0 }]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function save() {
    const validLines = lines.filter((l) => l.cardId && l.length > 0);
    const payload = {
      carpetId,
      title: title.trim(),
      description: description.trim(),
      lines: validLines,
    };
    if (editing) {
      const err = actions.updateJobDraft(editing.id, payload);
      if (err) return notify(err, "error");
      notify(`草稿 ${editing.code} 已保存`);
    } else {
      const res = actions.addJob(payload);
      if ("error" in res) return notify(res.error, "error");
      notify(`草稿工序 ${res.code} 已建立，开工后将先占用补线`);
    }
    onClose();
  }

  return (
    <div className="form-grid">
      <Field label="所属地毯" required>
        <select className="ctrl" value={carpetId} onChange={(e) => setCarpetId(e.target.value)}>
          {s.carpets
            .slice()
            .sort((a, b) => a.code.localeCompare(b.code))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.origin} · {c.era}
              </option>
            ))}
        </select>
      </Field>

      <Field label="工序名称" required>
        <input
          className="ctrl"
          value={title}
          placeholder="如 左边缘磨损补织、中心纹样缺口重建"
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <div className="form-full">
        <Field label="工序说明">
          <textarea
            className="ctrl"
            rows={2}
            value={description}
            placeholder="补结方向、对色批次、客户要求等"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </div>

      <div className="form-full">
        <span className="field-label">
          补线选择<em>*</em>
        </span>
        <small className="field-hint block-hint">
          草稿阶段色名/色号跟随色卡显示；点「开工占线」时锁定当时的名称与色号，之后色卡改名换号不影响本工序，库存始终按所选色卡结算。
        </small>
        <div className="line-picker">
          <div className="line-row line-row-head">
            <span>材料色卡</span>
            <span>用量（米）</span>
            <span>当前可用</span>
            <span />
          </div>
          {lines.map((l, i) => {
            const card = l.cardId ? cardById(s, l.cardId) : undefined;
            const available = l.cardId ? availableOfCard(s, l.cardId) : 0;
            const over = card ? l.length > available : false;
            return (
              <div className="line-row" key={i}>
                <select className="ctrl" value={l.cardId} onChange={(e) => patchLine(i, { cardId: e.target.value })}>
                  <option value="">— 从色卡选择补线 —</option>
                  {s.cards
                    .slice()
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.name}
                      </option>
                    ))}
                </select>
                <input
                  className="ctrl"
                  type="number"
                  min={0}
                  step="0.5"
                  value={l.length || ""}
                  placeholder="0"
                  onChange={(e) => patchLine(i, { length: Number(e.target.value) })}
                />
                <span className={`line-avail ${over ? "over" : ""}`}>
                  {card ? (
                    <>
                      <i className="swatch" style={{ background: card.hex }} />
                      {available.toFixed(1)} 米{over && " · 不足"}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  aria-label="删除本行"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button type="button" className="ghost-btn add-line-btn" onClick={addLine}>
            ＋ 再选一种补线
          </button>
        </div>
      </div>

      <div className="form-actions form-full">
        <button type="button" onClick={onClose}>
          取消
        </button>
        <button type="button" className="primary" onClick={save}>
          {editing ? "保存草稿" : "存为草稿"}
        </button>
      </div>
    </div>
  );
}
