import { useRef, useState } from "react";
import type { PatternMarker } from "../types";
import { uid } from "../utils";

interface MarkerBoardProps {
  image: string | null;
  markers: PatternMarker[];
  onChange: (markers: PatternMarker[]) => void;
  onUpload: (file: File) => void;
  onClearImage: () => void;
  uploading?: boolean;
}

/**
 * 纹样局部标记图：
 * - 有图时点击图面任意位置加编号标记点（坐标按百分比存）
 * - 点列表里可写说明、可删除
 */
export default function MarkerBoard({
  image,
  markers,
  onChange,
  onUpload,
  onClearImage,
  uploading,
}: MarkerBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const m: PatternMarker = {
      id: uid("mk"),
      x: Math.min(0.99, Math.max(0.01, x)),
      y: Math.min(0.99, Math.max(0.01, y)),
      note: "",
    };
    onChange([...markers, m]);
    setActiveId(m.id);
  };

  return (
    <div className="marker-wrap">
      {image ? (
        <>
          <div
            ref={boardRef}
            className="marker-board"
            style={{ backgroundImage: `url(${image})` }}
            onClick={handleClick}
            title="点击图面添加标记点"
          >
            {markers.map((m, i) => (
              <button
                key={m.id}
                className={"marker-dot" + (m.id === activeId ? " active" : "")}
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                title={`标记 ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveId(m.id === activeId ? null : m.id);
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="marker-actions">
            <label className="link-label">
              更换图片
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              className="danger-link"
              onClick={() => {
                if (confirm("移除标记图？图上的标记点会一并删除。")) {
                  onClearImage();
                }
              }}
            >
              移除图片
            </button>
            <span className="hint">点击图面添加破损 / 纹样标记点</span>
          </div>

          {markers.length > 0 && (
            <ul className="marker-list">
              {markers.map((m, i) => (
                <li key={m.id} className={m.id === activeId ? "sel" : ""}>
                  <b>{i + 1}</b>
                  <input
                    value={m.note}
                    placeholder={`标记 ${i + 1}：如“缺口补织起点”`}
                    onFocus={() => setActiveId(m.id)}
                    onChange={(e) =>
                      onChange(
                        markers.map((x) => (x.id === m.id ? { ...x, note: e.target.value } : x))
                      )
                    }
                  />
                  <button
                    className="icon-btn small"
                    onClick={() => {
                      onChange(markers.filter((x) => x.id !== m.id));
                      if (activeId === m.id) setActiveId(null);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <label className="marker-empty">
          {uploading ? "图片处理中…" : "＋ 上传纹样局部图（JPG / PNG，自动压缩）"}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
