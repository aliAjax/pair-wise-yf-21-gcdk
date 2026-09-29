import { useState } from "react";
import type { Carpet } from "../types";
import { dispatch, useStoreState } from "../store";
import { fileToDataUrl } from "../utils";
import Modal from "./Modal";
import MarkerBoard from "./MarkerBoard";

const EMPTY = {
  origin: "",
  era: "",
  knotDensity: "",
  material: "",
  dyeMethod: "",
  damageAreas: "",
};

interface CarpetModalProps {
  carpet: Carpet | null; // null = 新建
  onClose: () => void;
}

export default function CarpetModal({ carpet, onClose }: CarpetModalProps) {
  const creating = !carpet;
  const state = useStoreState();
  const [form, setForm] = useState({
    ...EMPTY,
    ...(carpet
      ? {
          origin: carpet.origin,
          era: carpet.era,
          knotDensity: carpet.knotDensity,
          material: carpet.material,
          dyeMethod: carpet.dyeMethod,
          damageAreas: carpet.damageAreas,
        }
      : {}),
  });
  const [beforeNote, setBeforeNote] = useState(carpet?.beforeNote ?? "");
  const [afterNote, setAfterNote] = useState(carpet?.afterNote ?? "");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveBase = () => {
    if (!form.origin.trim()) {
      alert("请至少填写地毯产地。");
      return;
    }
    if (creating) {
      const id = `car_${Date.now().toString(36)}`;
      // 档案编号按现有最大流水号递增
      const maxNo = state.carpets.reduce((m, c) => {
        const n = parseInt(c.code.replace(/^CAR-/, ""), 10);
        return Number.isFinite(n) ? Math.max(m, n) : m;
      }, 0);
      dispatch({
        type: "addCarpet",
        carpet: {
          id,
          code: `CAR-${String(maxNo + 1).padStart(3, "0")}`,
          origin: form.origin.trim(),
          era: form.era.trim(),
          knotDensity: form.knotDensity.trim(),
          material: form.material.trim(),
          dyeMethod: form.dyeMethod,
          damageAreas: form.damageAreas.trim(),
          patternImage: null,
          markers: [],
          beforeNote,
          afterNote,
          createdAt: Date.now(),
        },
      });
      onClose();
    } else {
      dispatch({
        type: "updateCarpet",
        id: carpet.id,
        patch: {
          origin: form.origin.trim(),
          era: form.era.trim(),
          knotDensity: form.knotDensity.trim(),
          material: form.material.trim(),
          dyeMethod: form.dyeMethod,
          damageAreas: form.damageAreas.trim(),
          beforeNote,
          afterNote,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      if (carpet) {
        dispatch({
          type: "updateCarpet",
          id: carpet.id,
          patch: { patternImage: dataUrl },
        });
      } else {
        // 新建档案还没保存：先存进 localStorage 待落库不现实，提示先建档案
        alert("请先保存基础信息建立档案，再上传纹样标记图。");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "图片处理失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      wide
      title={creating ? "新建地毯档案" : `档案 ${carpet!.code} · ${carpet!.origin}`}
      onClose={onClose}
      footer={
        <>
          {saved && <span className="save-ok">已保存 ✓</span>}
          <span style={{ flex: 1 }} />
          <button onClick={onClose}>关闭</button>
          <button className="primary" onClick={saveBase}>
            {creating ? "建立档案" : "保存档案信息"}
          </button>
        </>
      }
    >
      <div className="field-grid">
        <label className="req">
          <span>地毯产地 *</span>
          <input list="origin-list" value={form.origin} onChange={set("origin")} placeholder="如：波斯 / 安纳托利亚 / 藏毯" />
          <datalist id="origin-list">
            <option value="波斯" />
            <option value="安纳托利亚" />
            <option value="高加索" />
            <option value="藏毯" />
            <option value="土库曼" />
            <option value="新疆和田" />
          </datalist>
        </label>
        <label>
          <span>年代</span>
          <input value={form.era} onChange={set("era")} placeholder="如：约1960s / 清末民初" />
        </label>
        <label>
          <span>结密度</span>
          <input value={form.knotDensity} onChange={set("knotDensity")} placeholder="如：42 结/平方分米" />
        </label>
        <label>
          <span>材质</span>
          <input value={form.material} onChange={set("material")} placeholder="如：羊毛，棉经线" list="material-list" />
          <datalist id="material-list">
            <option value="羊毛" />
            <option value="羊毛（经线棉）" />
            <option value="羊毛，牦牛绒包边" />
            <option value="真丝" />
            <option value="丝毛混织" />
          </datalist>
        </label>
        <label>
          <span>染色方式</span>
          <select value={form.dyeMethod} onChange={set("dyeMethod")}>
            <option value="">请选择</option>
            <option value="植物染">植物染</option>
            <option value="矿物染">矿物染</option>
            <option value="化学染">化学染</option>
            <option value="天然染（植物+矿物）">天然染（植物+矿物）</option>
            <option value="混合（原植物染，局部化学染）">混合（原植物染，局部化学染）</option>
          </select>
        </label>
        <label className="full">
          <span>破损区域</span>
          <textarea rows={2} value={form.damageAreas} onChange={set("damageAreas")} placeholder="位置、尺寸、破损程度，如：左边缘 30cm 磨损、中心缺口" />
        </label>
      </div>

      {!creating && (
        <>
          <div className="sub-head">
            <h3>纹样局部标记图</h3>
          </div>
          <MarkerBoard
            image={carpet!.patternImage}
            markers={carpet!.markers}
            uploading={uploading}
            onUpload={uploadImage}
            onChange={(markers) =>
              dispatch({ type: "updateCarpet", id: carpet!.id, patch: { markers } })
            }
            onClearImage={() =>
              dispatch({
                type: "updateCarpet",
                id: carpet!.id,
                patch: { patternImage: null, markers: [] },
              })
            }
          />

          <div className="sub-head">
            <h3>修复记录</h3>
          </div>
          <div className="note-grid">
            <label>
              <span>修复前备注（现状、取色、工艺判断）</span>
              <textarea rows={4} value={beforeNote} onChange={(e) => setBeforeNote(e.target.value)} />
            </label>
            <label>
              <span>修复后备注（完工后补记）</span>
              <textarea rows={4} value={afterNote} onChange={(e) => setAfterNote(e.target.value)} />
            </label>
          </div>
        </>
      )}
    </Modal>
  );
}
