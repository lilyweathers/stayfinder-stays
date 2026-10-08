"use client";

import Image from "next/image";
import { useState } from "react";

export default function PropertyImage({ src, title, detail = false }: {
  src?: string | null; title: string; detail?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = src?.startsWith("https://") && failedSrc !== src;
  return <div className={`property-image${detail ? " property-image-detail" : ""}`}>
    {usable && src ? <Image src={src} alt={`Photo for ${title}`} fill unoptimized
      sizes={detail ? "(max-width: 960px) 100vw, 912px" : "(max-width: 600px) 100vw, 300px"}
      loading={detail ? "eager" : "lazy"} onError={() => setFailedSrc(src)} />
      : <span>Photo unavailable</span>}
  </div>;
}
