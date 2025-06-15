
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Gradient = "sunset-dream" | "electric-ocean" | "royal-pulse";
type SmartQRCodeProps = {
  /**
   * String to encode as a QR code.
   */
  value: string;
  /**
   * Optional - background gradient style.
   */
  gradient?: Gradient;
  /**
   * Optional - a logo or image to render in the QR code's safe center area.
   */
  logo?: React.ReactNode;
  /**
   * Alt text for accessibility.
   */
  alt?: string;
  /**
   * Min pixel size. Defaults to responsive 90vw (max 340px).
   */
  size?: number;
  /**
   * Error correction level to use. Default is "H".
   */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  /**
   * If true, show shimmer/pulse edge. Default true.
   */
  scanPulse?: boolean;
  /**
   * Called if QR fails to generate
   */
  onError?: (error: any) => void;
  /**
   * Optional className for the wrapper
   */
  className?: string;
};

function pickContrast(bg: string) {
  // rudimentary: use a light color for dark backgrounds and vice versa
  // bg is expected as a tailwind gradient name e.g. "electric-ocean"
  // fallback: check theme, else light
  if (typeof window !== "undefined" && window.matchMedia) {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (
      bg === "royal-pulse" ||
      (bg === "electric-ocean" && isDark) ||
      (bg === "sunset-dream" && isDark)
    ) return "#fff";
  }
  return "#1f2937";
}

const gradientMap: Record<Gradient, string[]> = {
  "sunset-dream": ["from-[#FF512F]", "to-[#DD2476]"],
  "electric-ocean": ["from-[#396afc]", "to-[#2948ff]"],
  "royal-pulse": ["from-[#6A00F4]", "to-[#AD00FF]"],
};

export const SmartQRCode: React.FC<SmartQRCodeProps> = ({
  value,
  gradient = "electric-ocean",
  logo,
  alt = "QR Code",
  size,
  errorCorrectionLevel = "H",
  scanPulse = true,
  onError,
  className
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLImageElement | null>(null);

  // Dynamic, device-aware size
  const qrSize = size ?? Math.min(window.innerWidth * 0.9, 340);

  // Color pick: auto switch for dark bg (fully white or dark for best contrast)
  const qrColor = useMemo(() => pickContrast(gradient), [gradient]);
  const bgGradient = gradientMap[gradient].join(" ");

  // Generate QR code on value/size changes
  useEffect(() => {
    let ignore = false;
    setError(null);
    QRCode.toDataURL(value, {
      width: qrSize,
      margin: 2,
      color: {
        dark: qrColor,
        light: "#fff",
      },
      errorCorrectionLevel,
      scale: 8, // allow for high resolution
    })
      .then((url: string) => {
        if (!ignore) setQrDataUrl(url);
      })
      .catch((err) => {
        setQrDataUrl(null);
        setError("Failed to generate QR");
        if (onError) onError(err);
        toast({
          title: "QR Error",
          description: "Failed to generate QR code.",
          variant: "destructive"
        });
      });

    return () => { ignore = true };
  }, [value, qrSize, errorCorrectionLevel, qrColor, onError]);

  // Animation: fade/pulse on mount
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 40);
    return () => clearTimeout(t);
  }, []);

  // Copy QR/pay string
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      toast({
        title: "Copied!",
        description: "QR data copied to clipboard.",
      });
    });
  }, [value]);

  // Share QR if supported
  const handleShare = useCallback(async () => {
    if (navigator.share && qrDataUrl) {
      const blob = await fetch(qrDataUrl).then(r => r.blob());
      const file = new File([blob], "qr.png", { type: "image/png" });
      navigator.share({
        title: "QR Code",
        files: [file],
        text: value,
      })
      .catch(() => handleCopy());
    } else {
      handleCopy();
    }
  }, [qrDataUrl, value, handleCopy]);

  // Tap-to-copy or share
  const handleTap = useCallback(() => {
    handleShare();
    if (window.navigator.vibrate) window.navigator.vibrate([22, 38]);
  }, [handleShare]);

  // Accessible fallback / retry
  if (error) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center rounded-3xl bg-red-50/90 border border-red-200 min-h-[200px] p-4",
        className
      )}>
        <p className="text-xl font-semibold text-red-700 mb-2">QR generation error!</p>
        <button
          className="mt-4 text-sm px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
          onClick={() => window.location.reload()}
        >Retry</button>
        <div className="mt-4 text-base text-gray-800">Code: <span className="font-mono text-black bg-white/70 px-2 py-1 break-all rounded">{value}</span></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full",
        "rounded-3xl", "p-2",
        "animate-fade-in",
        className
      )}
      style={{
        maxWidth: qrSize + 32,
        minHeight: qrSize + 32
      }}
    >
      {/* Outer animated border & glass with gradient */}
      <div
        className={cn(
          "absolute inset-0 z-0 rounded-3xl pointer-events-none transition-opacity",
          scanPulse ? "before:animate-glow-pulse" : "",
          "before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-br",
        )}
        style={{
          background: `linear-gradient(135deg, ${gradientMap[gradient][0].replace('from-', '')}, ${gradientMap[gradient][1].replace('to-', '')})`,
          filter: "blur(12px)",
          opacity: 0.7
        }}
        aria-hidden="true"
      />
      {/* Glass and glow container */}
      <div
        className={cn(
          "relative z-10 bg-white/85 dark:bg-black/40 glass-card shadow-xl flex items-center justify-center rounded-3xl overflow-visible",
          scanPulse && "animate-glow-pulse",
        )}
        style={{
          width: qrSize,
          height: qrSize,
          minWidth: 160,
          minHeight: 160,
          maxWidth: 480,
          maxHeight: 480,
          borderRadius: 32,
          boxShadow: "0 0 22px 0 rgba(90,100,255,0.07)"
        }}
        tabIndex={0}
        aria-label={alt}
        onClick={handleTap}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleTap() }}
        role="img"
      >
        {/* QR image or loader */}
        {!qrDataUrl ? (
          <div className="flex items-center justify-center h-full w-full animate-pulse">
            <div className="w-12 h-12 rounded-full border-[3px] border-purple-300 border-dashed animate-spin"></div>
          </div>
        ) : (
          <div className="relative flex items-center justify-center w-full h-full">
            <img
              ref={qrRef}
              src={qrDataUrl}
              alt={alt}
              width={qrSize}
              height={qrSize}
              className={cn(
                "block rounded-2xl max-w-full max-h-full drop-shadow-[0_0_20px_rgba(57,106,252,0.09)]",
                "transition-transform duration-200 active:scale-95"
              )}
              draggable={false}
              style={{
                boxShadow: scanPulse ? "0 0 32px 3px rgba(99, 102, 241, 0.14)" : undefined,
                background: "transparent"
              }}
              tabIndex={0}
              aria-label={alt}
            />
            {/* Center logo slot (if present) */}
            {logo && (
              <span
                className="absolute left-1/2 top-1/2 z-30"
                style={{
                  transform: "translate(-50%,-50%)",
                  width: qrSize * 0.2,
                  height: qrSize * 0.2,
                  maxWidth: 64,
                  maxHeight: 64,
                  background: "rgba(255,255,255,0.84)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 0 4px rgba(255,255,255,0.14)"
                }}
              >
                {logo}
              </span>
            )}
            {/* Ripple for tap effect */}
            <span className="absolute inset-0 rounded-2xl pointer-events-none ripple"/>
          </div>
        )}
      </div>
      {/* Copy/share label below */}
      <div className="text-xs text-center text-gray-600 dark:text-gray-300 mt-2 select-none">
        Tap QR to copy or share
      </div>
      {/* Show backup plain string if generation failed */}
      {(!qrDataUrl && !error) && (
        <div className="mt-3 bg-gray-200/90 dark:bg-gray-800/80 rounded-xl px-3 py-2 break-all font-mono text-base text-gray-900 dark:text-gray-100">{value}</div>
      )}
    </div>
  );
};

export default SmartQRCode;
