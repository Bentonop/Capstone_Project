"use client";
import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onResult: (decodedText: string) => void;
  onError?: (error: any) => void;
}

export default function QrScanner({ onResult, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // We only want to render it once
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onResult(decodedText);
          // Optional: pause or clear after scan
        },
        (errorMessage) => {
          if (onError) onError(errorMessage);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps so it only runs once

  return (
    <div className="w-full relative bg-black rounded-2xl overflow-hidden shadow-inner border border-surface-container-highest">
      <style>{`
        #qr-reader {
          width: 100%;
          border: none !important;
        }
        #qr-reader__scan_region {
          min-height: 200px;
        }
        #qr-reader__dashboard {
          padding: 10px;
          background: white;
          color: black;
        }
        #qr-reader__dashboard a {
          color: #D4AF37;
        }
        #qr-reader__dashboard button {
          background-color: #D4AF37;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 5px;
        }
      `}</style>
      <div id="qr-reader"></div>
    </div>
  );
}
