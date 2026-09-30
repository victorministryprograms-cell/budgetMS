"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label } from "@/components/ui";

export type AttachmentItem = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.csv,.txt";
const MAX_BYTES = 2 * 1024 * 1024;

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentUploader({ transactionId, onUploaded }: { transactionId: string; onUploaded?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`File is too large (${humanSize(file.size)}). Maximum size is 2MB.`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("transactionId", transactionId);
      const res = await fetch("/api/attachments", { method: "POST", body: fd });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? "Upload failed.");
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      onUploaded?.();
      router.refresh();
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 px-5 py-4">
      <Label>Attach a file</Label>
      <input
        id="attachment-file"
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:bg-white file:px-3 file:py-1.5 file:text-sm"
      />
      <p className="text-xs text-zinc-500">PDF, PNG, JPEG, WebP, GIF, CSV or text. Up to 2MB. Stored in the database.</p>
      {busy && <p className="text-xs text-zinc-500">Uploading…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AttachmentList({ items }: { items: AttachmentItem[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(json?.error?.message ?? "Delete failed.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return <p className="px-5 py-4 text-sm text-zinc-500">No attachments.</p>;

  return (
    <div className="px-5 py-4">
      <ul className="divide-y text-sm">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              {/* Download goes through the authenticated API route, not the BLOB. */}
              <a href={`/api/attachments/${a.id}`} className="truncate font-medium text-blue-700 hover:underline">
                {a.filename}
              </a>
              <p className="text-xs text-zinc-500">{a.contentType} · {humanSize(a.sizeBytes)}</p>
            </div>
            <Button type="button" variant="ghost" disabled={busyId === a.id} onClick={() => void remove(a.id)}>
              {busyId === a.id ? "…" : "Remove"}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
