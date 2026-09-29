import { useState } from "react";
import { Job, JobStatus } from "../types";
import {
  actions,
  carpetById,
  lineDisplay,
  totalLength,
  useStore,
} from "../store";
import { formatDate } from "../utils";
import { Modal } from "../components/Modal";
import { JobForm } from "../components/JobForm";
import { useToast } from "../components/Toast";

const columns: { status: JobStatus; title: string; hint: string }[] = [
  { status: "draft", title: "草稿", hint: "未占用库存，可随意改线" },
  { status: "reserved", title: "在制（已占线）", hint: "补线已预留，尚未扣库存" },
  { status: "done", title: "已完工", hint: "用量已从库存扣除" },
  { status: "cancelled", title: "已撤单", hint: "占用量已放回库存" },
];

export function JobsPage({
  presetCarpetId,
  onPresetConsumed,
}: {
  presetCarpetId?: string;
  onPresetConsumed?: () => void;
}) {
  const s = useStore();
  const notify = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Job | undefined>(undefined);
  const [completeTarget, setCompleteTarget] = useState<Job | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Job | null>(null);
  const [afterNote, setAfterNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  function openNewForm() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    onPresetConsumed?.();
  }

  function start(job: Job) {
    const err = actions.startJob(job.id);
    if (err) return notify(err, "error");
    notify(`${job.code} 已开工，补线占用成功（可在色卡页查看占用量）`);
  }

  function openComplete(job: Job) {
    const carpet = carpetById(s, job.carpetId);
    setAfterNote(carpet?.afterNote ?? "");
    setCompleteTarget(job);
  }
  function confirmComplete() {
    if (!completeTarget) return;
    const err = actions.completeJob(completeTarget.id, afterNote);
    if (err) return notify(err, "error");
    notify(`${completeTarget.code} 完工，扣减库存 ${totalLength(completeTarget)} 米`);
    setCompleteTarget(null);
  }

  function openCancel(job: Job) {
    setCancelReason("");
    setCancelTarget(job);
  }
  function confirmCancel() {
    if (!cancelTarget) return;
    const err = actions.cancelJob(cancelTarget.id, cancelReason);
    if (err) return notify(err, "error");
    notify(`${cancelTarget.code} 已撤单，占用的 ${totalLength(cancelTarget)} 米补线已放回`);
    setCancelTarget(null);
  }

  function remove(job: Job) {
    if (!window.confirm(`删除草稿工序 ${job.code}？草稿不影响库存。`)) return;
    const err = actions.deleteJob(job.id);
    if (err) return notify(err, "error");
    notify("草稿已删除");
  }

  return (
    <div className="page">
      <div className="subbar">
        <div>
          <h2 className="page-title">修复工序</h2>
          <p className="page-sub">
            开工程序：新增工序（草稿，不占线）→ 开工占线（锁定色名/色号、预留库存）→ 完工扣库存；中途撤单则把占用量放回。
          </p>
        </div>
        <button
          className="primary"
          onClick={openNewForm}
        >
          ＋ 新增工序
        </button>
      </div>

      <div className="kanban">
        {columns.map((col) => {
          const jobs = s.jobs
            .filter((j) => j.status === col.status)
            .sort((a, b) => (b.startedAt ?? b.createdAt) - (a.startedAt ?? a.createdAt));
          return (
            <section key={col.status} className={`kanban-col col-${col.status}`}>
              <header>
                <h3>
                  {col.title} <b>{jobs.length}</b>
                </h3>
                <small>{col.hint}</small>
              </header>
              <div className="kanban-cards">
                {jobs.length === 0 && <div className="kanban-empty">暂无</div>}
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onStart={() => start(job)}
                    onEdit={() => {
                      setEditing(job);
                      setFormOpen(true);
                    }}
                    onComplete={() => openComplete(job)}
                    onCancel={() => openCancel(job)}
                    onDelete={() => remove(job)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {formOpen && (
        <Modal open wide title={editing ? `编辑草稿 ${editing.code}` : "新增修复工序"} onClose={closeForm}>
          <JobForm
            key={presetCarpetId ?? "default"}
            presetCarpetId={presetCarpetId}
            editing={editing}
            onClose={closeForm}
          />
        </Modal>
      )}

      {completeTarget && (
        <Modal open title={`完工扣库存 · ${completeTarget.code}`} onClose={() => setCompleteTarget(null)}>
          <CompleteBody
            job={completeTarget}
            afterNote={afterNote}
            setAfterNote={setAfterNote}
            onClose={() => setCompleteTarget(null)}
            onConfirm={confirmComplete}
          />
        </Modal>
      )}

      {cancelTarget && (
        <Modal open title={`撤单放回 · ${cancelTarget.code}`} onClose={() => setCancelTarget(null)}>
          <div className="col-gap">
            <p className="modal-tip">
              撤单不会扣除账面库存，以下 {totalLength(cancelTarget)} 米占用量将全部放回对应色卡：
            </p>
            <ul className="release-list">
              {cancelTarget.lines.map((l, i) => {
                const d = lineDisplay(s, l);
                return (
                  <li key={i}>
                    <i className="swatch" style={{ background: d.hex }} />
                    {d.name} {d.code} —— 放回 {l.length} 米
                  </li>
                );
              })}
            </ul>
            <label className="field">
              <span className="field-label">撤单原因（可选）</span>
              <textarea
                className="ctrl"
                rows={2}
                value={cancelReason}
                placeholder="如 客户改方案、破损比预估严重需重新报价"
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button onClick={() => setCancelTarget(null)}>再想想</button>
              <button className="danger-btn" onClick={confirmCancel}>
                确认撤单并放回占用
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CompleteBody({
  job,
  afterNote,
  setAfterNote,
  onClose,
  onConfirm,
}: {
  job: Job;
  afterNote: string;
  setAfterNote: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const s = useStore();
  return (
    <div className="col-gap">
      <p className="modal-tip">完工后将从对应色卡账面库存中扣除实际用量，并释放占用：</p>
      <ul className="release-list">
        {job.lines.map((l, i) => {
          const d = lineDisplay(s, l);
          return (
            <li key={i}>
              <i className="swatch" style={{ background: d.hex }} />
              {d.name} {d.code} —— 扣 {l.length} 米
            </li>
          );
        })}
      </ul>
      <label className="field">
        <span className="field-label">修复后备注（写入地毯档案）</span>
        <textarea
          className="ctrl"
          rows={3}
          value={afterNote}
          placeholder="如：分两次对色，顺原纹补结，色差不明显，客户已验收"
          onChange={(e) => setAfterNote(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <button onClick={onClose}>取消</button>
        <button className="primary" onClick={onConfirm}>
          确认完工并扣库存
        </button>
      </div>
    </div>
  );
}

function JobCard({
  job,
  onStart,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
}: {
  job: Job;
  onStart: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const s = useStore();
  const carpet = carpetById(s, job.carpetId);

  return (
    <article className={`job-card job-${job.status}`}>
      <div className="job-head">
        <span className="job-code">{job.code}</span>
        <span className={`status-tag st-${job.status}`}>
          {job.status === "draft" && "草稿"}
          {job.status === "reserved" && "在制"}
          {job.status === "done" && "完工"}
          {job.status === "cancelled" && "已撤单"}
        </span>
      </div>
      <h4 className="job-title">{job.title}</h4>
      <p className="job-carpet">{carpet ? `${carpet.code} · ${carpet.origin}` : "档案已删除"}</p>
      {job.description && <p className="job-desc">{job.description}</p>}

      <div className="job-lines">
        {job.lines.map((l, i) => {
          const d = lineDisplay(s, l);
          return (
            <div key={i} className={`job-line ${d.renamed ? "is-renamed" : ""}`}>
              <i className="swatch" style={{ background: d.hex }} />
              <span className="job-line-name">
                {d.name}
                <small>{d.code}</small>
              </span>
              <b>{l.length}米</b>
              {d.renamed && (
                <span
                  className="snapshot-flag"
                  title={`该色卡现已改名为「${s.cards.find((c) => c.id === l.cardId)?.name} / ${
                    s.cards.find((c) => c.id === l.cardId)?.code
                  }」，本工序保留开工时的旧名称旧色号，库存仍按新色卡结算`}
                >
                  旧名
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="job-meta">
        {job.status === "draft" && <small>建单 {formatDate(job.createdAt)}</small>}
        {job.status === "reserved" && (
          <small>
            开工 {formatDate(job.startedAt)} · 占用 {totalLength(job)} 米
          </small>
        )}
        {job.status === "done" && <small>完工 {formatDate(job.finishedAt)} · 实扣 {totalLength(job)} 米</small>}
        {job.status === "cancelled" && <small>撤单 {formatDate(job.cancelledAt)} · 已放回</small>}
      </div>

      <div className="job-actions">
        {job.status === "draft" && (
          <>
            <button className="primary sm" onClick={onStart}>
              开工占线
            </button>
            <button className="sm" onClick={onEdit}>
              编辑
            </button>
            <button className="danger-btn sm" onClick={onDelete}>
              删除
            </button>
          </>
        )}
        {job.status === "reserved" && (
          <>
            <button className="primary sm" onClick={onComplete}>
              完工扣库
            </button>
            <button className="danger-btn sm" onClick={onCancel}>
              撤单放回
            </button>
          </>
        )}
      </div>
    </article>
  );
}
