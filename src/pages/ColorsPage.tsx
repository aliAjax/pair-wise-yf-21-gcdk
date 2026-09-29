import { useState } from "react";
import { availableQty, dispatch, reservedQty, useStoreState } from "../store";
import type { ColorCard } from "../types";
import { round2, uid } from "../utils";

const EMPTY: Omit<ColorCard, "id"> = { name: "", code: "", hex: "#8a5a3b", unit: "米", stock: 0 };

export default function ColorsPage() {
  const state = useStoreState();
  const [form, setForm] = useState<Omit<ColorCard, "id">>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Omit<ColorCard, "id">>(EMPTY);
  const [stockAdjust, setStockAdjust] = useState<Record<string, string>>({});

  const usage = (id: string) => {
    const jobs = state.jobs.filter((j) => j.colorCardId === id);
    return {
      active: jobs.filter((j) => j.status === "active").length,
      planned: jobs.filter((j) => j.status === "planned").length,
      done: jobs.filter((j) => j.status === "done").length,
      total: jobs.length,
    };
  };

  const addColor = () => {
    if (!form.name.trim()) return alert("请填写色卡名称。");
    if (!form.code.trim()) return alert("请填写色号。");
    if (state.colors.some((c) => c.code === form.code.trim()))
      return alert("色号已存在，请换一个。");
    dispatch({
      type: "addColor",
      color: {
        id: uid("col"),
        name: form.name.trim(),
        code: form.code.trim(),
        hex: form.hex,
        unit: form.unit.trim() || "米",
        stock: round2(form.stock || 0),
      },
    });
    setForm(EMPTY);
  };

  const startEdit = (c: ColorCard) => {
    setEditingId(c.id);
    setEditDraft({ name: c.name, code: c.code, hex: c.hex, unit: c.unit, stock: c.stock });
  };

  const saveEdit = (id: string) => {
    if (!editDraft.name.trim() || !editDraft.code.trim()) return alert("名称和色号不能为空。");
    if (
      state.colors.some(
        (c) => c.id !== id && c.code === editDraft.code.trim()
      )
    )
      return alert("色号与其他色卡重复。");
    // 改名 / 换色号只影响今后显示与库存；旧工序的快照保持不变
    dispatch({
      type: "updateColor",
      id,
      patch: {
        name: editDraft.name.trim(),
        code: editDraft.code.trim(),
        hex: editDraft.hex,
        unit: editDraft.unit.trim() || "米",
        stock: round2(editDraft.stock),
      },
    });
    setEditingId(null);
  };

  const applyStockIn = (c: ColorCard) => {
    const v = parseFloat(stockAdjust[c.id] ?? "");
    if (!Number.isFinite(v) || v === 0) return;
    dispatch({
      type: "updateColor",
      id: c.id,
      patch: { stock: round2(c.stock + v) }, // 负数即盘库下调
    });
    setStockAdjust((s) => ({ ...s, [c.id]: "" }));
  };

  return (
    <div className="colors-layout">
      <section className="panel">
        <div className="heading">
          <div>
            <p>材料色卡</p>
            <h2>补线库存</h2>
          </div>
        </div>
        <p className="rule-note">
          规则：工序「开工」先占线（占用量从可用里冻结，不动账面库存）；「完工」才扣减账面库存；「撤单」把占用量放回。
          色卡改名或换色号后，旧工序仍显示开单当时的名称、色号，库存始终按这张色卡继续算。
        </p>

        <div className="color-grid">
          {state.colors.map((c) => {
            const reserved = reservedQty(state, c.id);
            const avail = availableQty(state, c.id);
            const u = usage(c.id);
            const isEditing = editingId === c.id;
            return (
              <article key={c.id} className="color-card">
                {isEditing ? (
                  <div className="color-edit">
                    <div className="color-edit-head">
                      <input
                        type="color"
                        value={editDraft.hex}
                        onChange={(e) => setEditDraft((d) => ({ ...d, hex: e.target.value }))}
                      />
                      <button className="icon-btn small" onClick={() => setEditingId(null)}>
                        ×
                      </button>
                    </div>
                    <label>
                      <span>名称</span>
                      <input
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>色号</span>
                      <input
                        value={editDraft.code}
                        onChange={(e) => setEditDraft((d) => ({ ...d, code: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>单位</span>
                      <input
                        value={editDraft.unit}
                        onChange={(e) => setEditDraft((d) => ({ ...d, unit: e.target.value }))}
                      />
                    </label>
                    <label>
                      <span>账面库存（盘库直接改）</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editDraft.stock}
                        onChange={(e) => setEditDraft((d) => ({ ...d, stock: parseFloat(e.target.value) || 0 }))}
                      />
                    </label>
                    <button className="primary" onClick={() => saveEdit(c.id)}>
                      保存（旧工序名称色号不变）
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="color-head">
                      <i className="swatch xl" style={{ background: c.hex }} />
                      <div>
                        <h3>{c.name}</h3>
                        <p>{c.code}</p>
                      </div>
                      <button className="ghost-btn" onClick={() => startEdit(c)}>
                        改名 / 换号
                      </button>
                    </div>

                    <div className="stock-row">
                      <div>
                        <small>账面库存</small>
                        <b>{c.stock}</b> {c.unit}
                      </div>
                      <div className="reserved">
                        <small>占用中</small>
                        <b>{reserved}</b> {c.unit}
                      </div>
                      <div className="avail">
                        <small>可开单</small>
                        <b className={avail <= 0 ? "zero" : ""}>{avail}</b> {c.unit}
                      </div>
                    </div>
                    {reserved > 0 && (
                      <div className="reserve-bar">
                        <i style={{ width: `${Math.min(100, (reserved / Math.max(c.stock, 0.01)) * 100)}%` }} />
                      </div>
                    )}

                    <div className="stock-in-row">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="出入库 ±数量"
                        value={stockAdjust[c.id] ?? ""}
                        onChange={(e) => setStockAdjust((s) => ({ ...s, [c.id]: e.target.value }))}
                      />
                      <button onClick={() => applyStockIn(c)}>登记</button>
                    </div>

                    <p className="usage-line">
                      关联工序 {u.total} 单{u.total > 0 && `：占用中 ${u.active} · 待开工 ${u.planned} · 已完工 ${u.done}`}
                    </p>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel new-color">
        <div className="heading">
          <div>
            <p>新建色卡</p>
            <h2>补线入册</h2>
          </div>
        </div>
        <div className="new-color-form">
          <label>
            <span>色样</span>
            <input
              type="color"
              value={form.hex}
              onChange={(e) => setForm((f) => ({ ...f, hex: e.target.value }))}
            />
          </label>
          <label>
            <span>名称</span>
            <input
              value={form.name}
              placeholder="如：核桃皮棕"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            <span>色号</span>
            <input
              value={form.code}
              placeholder="如：HT-305"
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </label>
          <label>
            <span>单位</span>
            <input
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
          </label>
          <label>
            <span>初始库存</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: parseFloat(e.target.value) || 0 }))}
            />
          </label>
          <button className="primary block" onClick={addColor}>
            ＋ 加入色卡
          </button>
        </div>
      </section>
    </div>
  );
}
