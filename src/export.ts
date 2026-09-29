import encoderUrl from "h264-mp4-encoder/embuild/dist/h264-mp4-encoder.web.js?url";

export type CardDraw = (
  context: CanvasRenderingContext2D,
  timeSeconds: number,
) => void;

export const EXPORT = {
  pngWidth: 1080,
  pngHeight: 1920,
  videoWidth: 720,
  videoHeight: 1280,
  frameRate: 24,
  seconds: 6,
} as const;

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  if (!context)
    throw new Error(
      "Your browser could not create the export canvas. Try another browser.",
    );
  return { canvas, context };
}

function drawFrame(
  context: CanvasRenderingContext2D,
  draw: CardDraw,
  time: number,
) {
  context.save();
  context.setTransform(
    context.canvas.width / 1080,
    0,
    0,
    context.canvas.height / 1920,
    0,
    0,
  );
  draw(context, time);
  context.restore();
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Leave the URL alive while mobile browsers hand the file to their download UI.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function exportName(filename: string, extension: string) {
  return `${filename.replace(/\.(png|mp4|webm)$/i, "")}.${extension}`;
}

export async function exportPng(
  draw: CardDraw,
  filename: string,
): Promise<void> {
  await document.fonts.ready;
  const { canvas, context } = makeCanvas(EXPORT.pngWidth, EXPORT.pngHeight);
  drawFrame(context, draw, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("The PNG could not be created. Please try again."));
    }, "image/png");
  });
  download(blob, exportName(filename, "png"));
  canvas.width = canvas.height = 1;
}

// A classic worker keeps the encoder's synchronous work off the interface thread.
// The encoder is bundled locally by Vite; no CDN, server, microphone, or recorder is used.
const encoderWorkerSource = `
let encoder;
self.onmessage = async (event) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      importScripts(message.url);
      encoder = await HME.createH264MP4Encoder();
      encoder.width = message.width;
      encoder.height = message.height;
      encoder.frameRate = message.frameRate;
      encoder.kbps = 4000;
      encoder.speed = 7;
      encoder.groupOfPictures = message.frameRate;
      encoder.initialize();
      self.postMessage({ type: 'ready' });
    } else if (message.type === 'frame') {
      encoder.addFrameRgba(new Uint8Array(message.buffer));
      self.postMessage({ type: 'ready' });
    } else if (message.type === 'finish') {
      encoder.finalize();
      const bytes = encoder.FS.readFile(encoder.outputFilename).slice();
      encoder.delete();
      encoder = null;
      self.postMessage({ type: 'complete', buffer: bytes.buffer }, [bytes.buffer]);
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error && error.message ? error.message : String(error) });
  }
};
`;

type EncoderResponse = {
  type: "ready" | "complete" | "error";
  buffer?: ArrayBuffer;
  message?: string;
};

function cancelled(): DOMException {
  return new DOMException("Export cancelled.", "AbortError");
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw cancelled();
}

function workerStep(
  worker: Worker,
  message: Record<string, unknown>,
  transfer: Transferable[],
  signal?: AbortSignal,
): Promise<EncoderResponse> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelled());
      return;
    }
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onMessageError);
      signal?.removeEventListener("abort", onAbort);
      window.clearTimeout(timeout);
    };
    const onMessage = (event: MessageEvent<EncoderResponse>) => {
      cleanup();
      if (event.data.type === "error")
        reject(new Error(`Video export failed: ${event.data.message}`));
      else resolve(event.data);
    };
    const onError = (event: ErrorEvent) => {
      cleanup();
      reject(
        new Error(
          event.message ||
            "The video encoder could not start. Please try another browser.",
        ),
      );
    };
    const onMessageError = () => {
      cleanup();
      reject(
        new Error(
          "The browser could not transfer a video frame. Please try again.",
        ),
      );
    };
    const onAbort = () => {
      cleanup();
      reject(cancelled());
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "The video encoder took too long to respond. Please try again.",
        ),
      );
    }, 60_000);
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onMessageError);
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      worker.postMessage(message, transfer);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

/** Export exactly 144 frames as a silent, broadly compatible H.264 MP4. */
export async function exportVideo(
  draw: CardDraw,
  filename: string,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  throwIfCancelled(signal);
  await document.fonts.ready;
  throwIfCancelled(signal);
  if (typeof Worker === "undefined") {
    throw new Error(
      "Video export needs browser workers. Please use a current Safari, Chrome, Firefox, or Edge browser.",
    );
  }
  const { canvas, context } = makeCanvas(EXPORT.videoWidth, EXPORT.videoHeight);
  const workerUrl = URL.createObjectURL(
    new Blob([encoderWorkerSource], { type: "text/javascript" }),
  );
  let worker: Worker | undefined;
  try {
    onProgress(0);
    worker = new Worker(workerUrl);
    await workerStep(
      worker,
      {
        type: "init",
        url: new URL(encoderUrl, document.baseURI).href,
        width: EXPORT.videoWidth,
        height: EXPORT.videoHeight,
        frameRate: EXPORT.frameRate,
      },
      [],
      signal,
    );
    const totalFrames = EXPORT.seconds * EXPORT.frameRate;
    for (let frame = 0; frame < totalFrames; frame++) {
      throwIfCancelled(signal);
      drawFrame(context, draw, frame / EXPORT.frameRate);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      await workerStep(
        worker,
        { type: "frame", buffer: pixels.data.buffer },
        [pixels.data.buffer],
        signal,
      );
      // Finishing and downloading occupy the final two percent of the progress bar.
      onProgress(((frame + 1) / totalFrames) * 0.98);
    }
    const result = await workerStep(worker, { type: "finish" }, [], signal);
    throwIfCancelled(signal);
    if (!result.buffer?.byteLength)
      throw new Error("The encoder returned an empty video. Please try again.");
    download(
      new Blob([result.buffer], { type: "video/mp4" }),
      exportName(filename, "mp4"),
    );
    onProgress(1);
  } finally {
    worker?.terminate();
    URL.revokeObjectURL(workerUrl);
    canvas.width = canvas.height = 1;
  }
}
