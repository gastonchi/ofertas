import type { IScannerControls } from "@zxing/browser";

const EAN_RE = /^\d{8,14}$/;

function normalizeEan(raw: string): string {
  return raw.replace(/\D/g, "");
}

export type ZxingScanSession = {
  stop: () => void;
};

/**
 * Escaneo por cámara con ZXing (Safari/iOS y otros sin BarcodeDetector).
 */
export async function startZxingBarcodeScan(
  video: HTMLVideoElement,
  onDetect: (ean: string) => void,
): Promise<ZxingScanSession> {
  const { BrowserCodeReader, BrowserMultiFormatReader, BarcodeFormat } =
    await import("@zxing/browser");
  const { DecodeHintType } = await import("@zxing/library");

  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 150,
  });

  let controls: IScannerControls | null = null;

  controls = await reader.decodeFromConstraints(
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    },
    video,
    (result, _error, scanControls) => {
      if (!result) return;
      const ean = normalizeEan(result.getText());
      if (!EAN_RE.test(ean)) return;
      scanControls.stop();
      onDetect(ean);
    },
  );

  return {
    stop: () => {
      controls?.stop();
      BrowserCodeReader.releaseAllStreams();
      video.srcObject = null;
    },
  };
}
