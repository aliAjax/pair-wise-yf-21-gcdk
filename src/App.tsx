import { useState } from "react";
import "./styles.css";
import { availableQty, dispatch, reservedQty, useStoreState } from "./store";
import ArchivePage from "./pages/ArchivePage";
import JobsPage from "./pages/JobsPage";
import ColorsPage from "./pages/ColorsPage";

type Tab = "archive" | "jobs" | "colors";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "archive", label: "纹样档案" },
  { key: "jobs", label: "修复工序" },
  { key: "colors", label: "材料色卡" },
];

function App() {
  const state = useStoreState();
  const [tab, setTab] = useState<Tab>("archive");

  const activeJobs = state.jobs.filter((j) => j.status === "active");
  const doneJobs = state.jobs.filter((j) => j.status === "done");
  // 按单位分别汇总，避免把“米”和“绞”混加
  const byUnit = new Map<string, { reserved: number; available: number }>();
  for (const c of state.colors) {
    const row = byUnit.get(c.unit) ?? { reserved: 0, available: 0 };
    row.reserved += reservedQty(state, c.id);
    row.available += availableQty(state, c.id);
    byUnit.set(c.unit, row);
  }
  const fmtByUnit = (key: "reserved" | "available") =>
    Array.from(byUnit.entries())
      .map(([unit, v]) => `${Math.round(v[key] * 100) / 100} ${unit}`)
      .join("、") || "0";
  const finishRate =
    state.jobs.length === 0
      ? 0
      : Math.round((doneJobs.length / state.jobs.length) * 100);

  const metrics = [
    { label: "纹样档案", value: state.carpets.length, unit: "件", raw: true },
    { label: "占线工序", value: activeJobs.length, unit: `单 · 占用 ${fmtByUnit("reserved")}`, raw: true },
    { label: "可开单补线", value: "", unit: fmtByUnit("available"), raw: true },
    { label: "完工率", value: finishRate, unit: `%（完工 ${doneJobs.length} 单）`, raw: true },
  ];

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">毯</span>
          <div>
            <h1>手工地毯修复工作室 · 纹样与补线台账</h1>
            <p>档案录入 · 纹样标记 · 开单占线 · 完工扣库 · 撤单放回</p>
          </div>
        </div>
        <button
          className="ghost-btn"
          onClick={() => {
            if (confirm("恢复内置演示数据？当前录入将被清除。")) {
              dispatch({ type: "resetSeed" });
            }
          }}
        >
          恢复演示数据
        </button>
      </header>

      <section className="metrics">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.label === "完工率" ? `${m.value}%` : m.value || m.unit}</strong>
            <span>{m.label === "可开单补线" ? "按色卡单位汇总" : m.unit}</span>
          </article>
        ))}
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "archive" && <ArchivePage />}
      {tab === "jobs" && <JobsPage />}
      {tab === "colors" && <ColorsPage />}

      <footer className="foot">
        数据保存在本浏览器 localStorage；图片会自动压缩。库存口径：账面库存 − 占用中 = 可开单。
      </footer>
    </main>
  );
}

export default App;
