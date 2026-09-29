import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  loadToken,
  normalizeTokenId,
  tokenLink,
  CONTRACT_URL,
  type CollectorToken,
} from "./collection";
import { drawCard, styles, type MotionStyle, type CardOptions } from "./card";
import { exportPng, exportVideo } from "./export";
import "./style.css";

function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "download"
    | "play"
    | "pause"
    | "check"
    | "spark"
    | "close"
    | "film"
    | "image"
    | "external";
  size?: number;
}) {
  const paths = {
    arrow: "M4 12h16m-6-6 6 6-6 6",
    download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    play: "m8 5 11 7-11 7V5Z",
    pause: "M8 5v14M16 5v14",
    check: "m5 12 4 4L19 6",
    spark: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z",
    close: "m6 6 12 12M6 18 18 6",
    film: "M3 4h18v16H3V4ZM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4",
    image: "M3 3h18v18H3V3Zm0 14 6-6 5 5 3-3 4 4M15 7h.01",
    external: "M14 3h7v7M21 3 11 13M10 3H3v18h18v-7",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
function readArtwork(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "The artwork could not be opened. Try loading the token again.",
        ),
      );
    image.src = src;
  });
}

function App() {
  const [id, setId] = useState("1");
  const [token, setToken] = useState<CollectorToken | null>(null);
  const [artwork, setArtwork] = useState<HTMLImageElement | null>(null);
  const [style, setStyle] = useState<MotionStyle>("spotlight");
  const [title, setTitle] = useState("Ready for my close-up.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [playing, setPlaying] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [exporting, setExporting] = useState<"png" | "video" | null>(null);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const exportRef = useRef<AbortController | null>(null);
  const timeRef = useRef(0);
  const optionsRef = useRef<CardOptions>({ token, artwork, style, title });
  optionsRef.current = { token, artwork, style, title };

  useEffect(() => {
    let active = true;
    fetch("./sample.json")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(async (sample: CollectorToken) => {
        const art = await readArtwork(sample.image);
        if (active && !requestRef.current) {
          setToken(sample);
          setArtwork(art);
        }
      })
      .catch(() => {
        if (active && !requestRef.current)
          setMessage("Enter a token ID to bring your Pepe into the studio.");
      });
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setPlaying(!media.matches);
    media.addEventListener("change", change);
    return () => {
      active = false;
      requestRef.current?.abort();
      exportRef.current?.abort();
      media.removeEventListener("change", change);
    };
  }, []);

  useEffect(() => {
    let frame = 0,
      last = 0,
      lastLabel = 0,
      cancelled = false;
    function render(now: number) {
      const canvas = canvasRef.current,
        ctx = canvas?.getContext("2d");
      if (playing && !document.hidden && last)
        timeRef.current =
          (timeRef.current + Math.min(now - last, 50) / 1000) % 6;
      last = now;
      if (ctx && canvas) {
        ctx.setTransform(canvas.width / 1080, 0, 0, canvas.height / 1920, 0, 0);
        drawCard(ctx, timeRef.current, optionsRef.current);
      }
      if (now - lastLabel > 150) {
        setSeconds(timeRef.current);
        lastLabel = now;
      }
      if (playing) frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);
    document.fonts.ready.then(() => {
      if (!cancelled && !playing) render(performance.now());
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [playing, token, artwork, style, title]);

  async function handleLoad(event: React.FormEvent) {
    event.preventDefault();
    if (loading || exporting) return;
    setError("");
    setMessage("");
    try {
      normalizeTokenId(id);
    } catch (e) {
      setError((e as Error).message);
      inputRef.current?.focus();
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const next = await loadToken(id, controller.signal);
      const image = await readArtwork(next.image);
      if (controller.signal.aborted) return;
      setToken(next);
      setArtwork(image);
      setId(next.id);
      timeRef.current = 0;
      setExportError("");
      setMessage(
        next.revealed
          ? `Pepe #${next.id} is ready. Artwork and traits loaded from Ethereum.`
          : `Pepe #${next.id} is unrevealed. Its mystery artwork is ready; traits stay hidden.`,
      );
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  async function handleExport(kind: "png" | "video") {
    if (!token || !artwork || exporting || loading) return;
    setExporting(kind);
    setExportError("");
    setMessage("");
    setProgress(0);
    const controller = new AbortController();
    exportRef.current = controller;
    const snapshot = { ...optionsRef.current };
    const draw = (ctx: CanvasRenderingContext2D, time: number) =>
      drawCard(ctx, time, snapshot);
    try {
      if (kind === "png") await exportPng(draw, `pepe-${token.id}-${style}`);
      else
        await exportVideo(
          draw,
          `pepe-${token.id}-${style}`,
          setProgress,
          controller.signal,
        );
      setMessage(
        `${kind === "png" ? "PNG" : "MP4"} ready — check your downloads.`,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError")
        setMessage("Video export cancelled. Your card is still here.");
      else setExportError((e as Error).message);
    } finally {
      setExporting(null);
      exportRef.current = null;
    }
  }
  const currentStyle = styles.find((s) => s.id === style)!;
  const busy = loading || !!exporting;
  return (
    <>
      <a className="skip-link" href="#studio">
        Skip to studio
      </a>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Pepe Premiere home">
          <span className="brand-mark" aria-hidden="true">
            p<span>p</span>
            <i />
          </span>
          <span>pepe premiere</span>
        </a>
        <nav aria-label="About the studio">
          <button
            className="text-button"
            onClick={() => dialogRef.current?.showModal()}
          >
            How it works <span aria-hidden="true">↗</span>
          </button>
          <a className="source-link" href="./source.zip" download>
            Get the source <Icon name="external" size={15} />
          </a>
        </nav>
      </header>
      <main>
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">
              <span className="tiny-star" aria-hidden="true">
                ✳
              </span>{" "}
              A little studio. A big entrance.
            </p>
            <h1 id="page-title">
              Your Pepe. <br />
              Main character <span className="serif">energy.</span>
              <span className="headline-star" aria-hidden="true">
                ✳
              </span>
            </h1>
          </div>
          <div className="intro-copy">
            <p>
              From the blockchain to the big little screen.
              <br className="desktop-break" /> Turn your Swarm Pepe into a
              collector card
              <br className="desktop-break" /> that’s ready for its close-up.
            </p>
            <span className="no-wallet">
              <Icon name="check" size={15} /> No wallet. Just your Pepe.
            </span>
          </div>
        </section>
        <div className="studio" id="studio">
          <section className="editor" aria-label="Card editor">
            <div className="editor-top">
              <span className="eyebrow">The editing room</span>
              <span className="edition">VOL. 001</span>
              <a className="preview-jump" href="#preview-panel">
                View preview ↓
              </a>
            </div>
            <form onSubmit={handleLoad} className="step token-step" noValidate>
              <div className="step-heading">
                <span className="step-number">01</span>
                <h2>Cast your Pepe</h2>
              </div>
              <label htmlFor="token-id">Swarm Pepe token ID</label>
              <div className="token-input-row">
                <div className={`token-input ${error ? "has-error" : ""}`}>
                  <span aria-hidden="true">#</span>
                  <input
                    ref={inputRef}
                    id="token-id"
                    name="token-id"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={id}
                    maxLength={8}
                    onChange={(e) => {
                      setId(e.target.value);
                      if (error) setError("");
                    }}
                    aria-invalid={!!error}
                    aria-describedby={error ? "token-error" : "token-hint"}
                    disabled={busy}
                  />
                </div>
                <button className="load-button" type="submit" disabled={busy}>
                  {loading ? "Loading…" : "Load Pepe"}
                  <Icon name="arrow" size={18} />
                </button>
              </div>
              <p className="hint" id="token-hint">
                Enter an ID from 1–5,000. Artwork comes from Ethereum.
              </p>
              {error && (
                <p className="error" id="token-error" role="alert">
                  {error}
                  {token && <span> Still showing Pepe #{token.id}.</span>}
                </p>
              )}
              {token && (
                <div className="loaded-pepe">
                  <img src={token.image} alt="" />
                  <div>
                    <strong>Swarm Pepe #{token.id}</strong>
                    <span>
                      {token.source === "saved"
                        ? "Saved on-chain example"
                        : "Loaded from Ethereum"}{" "}
                      · {token.revealed ? "Revealed" : "Unrevealed"}
                    </span>
                  </div>
                  <span className="loaded-check" aria-hidden="true">
                    <Icon name="check" size={16} />
                  </span>
                </div>
              )}
            </form>
            <fieldset className="step motion-step" disabled={!!exporting}>
              <legend>
                <span className="step-number">02</span>
                <span className="legend-title">Set the mood</span>
              </legend>
              <div className="style-options">
                {styles.map((s) => (
                  <label
                    className={`style-option ${style === s.id ? "selected" : ""}`}
                    key={s.id}
                  >
                    <input
                      type="radio"
                      name="motion"
                      value={s.id}
                      checked={style === s.id}
                      onChange={() => {
                        setStyle(s.id);
                        timeRef.current = 0;
                      }}
                    />
                    <span className={`style-thumb ${s.id}`} aria-hidden="true">
                      <span className="mini-orbit" />
                      <span className="mini-art">
                        {token ? (
                          <img src={token.image} alt="" />
                        ) : (
                          <span>?</span>
                        )}
                      </span>
                      <span className="thumb-spark">✦</span>
                      <span className="selection-check">
                        <Icon name="check" size={12} />
                      </span>
                    </span>
                    <strong>{s.name}</strong>
                  </label>
                ))}
              </div>
              <p className="hint mood-description">{currentStyle.detail}</p>
            </fieldset>
            <div className="step title-step">
              <div className="step-heading">
                <span className="step-number">03</span>
                <h2>Give it a title</h2>
              </div>
              <div className="label-row">
                <label htmlFor="card-title">A few words. All you.</label>
                <span className="counter">{Array.from(title).length}/36</span>
              </div>
              <input
                id="card-title"
                type="text"
                name="card-title"
                value={title}
                maxLength={36}
                disabled={!!exporting}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ready for my close-up."
                aria-describedby="title-hint"
              />
              <p className="hint" id="title-hint">
                Leave blank to use the studio title.
              </p>
            </div>
            <div className="export-panel">
              <div className="export-heading">
                <h2>Ready for the feed.</h2>
                <Icon name="spark" size={23} />
              </div>
              <div className="export-buttons">
                <button
                  className="png-button"
                  disabled={!artwork || busy}
                  onClick={() => handleExport("png")}
                >
                  <Icon name="image" />
                  {exporting === "png" ? "Creating…" : "Export PNG"}
                  <Icon name="download" size={17} />
                </button>
                <button
                  className="video-button"
                  disabled={!artwork || busy}
                  onClick={() => handleExport("video")}
                >
                  <Icon name="film" />
                  {exporting === "video"
                    ? `${Math.round(progress * 100)}%`
                    : "Export video"}
                  <Icon name="download" size={17} />
                </button>
              </div>
              <div className="export-specs">
                <span>1080 × 1920 · PNG</span>
                <span>6 seconds · silent MP4</span>
              </div>
              {exporting === "video" && (
                <div className="export-progress">
                  <label htmlFor="video-progress">
                    Making your MP4… {Math.round(progress * 100)}%
                  </label>
                  <progress id="video-progress" value={progress} max={1} />
                  <button
                    onClick={() => exportRef.current?.abort()}
                    className="cancel-button"
                  >
                    Cancel export
                  </button>
                </div>
              )}
              {exportError && (
                <p className="error" role="alert">
                  {exportError}
                </p>
              )}
              <p className="live-message" role="status" aria-live="polite">
                {message}
              </p>
            </div>
          </section>
          <section
            id="preview-panel"
            className={`preview-panel theme-${style}`}
            aria-labelledby="preview-heading"
          >
            <div className="preview-top">
              <h2 id="preview-heading">
                <span className="status-dot" /> Your collector cut
              </h2>
              <span className="format-tag">9:16 vertical</span>
            </div>
            <div className="preview-stage">
              <div className="stage-mark top-left" aria-hidden="true" />
              <div className="stage-mark top-right" aria-hidden="true" />
              <span className="stage-caption" aria-hidden="true">
                MADE TO BE SEEN
              </span>
              <div className="canvas-wrap">
                <canvas
                  ref={canvasRef}
                  width={648}
                  height={1152}
                  role="img"
                  aria-label={`${token ? `Swarm Pepe #${token.id}${token.revealed ? "" : " (unrevealed)"}` : "Collector card placeholder"} in ${currentStyle.name} style. Title: ${title.trim() || "Ready for my close-up."}`}
                />
              </div>
              <div className="stage-mark bottom-left" aria-hidden="true" />
              <div className="stage-mark bottom-right" aria-hidden="true" />
            </div>
            <div className="playback">
              <button
                className="play-button"
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? "Pause preview" : "Play preview"}
              >
                <Icon name={playing ? "pause" : "play"} size={17} />
              </button>
              <span className="playback-label">
                {playing ? "Playing preview" : "Preview paused"}
              </span>
              <div className="timeline" aria-hidden="true">
                <span style={{ width: `${(seconds / 6) * 100}%` }} />
              </div>
              <span className="timecode">
                00:0{Math.floor(seconds)} <span>/ 00:06</span>
              </span>
              <span className="loop-label">LOOP</span>
            </div>
          </section>
        </div>
        <section className="provenance" aria-labelledby="traits-heading">
          <div className="provenance-heading">
            <span className="eyebrow">Straight from the contract</span>
            <h2 id="traits-heading">The details make the Pepe.</h2>
            {token && (
              <a href={tokenLink(token.id)} target="_blank" rel="noreferrer">
                View Pepe #{token.id} <Icon name="external" size={14} />
              </a>
            )}
          </div>
          <div className="traits-content">
            {token?.revealed ? (
              <dl className="traits">
                {token.traits.map((trait, i) => (
                  <div key={`${trait.trait_type}-${i}`}>
                    <dt>{trait.trait_type}</dt>
                    <dd>{trait.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mystery-copy">
                {token
                  ? "Still under wraps. This Pepe is unrevealed — its traits will appear after the on-chain reveal."
                  : "Load a Pepe to see its revealed traits here."}
              </p>
            )}
            <p className="provenance-note">
              {token
                ? `${token.source === "saved" ? "Saved example" : "Ethereum read"} · Block ${Number(token.block).toLocaleString("en-US")}. `
                : ""}
              Frames and motion are studio effects; the artwork stays original.
            </p>
          </div>
        </section>
        <footer>
          <span className="footer-brand">
            A little extra life for your Swarm Pepe.
          </span>
          <span>On-chain art. Off-chain personality.</span>
          <a href={CONTRACT_URL} target="_blank" rel="noreferrer">
            View collection contract <Icon name="external" size={14} />
          </a>
        </footer>
      </main>
      <dialog
        ref={dialogRef}
        className="help-dialog"
        aria-labelledby="help-heading"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="dialog-heading">
          <span className="eyebrow">Behind the premiere</span>
          <button
            className="dialog-close"
            aria-label="Close instructions"
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <h2 id="help-heading">From Pepe to premiere.</h2>
        <ol>
          <li>
            <strong>Cast your Pepe.</strong> Enter its token ID and select Load
            Pepe. The studio reads its original SVG artwork and revealed traits
            directly from the Ethereum contract.
          </li>
          <li>
            <strong>Make it yours.</strong> Choose a motion style and write a
            title. Pause the preview whenever you like.
          </li>
          <li>
            <strong>Take it to the feed.</strong> Save a 1080 × 1920 PNG or a
            six-second, 720 × 1280 silent H.264 MP4. Add music in Reels or
            TikTok after uploading.
          </li>
        </ol>
        <p>
          The first card is a saved, real example of Pepe #1. Load any token to
          check its current on-chain state. Unrevealed tokens keep their
          contract’s mystery artwork and show no invented traits.
        </p>
        <p>
          Exports are made on your device. Keep this tab open while your video
          renders. No wallet, account, or upload is needed.
        </p>
        <div className="dialog-links">
          <a href={CONTRACT_URL} target="_blank" rel="noreferrer">
            Read the contract ↗
          </a>
          <a href="./source.zip" download>
            Download the source ↗
          </a>
        </div>
        <button
          className="load-button dialog-done"
          onClick={() => dialogRef.current?.close()}
        >
          Back to the studio <Icon name="arrow" />
        </button>
      </dialog>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
