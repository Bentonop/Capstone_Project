"use client";
import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onResult: (decodedText: string) => void;
  onError?: (error: any) => void;
  id?: string;
}

export default function QrScanner({ onResult, onError, id = "qr-reader" }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Only render once per element id
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onResult(decodedText);
        },
        (errorMessage) => {
          if (onError) onError(errorMessage);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Error clearing scanner:", e));
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="w-full relative bg-black rounded-2xl overflow-hidden shadow-inner border border-surface-container-highest">
      <style>{`
        #${id} {
          width: 100%;
          border: none !important;
        }
        #${id}__scan_region {
          min-height: 200px;
        }
        #${id}__dashboard {
          padding: 10px;
          background: #1E201D;
          color: white;
        }
        #${id}__dashboard a {
          color: #D4A72C;
        }
        #${id}__dashboard button {
          background-color: #D4A72C;
          color: #1E201D;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 5px;
          font-size: 13px;
        }
      `}</style>
      <div id={id}></div>
    </div>
  );
}
