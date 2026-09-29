import { useMemo, useState } from "react";
import { Carpet } from "../types";
import {
  actions,
  carpetById,
  lineDisplay,
  originList,
  totalLength,
  useStore,
} from "../store";
import { formatDate } from "../utils";
import { Modal } from "../components/Modal";
import { CarpetForm } from "../components/CarpetForm";
import { useToast } from "../components/Toast";

const statusMeta: Record<string, { text: string; cls: string }> = {
  draft: { text: "草稿", cls: "st-draft" },
  reserved: { text: "在制", cls: "st-reserved" },
  done: { text: "完工", cls: "st-done" },
  cancelled: { text: "已撤单", cls: "st-cancelled" },
};

export function ArchivesPage({ goJobs }: { goJobs: (carpetId?: string) => void }) {
  const s = useStore();
  const notify = useToast();
  const origins = originList(s);
  const [origin, setOrigin] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Carpet | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return s.carpets
      .filter((c) => origin === "all" || c.origin === origin)
      .filter(
        (c) =>
          !kw ||
          [c.code, c.origin, c.era, c.material, c.dye, c.damage, c.beforeNote, c.afterNote]
            .join(" ")
            .toLowerCase()
            .includes(kw)
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [s.carpets, origin, keyword]);

  const detail = detailId ? carpetById(s, detailId) : undefined;

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(c: Carpet) {
    setDetailId(null);
    setEditing(c);
    setFormOpen(true);
  }

  function remove(c: Carpet) {
    if (!window.confirm(`确定删除档案 ${c.code} 吗？相关历史工序仍会保留。`)) return;
    const err = actions.deleteCarpet(c.id);
    if (err) return notify(err, "error");
    notify(`档案 ${c.code} 已删除`);
    setDetailId(null);
  }

  return (
    <div className="page">
      <div className="subbar">
        <div className="filter-chips" role="tablist" aria-label="按产地筛选">
          <button
            className={`chip ${origin === "all" ? "chip-on" : ""}`}
            onClick={() => setOrigin("all")}
          >
            全部产地 <b>{s.carpets.length}</b>
          </button>
          {origins.map((o) => {
            const n = s.carpets.filter((c) => c.origin === o).length;
            return (
              <button key={o} className={`chip ${origin === o ? "chip-on" : ""}`} onClick={() => setOrigin(o)}>
                {o} <b>{n}</b>
              </button>
            );
          })}
        </div>
        <div className="subbar-right">
          <input
            className="ctrl search"
            placeholder="搜索编号 / 材质 / 破损…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className="primary" onClick={openNew}>
            ＋ 新建地毯档案
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">当前筛选下没有档案，点右上角「新建地毯档案」开始记录。</div>
      ) : (
        <div className="card-grid">
          {list.map((c) => {
            const jobCount = s.jobs.filter((j) => j.carpetId === c.id).length;
            return (
              <article key={c.id} className="rug-card" onClick={() => setDetailId(c.id)}>
                <div className="rug-thumb">
                  {c.imageDataUrl ? (
                    <img src={c.imageDataUrl} alt={`${c.code} 纹样局部图`} />
                  ) : (
                    <span className="rug-thumb-empty">无标记图</span>
                  )}
                  <span className="rug-origin">{c.origin}</span>
                  {c.markers.length > 0 && <span className="rug-marker-count">破损 {c.markers.length} 处</span>}
                </div>
                <div className="rug-body">
                  <div className="rug-title">
                    <h3>{c.code}</h3>
                    <small>{c.era}</small>
                  </div>
                  <ul className="rug-meta">
                    <li>结密度：{c.knotDensity ?? "未记"} {c.knotDensity !== null ? c.knotUnit : ""}</li>
                    <li>{c.material} · {c.dye}</li>
                  </ul>
                  <p className="rug-damage">{c.damage || "未描述破损区域"}</p>
                  <div className="rug-foot">
                    <span>{jobCount} 道工序</span>
                    <span className={`dot ${c.afterNote ? "dot-done" : "dot-todo"}`}>
                      {c.afterNote ? "已有修复后记录" : "暂无修复后记录"}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 新建/编辑模态框：关闭即卸载，表单状态天然重置 */}
      {formOpen && (
        <Modal
          open
          wide
          title={editing ? `编辑档案 ${editing.code}` : "新建地毯档案"}
          onClose={() => setFormOpen(false)}
        >
          <CarpetForm
            editing={editing}
            onClose={() => setFormOpen(false)}
            onSaved={(id) => setDetailId(id)}
          />
        </Modal>
      )}

      {detail && (
        <Modal open wide title={`地毯档案 ${detail.code}`} onClose={() => setDetailId(null)}>
          <CarpetDetail
            carpet={detail}
            onEdit={() => openEdit(detail)}
            onDelete={() => remove(detail)}
            goJobs={() => {
              setDetailId(null);
              goJobs(detail.id);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CarpetDetail({
  carpet,
  onEdit,
  onDelete,
  goJobs,
}: {
  carpet: Carpet;
  onEdit: () => void;
  onDelete: () => void;
  goJobs: () => void;
}) {
  const s = useStore();
  const jobs = s.jobs
    .filter((j) => j.carpetId === carpet.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="detail">
      <div className="detail-grid">
        <div className="detail-image">
          {carpet.imageDataUrl ? (
            <div className="marker-canvas static">
              <img src={carpet.imageDataUrl} alt={`${carpet.code} 纹样局部图`} />
              {carpet.markers.map((m, i) => (
                <span key={m.id} className="marker-pin" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                  {i + 1}
                </span>
              ))}
            </div>
          ) : (
            <div className="marker-empty">未上传纹样局部图</div>
          )}
          <p className="detail-markers">
            {carpet.markers.length > 0 ? `共标注 ${carpet.markers.length} 处破损位置` : "尚未在图上标记破损点"}
          </p>
        </div>

        <div className="detail-info">
          <table className="kv">
            <tbody>
              <tr><th>产地</th><td>{carpet.origin}</td></tr>
              <tr><th>年代</th><td>{carpet.era}</td></tr>
              <tr>
                <th>结密度</th>
                <td>{carpet.knotDensity ?? "未记录"}{carpet.knotDensity !== null ? ` ${carpet.knotUnit}` : ""}</td>
              </tr>
              <tr><th>材质</th><td>{carpet.material}</td></tr>
              <tr><th>染色方式</th><td>{carpet.dye}</td></tr>
              <tr><th>破损区域</th><td>{carpet.damage || "—"}</td></tr>
              <tr><th>建档时间</th><td>{formatDate(carpet.createdAt)}</td></tr>
            </tbody>
          </table>
          <div className="detail-actions">
            <button className="primary" onClick={onEdit}>编辑档案</button>
            <button onClick={goJobs}>查看 / 新增工序</button>
            <button className="danger-btn" onClick={onDelete}>删除</button>
          </div>
        </div>
      </div>

      <div className="note-pair">
        <section className="note-box">
          <h4>修复前备注</h4>
          <p>{carpet.beforeNote || "—"}</p>
        </section>
        <section className="note-box note-after">
          <h4>修复后备注</h4>
          <p>{carpet.afterNote || "尚未填写，工序完工后可回填。"}</p>
        </section>
      </div>

      <section>
        <h4 className="block-title">相关工序（{jobs.length}）</h4>
        {jobs.length === 0 ? (
          <p className="muted">还没有工序记录。</p>
        ) : (
          <div className="detail-jobs">
            {jobs.map((j) => (
              <div key={j.id} className="detail-job">
                <div>
                  <span className={`status-tag ${statusMeta[j.status].cls}`}>{statusMeta[j.status].text}</span>
                  <b>{j.code}</b> {j.title}
                </div>
                <div className="detail-job-lines">
                  {j.lines.map((l, i) => {
                    const d = lineDisplay(s, l);
                    return (
                      <span key={i} className="line-chip" title={d.renamed ? "色卡已改名/换号，此处为开工时的旧名称" : ""}>
                        <i style={{ background: d.hex }} />
                        {d.name} {d.code} × {l.length}米
                        {d.renamed && <em className="snapshot-flag">旧</em>}
                      </span>
                    );
                  })}
                  <small>合计 {totalLength(j)} 米</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
