import { useState } from "react";
import { StoreProvider, actions, heldByCard, useStore } from "./store";
import { ToastProvider, useToast } from "./components/Toast";
import { ArchivesPage } from "./pages/ArchivesPage";
import { JobsPage } from "./pages/JobsPage";
import { CardsPage } from "./pages/CardsPage";

type Tab = "archives" | "jobs" | "cards";

const tabs: { key: Tab; label: string }[] = [
  { key: "archives", label: "地毯档案" },
  { key: "jobs", label: "修复工序" },
  { key: "cards", label: "材料色卡" },
];

function Dashboard() {
  const s = useStore();
  const notify = useToast();
  const [tab, setTab] = useState<Tab>("archives");
  // 从档案详情跳转新增工序时的预选地毯；表单挂载后只取一次
  const [presetCarpetId, setPresetCarpetId] = useState<string | undefined>(undefined);

  const held = heldByCard(s);
  const totalHeld = Object.values(held).reduce((a, b) => a + b, 0);
  const activeJobs = s.jobs.filter((j) => j.status === "reserved").length;
  const terminalJobs = s.jobs.filter((j) => j.status === "done" || j.status === "cancelled").length;
  const doneRate =
    s.jobs.length === 0
      ? 0
      : Math.round((s.jobs.filter((j) => j.status === "done").length / s.jobs.length) * 100);
  const lowStockCards = s.cards.filter((c) => c.stock - (held[c.id] ?? 0) <= 3).length;

  function goJobs(carpetId?: string) {
    setPresetCarpetId(carpetId);
    setTab("jobs");
  }

  function clearPreset() {
    setPresetCarpetId(undefined);
  }

  function resetAll() {
    if (!window.confirm("将清空当前所有改动并恢复演示数据，确定继续？")) return;
    const err = actions.resetAll();
    if (err) return notify(err, "error");
    notify("已恢复演示数据");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">毯</span>
            <div>
              <h1>手工地毯修复工作室</h1>
              <p>纹样档案 · 补线占料 · 色卡库存</p>
            </div>
          </div>
          <nav className="tabs">
            {tabs.map((t) => (
              <button key={t.key} className={tab === t.key ? "tab-on" : ""} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </nav>
          <button className="ghost-btn reset-btn" onClick={resetAll}>
            恢复演示数据
          </button>
        </div>
      </header>

      <section className="metrics">
        <div className="metric">
          <small>地毯档案</small>
          <strong>{s.carpets.length}</strong>
          <em>{new Set(s.carpets.map((c) => c.origin)).size} 个产地</em>
        </div>
        <div className="metric">
          <small>在制工序</small>
          <strong>{activeJobs}</strong>
          <em>占线 {totalHeld.toFixed(1)} 米</em>
        </div>
        <div className="metric">
          <small>色卡数量</small>
          <strong>{s.cards.length}</strong>
          <em className={lowStockCards > 0 ? "warn-text" : ""}>
            {lowStockCards > 0 ? `${lowStockCards} 张余量偏低` : "库存正常"}
          </em>
        </div>
        <div className="metric">
          <small>完工率</small>
          <strong>{doneRate}%</strong>
          <em>
            完结 {terminalJobs} / 共 {s.jobs.length} 单
          </em>
        </div>
      </section>

      <main className="app-main">
        {tab === "archives" && <ArchivesPage goJobs={goJobs} />}
        {tab === "jobs" && <JobsPage presetCarpetId={presetCarpetId} onPresetConsumed={clearPreset} />}
        {tab === "cards" && <CardsPage />}
      </main>

      <footer className="app-footer">
        数据保存在本浏览器（localStorage）。开工占线、完工扣库、撤单放回均留有库存流水。
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </StoreProvider>
  );
}
