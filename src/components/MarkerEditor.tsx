import { useRef, useState } from "react";
import { Carpet } from "../types";
import { fileToCompressedDataUrl, uid } from "../utils";

/**
 * 纹样局部标记图：
 * - 可上传本地图片（自动压缩）或沿用档案图片
 * - 点击图片即在破损位置打标记，坐标按百分比存储，换尺寸不错位
 * - 标记编号可在下方列表删除
 */
export function MarkerEditor({
  image,
  markers,
  onChange,
  onNotify,
}: {
  image: string | null;
  markers: Carpet["markers"];
  onChange: (next: { imageDataUrl: string | null; markers: Carpet["markers"] }) => void;
  onNotify: (text: string, kind?: "success" | "error") => void;
}) {
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange({ imageDataUrl: dataUrl, markers });
      onNotify("纹样局部图已上传");
    } catch {
      onNotify("图片读取失败，请换一张试试", "error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!image || !imgWrapRef.current) return;
    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({
      imageDataUrl: image,
      markers: [...markers, { id: uid("m"), x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }],
    });
  }

  function removeMarker(id: string) {
    onChange({ imageDataUrl: image, markers: markers.filter((m) => m.id !== id) });
  }

  return (
    <div className="marker-editor">
      <div className="marker-toolbar">
        <label className="upload-btn">
          {busy ? "处理中…" : image ? "更换纹样局部图" : "上传纹样局部图"}
          <input type="file" accept="image/*" hidden onChange={handleFile} disabled={busy} />
        </label>
        {image && (
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onChange({ imageDataUrl: null, markers: [] })}
          >
            移除图片与标记
          </button>
        )}
        {image && <span className="marker-tip">点击图面可在破损处打标记（共 {markers.length} 处）</span>}
      </div>

      {image ? (
        <>
          <div
            ref={imgWrapRef}
            className="marker-canvas"
            onClick={handleClick}
            role="img"
            aria-label="纹样局部标记图，点击添加标记"
          >
            <img src={image} alt="纹样局部图" />
            {markers.map((m, i) => (
              <span
                key={m.id}
                className="marker-pin"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                title={`破损点 ${i + 1}`}
              >
                {i + 1}
              </span>
            ))}
          </div>
          {markers.length > 0 && (
            <div className="marker-list">
              {markers.map((m, i) => (
                <span key={m.id} className="marker-chip">
                  <b>{i + 1}</b>
                  {`x ${m.x.toFixed(0)}% · y ${m.y.toFixed(0)}%`}
                  <button type="button" onClick={() => removeMarker(m.id)} aria-label={`删除标记 ${i + 1}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="marker-empty">尚未上传纹样局部图。可先保存文字档案，之后再补图打标记。</div>
      )}
    </div>
  );
}
