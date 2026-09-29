import { useMemo, useState } from "react";
import {
  availableQty,
  dispatch,
  snapshotColor,
  useStoreState,
} from "../store";
import type { JobStatus } from "../types";
import { fmtDate, nextSeqCode, round2, uid } from "../utils";

const STATUS_LABEL: Record<JobStatus, string> = {
  planned: "待开工",
  active: "占用中",
  done: "已完工",
  cancelled: "已撤单",
};

const STATUS_TABS: Array<{ key: JobStatus | "all"; label: string }> = [
  { key: "all", label: "全部" },
  { key: "planned", label: "待开工" },
  { key: "active", label: "占用中" },
  { key: "done", label: "已完工" },
  { key: "cancelled", label: "已撤单" },
];

export default function JobsPage() {
  const state = useStoreState();
  const [tab, setTab] = useState<JobStatus | "all">("all");

  // 新工序表单
  const [carpetId, setCarpetId] = useState(state.carpets[0]?.id ?? "");
  const [colorId, setColorId] = useState(state.colors[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  const carpetName = (id: string) => {
    const c = state.carpets.find((x) => x.id === id);
    return c ? `${c.code} · ${c.origin}` : "档案已删除";
  };

  const selectedColor = state.colors.find((c) => c.id === colorId);
  const selectedAvail = colorId ? availableQty(state, colorId) : 0;

  const createJob = () => {
    const q = parseFloat(qty);
    if (!carpetId) return alert("请选择要修复的地毯档案。");
    if (!selectedColor) return alert("请选择补线色卡。");
    if (!title.trim()) return alert("请填写工序内容。");
    if (!Number.isFinite(q) || q <= 0) return alert("补线数量需为大于 0 的数字。");
    if (q > selectedAvail)
      return alert(`可用量不足：${selectedColor.name} 仅剩 ${selectedAvail} ${selectedColor.unit}（库存 ${selectedColor.stock}，已占用 ${round2(selectedColor.stock - selectedAvail)}）。`);

    const job = {
      id: uid("job"),
      code: nextSeqCode(
        "GX",
        state.jobs.map((j) => j.code)
      ),
      carpetId,
      title: title.trim(),
      colorCardId: selectedColor.id,
      ...snapshotColor(selectedColor), // 开单瞬间的名称/色号快照
      qty: round2(q),
      status: "planned" as const,
      note: note.trim(),
      createdAt: Date.now(),
      startedAt: null,
      finishedAt: null,
      cancelledAt: null,
    };
    dispatch({ type: "addJob", job });
    setTitle("");
    setQty("1");
    setNote("");
  };

  const shown = useMemo(
    () =>
      [...state.jobs]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((j) => tab === "all" || j.status === tab),
    [state.jobs, tab]
  );

  const countOf = (s: JobStatus) => state.jobs.filter((j) => j.status === s).length;

  return (
    <div className="jobs-layout">
      <section className="panel new-job">
        <div className="heading">
          <div>
            <p>新增工序</p>
            <h2>开补线单</h2>
          </div>
        </div>
        <div className="field-grid">
          <label>
            <span>修复地毯</span>
            <select value={carpetId} onChange={(e) => setCarpetId(e.target.value)}>
              {state.carpets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.origin} · {c.damageAreas.slice(0, 12) || "无破损描述"}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>工序内容</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：边缘补线锁边" />
          </label>
          <label>
            <span>补线色卡（从材料色卡选择）</span>
            <select value={colorId} onChange={(e) => setColorId(e.target.value)}>
              {state.colors.map((c) => {
                const av = availableQty(state, c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}（{c.code}）库存 {c.stock} {c.unit}｜可用 {av} {c.unit}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            <span>
              占用数量（{selectedColor?.unit ?? "—"}）· 可用 {selectedAvail}
            </span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
          <label className="full">
            <span>工序备注</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="纹样走势、顺毛方向、配比等" />
          </label>
        </div>
        {selectedColor && (
          <div className="stock-hint">
            <i className="swatch" style={{ background: selectedColor.hex }} />
            选中 <b>{selectedColor.name}</b>（色号 {selectedColor.code}）：
            账面库存 {selectedColor.stock} {selectedColor.unit}，
            占用中 {round2(selectedColor.stock - selectedAvail)} {selectedColor.unit}，
            <b> 可开单 {selectedAvail} {selectedColor.unit}</b>。
            开单后为「待开工」，开工即占线，完工才真正扣库存。
          </div>
        )}
        <button className="primary" onClick={createJob} disabled={state.carpets.length === 0}>
          ＋ 开补线单
        </button>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>工序进度</p>
            <h2>补线单台账</h2>
          </div>
        </div>
        <div className="status-tabs">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "on" : ""}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key !== "all" && <em> {countOf(t.key as JobStatus)}</em>}
            </button>
          ))}
        </div>

        <div className="job-list">
          {shown.map((j) => {
            const colorNow = state.colors.find((c) => c.id === j.colorCardId);
            const drift =
              colorNow && (colorNow.name !== j.colorName || colorNow.code !== j.colorCode);
            return (
              <article key={j.id} className={`job-card st-${j.status}`}>
                <div className="job-main">
                  <div className="job-title-row">
                    <h3>{j.code}</h3>
                    <span className={`status-badge ${j.status}`}>{STATUS_LABEL[j.status]}</span>
                  </div>
                  <p className="job-carpet">{carpetName(j.carpetId)} — {j.title}</p>

                  <div className="job-color">
                    <i className="swatch lg" style={{ background: j.colorHex }} title="开单时色样" />
                    <div>
                      <p>
                        开单用色：<b>{j.colorName}</b> · 色号 <b>{j.colorCode}</b>
                        <span className="qty-pill">
                          {j.qty} {j.unit}
                        </span>
                      </p>
                      {colorNow ? (
                        drift ? (
                          <p className="drift-warn">
                            ⚠ 色卡已改名为「{colorNow.name}」/ 色号「{colorNow.code}」——
                            本单保留开单时名称与色号；{j.status === "active" ? "完工时库存仍按这张色卡扣减。" : "库存按新色卡结算。"}
                          </p>
                        ) : (
                          <p className="drift-ok">色卡现用名与开单时一致，库存按此卡结算。</p>
                        )
                      ) : (
                        <p className="drift-warn">⚠ 对应色卡已被移除，库存无法继续结算。</p>
                      )}
                    </div>
                  </div>

                  {j.note && <p className="job-note">备注：{j.note}</p>}
                  <p className="job-time">
                    开单 {fmtDate(j.createdAt)}
                    {j.startedAt && <> · 开工 {fmtDate(j.startedAt)}</>}
                    {j.finishedAt && <> · 完工 {fmtDate(j.finishedAt)}</>}
                    {j.cancelledAt && <> · 撤单 {fmtDate(j.cancelledAt)}</>}
                  </p>
                </div>

                <div className="job-actions">
                  {j.status === "planned" && (
                    <>
                      <button
                        className="primary"
                        onClick={() => {
                          if (availableQty(state, j.colorCardId) < j.qty) {
                            const c = state.colors.find((x) => x.id === j.colorCardId);
                            alert(`可用量不足，无法开工：${c?.name ?? "该色卡"} 仅剩 ${availableQty(state, j.colorCardId)} ${j.unit}。`);
                            return;
                          }
                          dispatch({ type: "startJob", id: j.id, at: Date.now() });
                        }}
                      >
                        开工（占线 {j.qty} {j.unit}）
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm(`确定撤单 ${j.code}？该单尚未占线，直接标记已撤单。`))
                            dispatch({ type: "cancelJob", id: j.id, at: Date.now() });
                        }}
                      >
                        撤单
                      </button>
                    </>
                  )}
                  {j.status === "active" && (
                    <>
                      <button
                        className="primary"
                        onClick={() => {
                          if (confirm(`确认完工？将从「${colorNow?.name ?? j.colorName}」账面库存扣减 ${j.qty} ${j.unit}。`))
                            dispatch({ type: "finishJob", id: j.id, at: Date.now() });
                        }}
                      >
                        完工（扣库存 {j.qty} {j.unit}）
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm(`确定撤单 ${j.code}？占用的 ${j.qty} ${j.unit} 将放回可用库存。`))
                            dispatch({ type: "cancelJob", id: j.id, at: Date.now() });
                        }}
                      >
                        撤单（放回占用）
                      </button>
                    </>
                  )}
                  {(j.status === "done" || j.status === "cancelled") && (
                    <span className="archived-note">
                      {j.status === "done" ? "库存已扣减，单据封存。" : "占用已释放，单据封存。"}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
          {shown.length === 0 && <div className="empty-tip">当前状态下暂无工序。</div>}
        </div>
      </section>
    </div>
  );
}
