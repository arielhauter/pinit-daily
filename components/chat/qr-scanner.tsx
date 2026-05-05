'use client';

import { useEffect, useRef, useState } from 'react';

interface QrScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stopped = false;

    async function startScanner() {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (stopped) return;

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            scanner.stop().catch(() => {});
            onScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        if (!stopped) {
          setError(
            err instanceof Error ? err.message : 'ไม่สามารถเปิดกล้องได้'
          );
        }
      }
    }

    startScanner();

    return () => {
      stopped = true;
      const scanner = scannerRef.current as { stop: () => Promise<void> } | null;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-lg"
      >
        ✕
      </button>

      <div className="text-white text-sm mb-4">สแกน QR Code สินค้า</div>

      <div
        ref={containerRef}
        id="qr-reader"
        className="w-[300px] h-[300px] rounded-lg overflow-hidden"
      />

      {error && (
        <div className="mt-4 text-red-300 text-sm text-center px-8">
          {error}
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-6 text-slate-300 text-sm bg-slate-800 px-4 py-2 rounded-full"
      >
        ปิด
      </button>
    </div>
  );
}
