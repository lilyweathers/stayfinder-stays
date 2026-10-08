"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { validatePhoto } from "@/lib/profile-photo";

export default function ProfilePhotoField({ currentUrl, disabled = false }: { currentUrl?: string | null; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const src = remove ? "" : preview || currentUrl;
  return <div className="profile-photo-field">
    {src && <Image src={src} alt="Profile photo preview" width={96} height={96} unoptimized className="profile-photo-preview" />}
    <label>Profile photo (optional)<input ref={inputRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || remove} aria-describedby="profile-photo-help" onChange={event => {
      const selected = event.currentTarget.files?.[0]; setError("");
      if (!selected) { setPreview(""); return; }
      try { validatePhoto(selected); setPreview(URL.createObjectURL(selected)); }
      catch (cause) { setPreview(""); event.currentTarget.value = ""; setError(cause instanceof Error ? cause.message : "Invalid photo."); }
    }} /></label>
    <p id="profile-photo-help">JPEG, PNG, or WebP, up to 5 MB.</p>
    {currentUrl && <label className="profile-remove-photo"><input type="checkbox" name="remove_photo" checked={remove} disabled={disabled} onChange={event => { setRemove(event.target.checked); setPreview(""); if (inputRef.current) inputRef.current.value = ""; }} />Remove current photo</label>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
