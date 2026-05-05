'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface QrScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const isMounted = useRef(true);
  const hasScanned = useRef(false);

  const onScanSuccess = useCallback((decodedText: string) => {
    if (hasScanned.current) return;
    hasScanned.current = true;

    const scanner = scannerRef.current;
    if (scanner) {
      scanner.stop().then(() => {
        if (isMounted.current) {
          onScan(decodedText);
        }
      }).catch(() => {
        if (isMounted.current) {
          onScan(decodedText);
        }
      });
    } else {
      if (isMounted.current) {
        onScan(decodedText);
      }
    }
  }, [onScan]);

  useEffect(() => {
    isMounted.current = true;
    let scanner: { stop: () => Promise<void> } | null = null;

    async function startScanner() {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!isMounted.current) return;

      const qrScanner = new Html5Qrcode('qr-reader');
      scanner = qrScanner;
      scannerRef.current = qrScanner;

      try {
        await qrScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => onScanSuccess(decodedText),
          () => {}
        );
      } catch (err) {
        if (isMounted.current) {
          setError(
            err instanceof Error ? err.message : 'ไม่สามารถเปิดกล้องได้'
          );
        }
      }
    }

    startScanner();

    return () => {
      isMounted.current = false;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [onScanSuccess]);

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
