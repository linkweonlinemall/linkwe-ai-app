"use client";

import { useState, type ChangeEvent, type ComponentProps } from "react";

import Input from "@/components/ui/Input";
import { compressImageFile } from "@/lib/images/compress-image";

/**
 * After compression, individual files above this threshold are rejected with a
 * clear message rather than letting the server-action body-size limit silently
 * kill the whole submission.
 */
const MAX_COMPRESSED_BYTES = 7 * 1024 * 1024; // 7 MB

type FileStatus =
  | { state: "compressing" }
  | { state: "done" }
  | { state: "failed"; message: string };

type OwnProps = {
  /**
   * Called with `true` when compression starts, `false` when every file has
   * settled (success **or** failure). Fires `false` in a `finally` block, so
   * it can never get stuck `true` even if an unexpected error is thrown.
   *
   * Wire this to a `useState` in the parent form and gate your Save button on
   * it:  `disabled={pending || imagesUploading}`.
   *
   * **Optional** — existing callers that don't pass this prop continue to work
   * identically to before (compression still happens, onChange still fires).
   */
  onUploadingChange?: (isUploading: boolean) => void;
};

// We always force type="file" internally, so callers can't accidentally pass
// a conflicting type. Everything else from Input is accepted unchanged.
type Props = Omit<ComponentProps<typeof Input>, "type"> & OwnProps;

/**
 * Drop-in replacement for `<Input type="file">`.
 *
 * — Compresses every selected image client-side before it reaches the form
 *   (preserves existing behaviour).
 * — Uses `Promise.allSettled` so one bad file never aborts the rest.
 * — Renders inline progress ("Uploading X/Y…") and per-file ✓/✗ feedback.
 * — Signals upload state via the optional `onUploadingChange` prop so the
 *   parent can block Save while compression is in flight.
 */
export default function CompressedFileInput({
  onUploadingChange,
  onChange,
  ...rest
}: Props) {
  const [fileStatuses, setFileStatuses] = useState<
    { name: string; status: FileStatus }[]
  >([]);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = input.files;

    if (!files || files.length === 0) {
      setFileStatuses([]);
      onChange?.(e);
      return;
    }

    const fileArray = Array.from(files);

    // Initialise one status row per file before any async work.
    setFileStatuses(
      fileArray.map((f) => ({ name: f.name, status: { state: "compressing" } })),
    );

    try {
      onUploadingChange?.(true);

      const results = await Promise.allSettled(
        fileArray.map(async (file, i) => {
          const markFailed = (message: string) => {
            setFileStatuses((prev) => {
              const next = [...prev];
              next[i] = { name: file.name, status: { state: "failed", message } };
              return next;
            });
          };

          let compressed: File;
          try {
            compressed = await compressImageFile(file);
          } catch {
            markFailed("Couldn't compress — try a different image format.");
            throw new Error("compression_failed");
          }

          if (compressed.size > MAX_COMPRESSED_BYTES) {
            markFailed(
              `Still too large after compression (${(compressed.size / 1024 / 1024).toFixed(1)} MB). Max is 7 MB.`,
            );
            throw new Error("too_large");
          }

          setFileStatuses((prev) => {
            const next = [...prev];
            next[i] = { name: file.name, status: { state: "done" } };
            return next;
          });

          return compressed;
        }),
      );

      // Write only the successfully compressed files back onto the native
      // input, preserving their original order. Callers that read
      // e.target.files in their onChange (e.g. to build previews) will see
      // only the good files.
      const dt = new DataTransfer();
      results.forEach((r) => {
        if (r.status === "fulfilled") dt.items.add(r.value);
      });
      input.files = dt.files;

      onChange?.(e);
    } finally {
      // Guaranteed to fire — even if an unexpected error escapes allSettled.
      onUploadingChange?.(false);
    }
  }

  const compressing = fileStatuses.some((f) => f.status.state === "compressing");
  const doneCount = fileStatuses.filter((f) => f.status.state === "done").length;
  const total = fileStatuses.length;
  const failures = fileStatuses.filter(
    (f): f is { name: string; status: { state: "failed"; message: string } } =>
      f.status.state === "failed",
  );

  return (
    <div>
      <Input {...rest} type="file" onChange={handleChange} />

      {fileStatuses.length > 0 && (
        <div className="mt-2 space-y-1" aria-live="polite">

          {/* ── In-progress header: scarlet spinner + live count ── */}
          {compressing && (
            <>
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                <span
                  aria-hidden
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-[#D4450A] shrink-0"
                />
                Uploading {doneCount} of {total}…
              </p>
              <p className="text-xs text-zinc-400">
                Large photos are optimized before upload — this can take a moment.
                Please keep this page open.
              </p>
            </>
          )}

          {/* ── Per-file rows, shown while in progress so each result is visible as it lands ── */}
          {compressing &&
            fileStatuses.map((f, i) => {
              if (f.status.state === "done") {
                return (
                  <p key={i} className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <span aria-hidden className="shrink-0 font-semibold">✓</span>
                    <span className="truncate">{f.name}</span>
                  </p>
                );
              }
              if (f.status.state === "failed") {
                return (
                  <p key={i} className="flex items-center gap-1.5 text-xs text-red-500">
                    <span aria-hidden className="shrink-0 font-semibold">✗</span>
                    <span className="truncate">{f.name}</span>
                  </p>
                );
              }
              // still compressing
              return (
                <p key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-zinc-300 border-t-zinc-500 shrink-0"
                  />
                  <span className="truncate">{f.name}</span>
                </p>
              );
            })}

          {/* ── Post-settle: failures with full error detail ── */}
          {!compressing &&
            failures.map((f, i) => (
              <p key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                <span aria-hidden className="mt-px shrink-0 font-semibold">
                  ✗
                </span>
                <span>
                  <span className="font-medium">{f.name}</span>
                  {" — "}
                  {f.status.message}
                </span>
              </p>
            ))}

          {!compressing && failures.length > 0 && doneCount > 0 && (
            <p className="text-xs text-amber-700">
              {failures.length} file{failures.length > 1 ? "s" : ""} failed;{" "}
              {doneCount} file{doneCount > 1 ? "s were" : " was"} added successfully.
            </p>
          )}

          {!compressing && failures.length > 0 && doneCount === 0 && (
            <p className="text-xs text-red-600">
              No files could be processed. Please try again or choose different images.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
