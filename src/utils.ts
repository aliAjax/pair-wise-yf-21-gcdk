// 通用工具

let counter = 0;
/** 简易唯一 id，不依赖 crypto 可用性 */
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function pad(n: number, width = 3): string {
  return String(n).padStart(width, "0");
}

export function formatDate(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** 读取图片并压缩为 JPEG dataURL，避免 localStorage 被大图撑爆 */
export function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("图片解析失败"));
      img.onload = () => {
        const maxW = 1100;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("浏览器不支持画布"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 生成一张示意性的地毯纹样 SVG dataURL，作为演示档案的标记底图。
 * tone 决定主色调，与各条档案产地氛围对应。
 */
export function sampleRugDataUrl(seed: number): string {
  const tones = [
    ["#7c2d12", "#b45309", "#f5e9d7"],
    ["#0f766e", "#134e4a", "#e6f2ef"],
    ["#9a3412", "#a16207", "#fbf3e4"],
    ["#7f1d1d", "#92400e", "#fae8d8"],
  ];
  const [dark, mid, light] = tones[seed % tones.length];
  const r = (n: number) => ((n * 9301 + seed * 49297) % 233280) / 233280;
  const dots = Array.from({ length: 7 }, (_, i) => {
    const x = 12 + r(i + 1) * 76;
    const y = 14 + r(i + 8) * 72;
    return `<circle cx="${x.toFixed(1)}%" cy="${y.toFixed(1)}%" r="7" fill="${mid}" opacity="0.55"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
  <rect width="720" height="480" fill="${light}"/>
  <rect x="18" y="18" width="684" height="444" fill="none" stroke="${dark}" stroke-width="10"/>
  <rect x="40" y="40" width="640" height="400" fill="none" stroke="${mid}" stroke-width="4" stroke-dasharray="10 8"/>
  <ellipse cx="360" cy="240" rx="150" ry="105" fill="none" stroke="${dark}" stroke-width="5"/>
  <ellipse cx="360" cy="240" rx="88" ry="60" fill="${mid}" opacity="0.35" stroke="${mid}" stroke-width="3"/>
  ${dots}
  <path d="M120 420 Q360 300 600 420" fill="none" stroke="${dark}" stroke-width="3" opacity="0.7"/>
  <path d="M120 60 Q360 180 600 60" fill="none" stroke="${dark}" stroke-width="3" opacity="0.7"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DYE_OPTIONS = ["植物染", "化学染", "混合染"] as const;
export const ORIGIN_OPTIONS = ["波斯", "安纳托利亚", "高加索", "藏毯", "土库曼", "其他"] as const;
