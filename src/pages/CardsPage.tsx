import { useState } from "react";
import { ColorCard, LedgerType } from "../types";
import {
  actions,
  availableOfCard,
  heldOfCard,
  ledgerTypeLabel,
  lineDisplay,
  useStore,
} from "../store";
import { formatDate } from "../utils";
import { Modal, Field } from "../components/Modal";
import { useToast } from "../components/Toast";

type CardDialog =
  | { kind: "new" }
  | { kind: "edit"; card: ColorCard }
  | { kind: "restock"; card: ColorCard }
  | { kind: "adjust"; card: ColorCard }
  | null;

export function CardsPage() {
  const s = useStore();
  const notify = useToast();
  const [dialog, setDialog] = useState<CardDialog>(null);
  const [ledgerCardId, setLedgerCardId] = useState<string | null>(null);

  function remove(card: ColorCard) {
    const held = heldOfCard(s, card.id);
    const usedInDraft = s.jobs.some(
      (j) => j.status === "draft" && j.lines.some((l) => l.cardId === card.id)
    );
    const msg = usedInDraft
      ? `色卡 ${card.code} 正被草稿工序使用，需先在草稿里改选其他补线才能删除。`
      : held > 0
        ? `色卡 ${card.code} 有 ${held} 米被在制工序占用，完工或撤单后才能删除。`
        : `确定删除色卡 ${card.code} ${card.name} 吗？历史工序中保留的旧名称/色号仍可查看。`;
    if (held > 0 || usedInDraft) return notify(msg, "error");
    if (!window.confirm(msg)) return;
    const err = actions.deleteCard(card.id);
    if (err) return notify(err, "error");
    notify("色卡已删除");
  }

  const ledgerCard = ledgerCardId ? s.cards.find((c) => c.id === ledgerCardId) : undefined;
  const ledgerEntries = ledgerCardId
    ? s.ledger.filter((l) => l.cardId === ledgerCardId).sort((a, b) => b.at - a.at)
    : [];

  return (
    <div className="page">
      <div className="subbar">
        <div>
          <h2 className="page-title">材料色卡与库存</h2>
          <p className="page-sub">
            账面库存 = 可用余量 + 在制占用。色名、色号随时可改：旧工序永远显示开工当时的旧名/旧号，库存和流水仍按色卡本体结算。
          </p>
        </div>
        <button className="primary" onClick={() => setDialog({ kind: "new" })}>
          ＋ 新建色卡
        </button>
      </div>

      <div className="card-table-wrap">
        <table className="card-table">
          <thead>
            <tr>
              <th>色块</th>
              <th>色名 / 色号</th>
              <th className="num">账面库存(米)</th>
              <th className="num">在制占用(米)</th>
              <th className="num">可用余量(米)</th>
              <th>占用它的在制工序</th>
              <th className="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            {s.cards
              .slice()
              .sort((a, b) => a.code.localeCompare(b.code))
              .map((card) => {
                const held = heldOfCard(s, card.id);
                const available = availableOfCard(s, card.id);
                const users = s.jobs.filter(
                  (j) => j.status === "reserved" && j.lines.some((l) => l.cardId === card.id)
                );
                // 已快照但名称对不上的历史工序——用于直观演示“改名不溯及旧工序”
                const snapshotUsers = s.jobs
                  .filter((j) => j.status !== "draft" && j.lines.some((l) => l.cardId === card.id))
                  .flatMap((j) =>
                    j.lines
                      .filter((l) => l.cardId === card.id)
                      .map((l) => ({ job: j, display: lineDisplay(s, l), length: l.length }))
                  )
                  .filter((x) => x.display.renamed);

                return (
                  <tr key={card.id} className={available <= 3 ? "low-stock" : ""}>
                    <td>
                      <span className="swatch-lg" style={{ background: card.hex }} />
                    </td>
                    <td>
                      <b className="card-name">{card.name}</b>
                      <small className="card-code">{card.code}</small>
                      {snapshotUsers.length > 0 && (
                        <span
                          className="rename-hint"
                          title={snapshotUsers
                            .map((x) => `${x.job.code} 仍显示「${x.display.name} / ${x.display.code}」`)
                            .join("；")}
                        >
                          有 {snapshotUsers.length} 道旧工序保留旧名/旧号
                        </span>
                      )}
                    </td>
                    <td className="num">{card.stock.toFixed(1)}</td>
                    <td className="num held-num">{held.toFixed(1)}</td>
                    <td className={`num avail-num ${available <= 3 ? "low" : ""}`}>{available.toFixed(1)}</td>
                    <td>
                      {users.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        <div className="user-tags">
                          {users.map((j) => (
                            <span key={j.id} className="user-tag">
                              {j.code} ·{" "}
                              {j.lines
                                .filter((l) => l.cardId === card.id)
                                .reduce((sum, l) => sum + l.length, 0)
                                .toFixed(1)}
                              米
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="sm" onClick={() => setDialog({ kind: "edit", card })}>
                          改名/换号
                        </button>
                        <button className="sm" onClick={() => setDialog({ kind: "restock", card })}>
                          入库
                        </button>
                        <button className="sm" onClick={() => setDialog({ kind: "adjust", card })}>
                          盘点
                        </button>
                        <button className="sm" onClick={() => setLedgerCardId(card.id)}>
                          流水
                        </button>
                        <button className="danger-btn sm" onClick={() => remove(card)}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <section className="ledger-section">
        <h3>库存流水（全色卡，最近在前）</h3>
        <LedgerTable entries={s.ledger.slice().sort((a, b) => b.at - a.at).slice(0, 60)} />
      </section>

      {dialog?.kind === "new" && (
        <Modal open title="新建材料色卡" onClose={() => setDialog(null)}>
          <CardEditBody
            mode="new"
            onClose={() => setDialog(null)}
            onSaved={() => {
              notify("色卡已建立");
              setDialog(null);
            }}
          />
        </Modal>
      )}
      {dialog?.kind === "edit" && (
        <Modal open title={`改名 / 换号 · ${dialog.card.code}`} onClose={() => setDialog(null)}>
          <CardEditBody
            mode="edit"
            card={dialog.card}
            onClose={() => setDialog(null)}
            onSaved={() => {
              notify("色卡信息已更新，旧工序仍保留开工时的旧名称");
              setDialog(null);
            }}
          />
        </Modal>
      )}
      {dialog?.kind === "restock" && (
        <Modal open title={`采购入库 · ${dialog.card.name}`} onClose={() => setDialog(null)}>
          <StockBody
            card={dialog.card}
            kind="restock"
            onClose={() => setDialog(null)}
            onDone={(amount) => {
              notify(`${dialog.card!.code} 入库 ${amount} 米`);
              setDialog(null);
            }}
          />
        </Modal>
      )}
      {dialog?.kind === "adjust" && (
        <Modal open title={`盘点调整 · ${dialog.card.name}`} onClose={() => setDialog(null)}>
          <StockBody
            card={dialog.card}
            kind="adjust"
            onClose={() => setDialog(null)}
            onDone={() => {
              notify("盘点已记账");
              setDialog(null);
            }}
          />
        </Modal>
      )}

      {ledgerCard && (
        <Modal open wide title={`库存流水 · ${ledgerCard.name} ${ledgerCard.code}`} onClose={() => setLedgerCardId(null)}>
          <LedgerTable entries={ledgerEntries} />
        </Modal>
      )}
    </div>
  );
}

function LedgerTable({ entries }: { entries: import("../types").LedgerEntry[] }) {
  const s = useStore();
  if (entries.length === 0) return <p className="muted">暂无流水。</p>;
  return (
    <div className="ledger-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>类型</th>
            <th>色卡（记账时名称）</th>
            <th>工序</th>
            <th className="num">库存变动</th>
            <th className="num">占用变动</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((l) => {
            const current = s.cards.find((c) => c.id === l.cardId);
            const renamed = current && current.name !== l.cardName;
            return (
              <tr key={l.id}>
                <td className="nowrap">{formatDate(l.at)}</td>
                <td>
                  <span className={`ledger-type lt-${l.type}`}>{ledgerTypeLabel[l.type as LedgerType]}</span>
                </td>
                <td>
                  {l.cardName}
                  {renamed && <small className="renamed-small">（现名：{current!.name}）</small>}
                  {!current && <small className="renamed-small">（色卡已删除）</small>}
                </td>
                <td>{l.jobCode ?? "—"}</td>
                <td className={`num delta ${l.stockDelta < 0 ? "neg" : l.stockDelta > 0 ? "pos" : ""}`}>
                  {l.stockDelta ? `${l.stockDelta > 0 ? "+" : ""}${l.stockDelta}` : "—"}
                </td>
                <td className={`num delta ${l.heldDelta < 0 ? "neg" : l.heldDelta > 0 ? "pos" : ""}`}>
                  {l.heldDelta ? `${l.heldDelta > 0 ? "+" : ""}${l.heldDelta}` : "—"}
                </td>
                <td>{l.note ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CardEditBody({
  mode,
  card,
  onClose,
  onSaved,
}: {
  mode: "new" | "edit";
  card?: ColorCard;
  onClose: () => void;
  onSaved: () => void;
}) {
  const notify = useToast();
  const [name, setName] = useState(card?.name ?? "");
  const [code, setCode] = useState(card?.code ?? "");
  const [hex, setHex] = useState(card?.hex ?? "#7c2d12");
  const [stock, setStock] = useState<number>(0);

  function submit() {
    if (mode === "new") {
      const err = actions.addCard({ name: name.trim(), code: code.trim(), hex, stock: Number(stock) || 0 });
      if (err) return notify(err, "error");
    } else if (card) {
      const err = actions.updateCard(card.id, { name: name.trim(), code: code.trim(), hex });
      if (err) return notify(err, "error");
    }
    onSaved();
  }

  return (
    <div className="col-gap">
      {mode === "edit" && (
        <p className="modal-tip">
          修改色名或色号后，已经开工/完工的旧工序仍显示当时的旧名称与旧色号；库存数量不受影响，继续在本色卡上结算。
        </p>
      )}
      <Field label="色名" required>
        <input className="ctrl" value={name} placeholder="如 赭石暖红、松石绿" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="色号" required>
        <input className="ctrl" value={code} placeholder="如 R-201" onChange={(e) => setCode(e.target.value)} />
      </Field>
      <Field label="色块颜色">
        <div className="inline-gap">
          <input type="color" className="color-input" value={hex} onChange={(e) => setHex(e.target.value)} />
          <input className="ctrl narrow" value={hex} onChange={(e) => setHex(e.target.value)} />
        </div>
      </Field>
      {mode === "new" && (
        <Field label="初始库存（米）" hint="建卡时初始库存会自动登记一条入库流水">
          <input
            className="ctrl"
            type="number"
            min={0}
            step="0.5"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
        </Field>
      )}
      <div className="form-actions">
        <button onClick={onClose}>取消</button>
        <button className="primary" onClick={submit}>
          {mode === "new" ? "建立色卡" : "保存"}
        </button>
      </div>
    </div>
  );
}

function StockBody({
  card,
  kind,
  onClose,
  onDone,
}: {
  card: ColorCard;
  kind: "restock" | "adjust";
  onClose: () => void;
  onDone: (amount: number) => void;
}) {
  const s = useStore();
  const notify = useToast();
  const held = heldOfCard(s, card.id);
  const [amount, setAmount] = useState<number>(kind === "restock" ? 5 : 0);
  const [note, setNote] = useState("");

  function submit() {
    const n = Number(amount);
    if (kind === "restock") {
      const err = actions.restock(card.id, n, note);
      if (err) return notify(err, "error");
      onDone(n);
    } else {
      const err = actions.adjustStock(card.id, n, note);
      if (err) return notify(err, "error");
      onDone(n);
    }
  }

  return (
    <div className="col-gap">
      <div className="stock-summary">
        <span><i className="swatch" style={{ background: card.hex }} />{card.name} {card.code}</span>
        <small>
          账面库存 {card.stock.toFixed(1)} 米 · 在制占用 {held.toFixed(1)} 米 · 当前可用{" "}
          {(card.stock - held).toFixed(1)} 米
        </small>
      </div>
      <Field
        label={kind === "restock" ? "入库数量（米）" : "调整数量（米）"}
        required
        hint={
          kind === "adjust"
            ? `盘亏请直接填负数；在制占用 ${held.toFixed(1)} 米不可盘走，最多可盘亏 ${(card.stock - held).toFixed(1)} 米`
            : "入库后账面库存与可用余量同时增加"
        }
      >
        <input
          className="ctrl"
          type="number"
          step="0.5"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </Field>
      <Field label="备注">
        <input
          className="ctrl"
          value={note}
          placeholder={kind === "restock" ? "如 九月采购一批" : "如 理库报损 / 盘盈"}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="form-actions">
        <button onClick={onClose}>取消</button>
        <button className="primary" onClick={submit}>
          {kind === "restock" ? "确认入库" : "确认调整"}
        </button>
      </div>
    </div>
  );
}
