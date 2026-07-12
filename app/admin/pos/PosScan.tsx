"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { addPosItem } from "./actions";

// SKU/barcode entry for POS. Type a code and press Enter, or tap "Scan" to use
// the device camera (works on a phone over HTTPS). A decoded barcode is dropped
// into the SKU field and submitted, so scanning rings items up hands-free.
export function PosScan() {
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });

  useEffect(() => {
    return () => controlsRef.current?.stop();
  }, []);

  async function start() {
    setErr(null);
    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (!result) return;
          const code = result.getText().trim();
          const now = Date.now();
          if (!code) return;
          // Debounce repeat reads of the same barcode.
          if (code === lastRef.current.code && now - lastRef.current.t < 2500) return;
          lastRef.current = { code, t: now };
          if (inputRef.current && formRef.current) {
            inputRef.current.value = code;
            formRef.current.requestSubmit();
          }
        },
      );
      setScanning(true);
    } catch {
      setErr("Camera unavailable — check permissions and that the site is on HTTPS.");
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  return (
    <div>
      <form ref={formRef} action={addPosItem} className="pos-scan">
        <input
          ref={inputRef}
          className="input"
          name="sku"
          placeholder="Scan / type SKU or barcode…"
          autoComplete="off"
          autoFocus
        />
        <button type="submit" className="btn-primary">Add</button>
        <button type="button" className="btn-sec" onClick={scanning ? stop : start}>
          {scanning ? "Stop" : "Scan"}
        </button>
      </form>

      {scanning && (
        <div className="pos-cam">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} muted playsInline />
        </div>
      )}
      {err && (
        <div
          className="banner-ok"
          style={{ borderColor: "rgba(239,68,68,.3)", background: "var(--danger-t)", color: "var(--danger)" }}
        >
          {err}
        </div>
      )}
    </div>
  );
}
