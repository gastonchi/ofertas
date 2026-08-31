"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ScanBarcode, X } from "lucide-react";
import { startZxingBarcodeScan } from "@/lib/barcode/zxing-scan";

type DetectedBarcode = { rawValue: string };

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorCtor = new (opts?: {
  formats?: string[];
}) => BarcodeDetectorLike;

const EAN_RE = /^\d{8,14}$/;
const SCAN_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

function normalizeEan(raw: string): string {
  return raw.replace(/\D/g, "");
}

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return ctor ?? null;
}

async function createDetector(): Promise<BarcodeDetectorLike | null> {
  const Detector = getBarcodeDetectorCtor();
  if (!Detector) return null;
  try {
    return new Detector({ formats: SCAN_FORMATS });
  } catch {
    try {
      return new Detector();
    } catch {
      return null;
    }
  }
}

export function BarcodeField({
  id,
  name,
  value,
  onValueChange,
  onScan,
  lookingUp,
  autoFocus,
}: {
  id: string;
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onScan: (ean: string) => void;
  lookingUp: boolean;
  autoFocus?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const onValueChangeRef = useRef(onValueChange);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    onValueChangeRef.current = onValueChange;
  }, [onScan, onValueChange]);

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let zxingSession: { stop: () => void } | null = null;

    function finishScan(ean: string) {
      cancelled = true;
      onValueChangeRef.current(ean);
      onScanRef.current(ean);
      setCameraOpen(false);
    }

    async function runNativeDetector(detector: BarcodeDetectorLike) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Este navegador no puede usar la cámara. Pegá el EAN o usá un lector USB.",
        );
        setCameraOpen(false);
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      await video.play();
      if (cancelled) return;

      const tick = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const ean = normalizeEan(codes[0]?.rawValue ?? "");
          if (EAN_RE.test(ean)) {
            finishScan(ean);
            return;
          }
        } catch {
          // El frame todavía no está listo para detectar.
        }
        raf = requestAnimationFrame(() => {
          void tick();
        });
      };

      raf = requestAnimationFrame(() => {
        void tick();
      });
    }

    async function runZxingDetector() {
      const video = videoRef.current;
      if (!video) return;

      zxingSession = await startZxingBarcodeScan(video, (ean) => {
        if (!cancelled) finishScan(ean);
      });
    }

    async function run() {
      try {
        const detector = await createDetector();
        if (detector) {
          await runNativeDetector(detector);
        } else {
          await runZxingDetector();
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            "No se pudo abrir la cámara. Revisá el permiso del navegador.",
          );
          setCameraOpen(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      zxingSession?.stop();
      stream?.getTracks().forEach((track) => track.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [cameraOpen]);

  function submitEan(raw: string) {
    const ean = normalizeEan(raw);
    onValueChange(ean);
    if (EAN_RE.test(ean)) onScan(ean);
  }

  return (
    <div className="field">
      <label htmlFor={id}>EAN</label>
      <div className="ean-scan-row">
        <input
          id={id}
          name={name}
          required
          inputMode="numeric"
          pattern="\d{8,14}"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder="7790…"
          onChange={(event) => onValueChange(normalizeEan(event.target.value))}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            submitEan(event.currentTarget.value);
          }}
          onPaste={(event) => {
            const ean = normalizeEan(event.clipboardData.getData("text"));
            if (!EAN_RE.test(ean)) return;
            event.preventDefault();
            submitEan(ean);
          }}
        />
        <button
          type="button"
          className="btn-ghost btn-icon"
          disabled={lookingUp}
          aria-label={
            lookingUp
              ? "Buscando nombre"
              : cameraOpen
                ? "Cerrar cámara"
                : "Escanear código de barras"
          }
          title={
            lookingUp
              ? "Buscando…"
              : cameraOpen
                ? "Cerrar cámara"
                : "Escanear"
          }
          onClick={() => {
            setCameraError(null);
            setCameraOpen((open) => !open);
          }}
        >
          {lookingUp ? (
            <Loader2 size={18} className="spin" aria-hidden />
          ) : cameraOpen ? (
            <X size={18} aria-hidden />
          ) : (
            <ScanBarcode size={18} aria-hidden />
          )}
        </button>
      </div>
      {cameraOpen ? (
        <div className="barcode-preview">
          <video ref={videoRef} muted playsInline autoPlay />
        </div>
      ) : null}
      {cameraError ? <p className="form-error">{cameraError}</p> : null}
      <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
        Escaneá con la cámara o con un lector USB.
      </p>
    </div>
  );
}
