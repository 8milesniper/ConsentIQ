import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCode = ({ value, size = 200, className = "" }: QRCodeProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCodeLib.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) {
          console.error('QR Code generation error:', error);
        }
      });
    }
  }, [value, size]);

  if (!value) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <canvas 
      ref={canvasRef}
      className={`border-2 border-gray-200 rounded-2xl ${className}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};