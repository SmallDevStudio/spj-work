"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { HiOutlinePhoto, HiXMark } from "react-icons/hi2";

import { IMAGE_UPLOAD } from "@/constants/image-upload";
import { uploadImageRequest } from "@/services/media/image-upload.api";

export function ImagePlaceholder({ size = 72 }) {
  return <span className="flex shrink-0 items-center justify-center rounded-xl bg-[#f0f1f2] text-[#899398]" style={{ width: size, height: size }} aria-hidden="true">
    <HiOutlinePhoto style={{ width: size * 0.52, height: size * 0.52 }} />
  </span>;
}

export default function ImageUploadDialog({ onClose, onUploaded, purpose, companyId }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function selectFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!IMAGE_UPLOAD.acceptedTypes.includes(selected.type) || selected.size > IMAGE_UPLOAD.maxBytes) {
      setFile(null);
      setError("รองรับ PNG, JPG, WebP ขนาดไม่เกิน 2 MB");
      return;
    }
    setError(""); setFile(selected); setPreview(URL.createObjectURL(selected));
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError("");
    try {
      const item = await uploadImageRequest({ file, purpose, companyId });
      await onUploaded(item.url);
      onClose();
    } catch (cause) {
      setError(cause?.response?.data?.error?.message ?? cause?.message ?? "อัปโหลดไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="upload-image-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3"><div><h2 id="upload-image-title" className="text-xl font-bold text-slate-950 dark:text-white">อัปโหลดโลโก้บริษัท</h2><p className="mt-1 text-sm text-slate-500">แนะนำรูปสี่เหลี่ยมจัตุรัส {IMAGE_UPLOAD.recommendedSize}</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="ปิด" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><HiXMark className="size-5" /></button></div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex min-h-44 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 hover:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          {preview ? <Image unoptimized src={preview} alt="ตัวอย่างโลโก้ที่เลือก" width={150} height={150} className="max-h-36 w-auto object-contain" /> : <ImagePlaceholder size={110} />}
          <span>{file ? file.name : "กดเพื่อเลือกรูปภาพ"}</span>
        </button>
        <input ref={inputRef} type="file" accept={IMAGE_UPLOAD.acceptedTypes.join(",")} onChange={selectFile} className="sr-only" aria-label="เลือกรูปโลโก้" />
        <p className="text-xs text-slate-500">PNG, JPG หรือ WebP · ไม่เกิน 2 MB · แนะนำ {IMAGE_UPLOAD.recommendedSize}</p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm dark:text-white">ยกเลิก</button><button type="submit" disabled={!file || busy} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? "กำลังอัปโหลด" : "อัปโหลดรูป"}</button></div>
      </form>
    </div>
  </div>;
}
