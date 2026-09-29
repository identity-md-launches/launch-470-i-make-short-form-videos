import type { CollectorToken } from "./collection";

export type MotionStyle = "spotlight" | "orbit" | "glitch";
export const styles: {
  id: MotionStyle;
  name: string;
  description: string;
  detail: string;
}[] = [
  {
    id: "spotlight",
    name: "Spotlight",
    description: "A golden-hour entrance",
    detail: "Soft light. Slow float. Main character energy.",
  },
  {
    id: "orbit",
    name: "Orbit",
    description: "A little out of this world",
    detail: "Celestial rings and a gentle, looping orbit.",
  },
  {
    id: "glitch",
    name: "Glitch",
    description: "Straight out of the feed",
    detail: "Digital edges with a playful, stepped rhythm.",
  },
];
export interface CardOptions {
  token: CollectorToken | null;
  artwork: HTMLImageElement | null;
  title: string;
  style: MotionStyle;
}
const TAU = Math.PI * 2;
const palette = {
  spotlight: {
    bg: "#dcec98",
    ink: "#25351b",
    secondary: "#536139",
    frame: "#faf8ed",
    accent: "#bfd27d",
  },
  orbit: {
    bg: "#232242",
    ink: "#f5edff",
    secondary: "#cbc0e8",
    frame: "#ede5fa",
    accent: "#7474ad",
  },
  glitch: {
    bg: "#ec825c",
    ink: "#291f1c",
    secondary: "#633429",
    frame: "#fff1df",
    accent: "#c75043",
  },
};
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 500,
  family = "DM Sans",
) {
  ctx.font = `${weight} ${size}px "${family}", sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}
function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function star(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.22 : r;
    const px = x + Math.cos(a) * rr,
      py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
function wrapTitle(ctx: CanvasRenderingContext2D, value: string): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of Array.from(value.trim() || "Ready for my close-up.")) {
    if (ctx.measureText(current + char).width > 850) {
      lines.push(current.trim());
      current = char;
    } else current += char;
  }
  if (current) lines.push(current.trim());
  return lines;
}

/** One renderer for the preview, PNG and MP4. Artwork is contained, never cropped. */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  seconds: number,
  options: CardOptions,
) {
  const { token, artwork, style, title } = options;
  const p = palette[style];
  const phase = ((seconds % 6) / 6) * TAU;
  ctx.save();
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, 1080, 1920);
  // All movement lives outside the artwork or moves its whole, uncropped frame.
  if (style === "spotlight") {
    const glow = ctx.createRadialGradient(
      540 + Math.sin(phase) * 220,
      690,
      60,
      540,
      800,
      1000,
    );
    glow.addColorStop(0, "#fcf5c7");
    glow.addColorStop(1, "#dcec9800");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 1600);
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "#94a75d45";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        540,
        970,
        445 + i * 55,
        625 + i * 72,
        Math.sin(phase) * 0.05,
        0,
        TAU,
      );
      ctx.stroke();
    }
    star(ctx, 940, 397 + Math.sin(phase) * 16, 35, p.ink);
    star(ctx, 133, 1310 - Math.sin(phase) * 20, 22, p.ink);
  } else if (style === "orbit") {
    for (let i = 0; i < 45; i++) {
      const x = (i * 173 + 31) % 1080,
        y = (i * 277 + 51) % 1920;
      ctx.fillStyle = p.secondary;
      ctx.globalAlpha = 0.25 + (0.3 * (1 + Math.sin(phase + i))) / 2;
      ctx.fillRect(x, y, (i % 3) + 2, (i % 3) + 2);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(540, 960);
    ctx.rotate(-0.45 + Math.sin(phase) * 0.08);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 500 + i * 65, 700 + i * 60, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    star(
      ctx,
      910 + Math.cos(phase) * 50,
      440 + Math.sin(phase) * 65,
      25,
      "#e0d4aa",
    );
  } else {
    ctx.strokeStyle = "#63342920";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1080; x += 60) line(ctx, x, 0, x, 1920, "#63342920", 1);
    for (let y = 0; y < 1920; y += 60) line(ctx, 0, y, 1080, y, "#63342920", 1);
    const step = Math.floor(seconds * 4) % 6;
    ctx.fillStyle = p.ink;
    ctx.fillRect(75 + (step % 3) * 21, 402, 110, 10);
    ctx.fillRect(900 - (step % 2) * 25, 1300, 95, 16);
    for (let i = 0; i < 9; i++)
      ctx.fillRect(870 + i * 10, 1620, 3 + (i % 2) * 3, 38);
  }
  // Top/bottom are spacious for social app chrome.
  text(ctx, "PEPE / PREMIERE", 90, 204, 28, p.ink, 700, "Space Grotesk");
  ctx.textAlign = "right";
  text(ctx, "COLLECTOR CUT", 990, 204, 22, p.secondary, 600);
  ctx.textAlign = "left";
  line(ctx, 90, 244, 990, 244, p.secondary, 1.5);
  text(
    ctx,
    token
      ? `SWARM PEPE  /  #${token.id.padStart(4, "0")}`
      : "SWARM PEPE  /  STUDIO",
    90,
    320,
    26,
    p.ink,
    600,
  );
  const bob =
    style === "spotlight"
      ? Math.sin(phase) * 13
      : style === "orbit"
        ? Math.sin(phase) * 20
        : Math.floor(seconds * 4) % 8 === 3
          ? 5
          : 0;
  const rotation =
    style === "spotlight"
      ? -0.035 + Math.sin(phase) * 0.012
      : style === "orbit"
        ? Math.sin(phase) * 0.027
        : 0;
  ctx.save();
  ctx.translate(540, 855 + bob);
  ctx.rotate(rotation);
  ctx.shadowColor = "#15231326";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = p.frame;
  ctx.fillRect(-449, -449, 898, 974);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = token?.revealed ? "#f5f3ec" : "#252c2b";
  ctx.fillRect(-414, -414, 828, 828);
  if (artwork) {
    const scale = Math.min(
      828 / artwork.naturalWidth,
      828 / artwork.naturalHeight,
    );
    const w = artwork.naturalWidth * scale,
      h = artwork.naturalHeight * scale;
    ctx.drawImage(artwork, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = "#d9e496";
    ctx.beginPath();
    ctx.ellipse(-80, -36, 28, 40, 0, 0, TAU);
    ctx.ellipse(80, -36, 28, 40, 0, 0, TAU);
    ctx.fill();
    ctx.textAlign = "center";
    text(
      ctx,
      token ? "WAITING IN THE WINGS" : "YOUR PEPE GOES HERE",
      0,
      135,
      25,
      "#e5e8cd",
      600,
    );
    ctx.textAlign = "left";
  }
  ctx.strokeStyle = "#0000001a";
  ctx.lineWidth = 2;
  ctx.strokeRect(-414, -414, 828, 828);
  text(
    ctx,
    token?.revealed ? "ORIGINAL ON-CHAIN ART" : "THE REVEAL IS STILL A MYSTERY",
    -414,
    480,
    22,
    "#354326",
    600,
  );
  ctx.textAlign = "right";
  text(ctx, token ? `#${token.id}` : "—", 414, 480, 22, "#354326", 600);
  ctx.textAlign = "left";
  ctx.restore();
  let titleSize = 74;
  ctx.font = `600 ${titleSize}px "Space Grotesk", sans-serif`;
  let lines = wrapTitle(ctx, title);
  while (lines.length > 2 && titleSize > 28) {
    titleSize -= 2;
    ctx.font = `600 ${titleSize}px "Space Grotesk", sans-serif`;
    lines = wrapTitle(ctx, title);
  }
  lines.forEach((t, i) =>
    text(ctx, t, 90, 1500 + i * 86, titleSize, p.ink, 600, "Space Grotesk"),
  );
  const subline = token
    ? token.revealed
      ? "ONE PEPE. ALL PERSONALITY."
      : "UNREVEALED. UNMISTAKABLY YOURS."
    : "A LITTLE STUDIO. A BIG ENTRANCE.";
  text(ctx, subline, 90, 1690, 23, p.secondary, 500);
  line(ctx, 90, 1740, 990, 1740, p.secondary, 1.5);
  text(ctx, "SWARM PEPE", 90, 1797, 22, p.ink, 700, "Space Grotesk");
  ctx.textAlign = "right";
  text(ctx, `${style.toUpperCase()}   /   01`, 990, 1797, 22, p.secondary);
  ctx.restore();
}
