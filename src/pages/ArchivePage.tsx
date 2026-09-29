import { useMemo, useState } from "react";
import { useStoreState } from "../store";
import type { Carpet } from "../types";
import CarpetModal from "../components/CarpetModal";

export default function ArchivePage() {
  const state = useStoreState();
  const [origin, setOrigin] = useState<string>("全部");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Carpet | null | undefined>(undefined);

  const origins = useMemo(
    () => Array.from(new Set(state.carpets.map((c) => c.origin))).sort(),
    [state.carpets]
  );

  const filtered = state.carpets.filter((c) => {
    if (origin !== "全部" && c.origin !== origin) return false;
    if (keyword.trim()) {
      const k = keyword.trim();
      const hay = `${c.code} ${c.origin} ${c.era} ${c.material} ${c.dyeMethod} ${c.damageAreas} ${c.beforeNote} ${c.afterNote}`;
      if (!hay.includes(k)) return false;
    }
    return true;
  });

  const jobsOf = (carpetId: string) => state.jobs.filter((j) => j.carpetId === carpetId);
  const carpetNo = (c: Carpet) => c.code;

  const counts: Record<string, number> = { 全部: state.carpets.length };
  for (const c of state.carpets) counts[c.origin] = (counts[c.origin] ?? 0) + 1;

  return (
    <div className="page-grid">
      <aside className="panel filter-panel">
        <h2>按产地筛选</h2>
        <div className="filter-list">
          {["全部", ...origins].map((o) => (
            <button
              key={o}
              className={origin === o ? "on" : ""}
              onClick={() => setOrigin(o)}
            >
              <span>{o}</span>
              <em>{counts[o] ?? 0}</em>
            </button>
          ))}
        </div>
        <div className="filter-divider" />
        <label className="search-box">
          <span>关键字</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜材质 / 染色 / 破损…"
          />
        </label>
        <button className="primary block" onClick={() => setEditing(null)}>
          ＋ 新建地毯档案
        </button>
      </aside>

      <section className="panel">
        <div className="heading">
          <div>
            <p>纹样档案</p>
            <h2>
              {origin === "全部" ? "全部档案" : origin + " 档案"}
              <small>（{filtered.length} 条）</small>
            </h2>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-tip">没有符合条件的档案，换个筛选或新建一条。</div>
        ) : (
          <div className="carpet-grid">
            {filtered.map((c) => {
              const jobs = jobsOf(c.id);
              const active = jobs.filter((j) => j.status === "active").length;
              const done = jobs.filter((j) => j.status === "done").length;
              const planned = jobs.filter((j) => j.status === "planned").length;
              return (
                <article key={c.id} className="carpet-card" onClick={() => setEditing(c)}>
                  <div
                    className="carpet-thumb"
                    style={
                      c.patternImage
                        ? { backgroundImage: `url(${c.patternImage})` }
                        : undefined
                    }
                  >
                    {c.markers.length > 0 && <i className="thumb-badge">● {c.markers.length}</i>}
                    {!c.patternImage && <span className="thumb-ph">纹样局部图未上传</span>}
                  </div>
                  <div className="carpet-info">
                    <div className="card-top">
                      <h3>{carpetNo(c)}</h3>
                      <span className="tag">{c.origin}</span>
                    </div>
                    <p className="line">
                      {c.era || "年代待考"} · {c.knotDensity || "结密度未记"}
                    </p>
                    <p className="line">{c.material || "材质未记"} · {c.dyeMethod || "染色方式未记"}</p>
                    <p className="line clamp">{c.damageAreas || "破损区域未描述"}</p>
                    <div className="card-foot">
                      <span className="chip-job plan" hidden={!planned}>待开工 {planned}</span>
                      <span className="chip-job act" hidden={!active}>占线中 {active}</span>
                      <span className="chip-job done" hidden={!done}>已完工 {done}</span>
                      <button
                        className="open-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(c);
                        }}
                      >
                        打开 →
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editing !== undefined && (
        <CarpetModal carpet={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}
