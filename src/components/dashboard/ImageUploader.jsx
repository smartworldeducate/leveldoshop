import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ImagePlus, X } from "lucide-react";
import { FOCUS } from "./theme";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB — Cloudinary free-tier friendly
const MAX_DIMENSION = 1600;
/** Below this on either side, the tile looks soft on a retina screen. */
const MIN_RECOMMENDED = 600;

const formatBytes = (bytes) => {
  if (!bytes) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

/**
 * Downscale + compress in the browser before upload, so a 6 MB phone photo
 * does not become a 6 MB product image.
 */
export function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height * MAX_DIMENSION) / width;
          width = MAX_DIMENSION;
        } else {
          width = (width * MAX_DIMENSION) / height;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let quality = 0.9;
      const compress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            if (blob.size <= MAX_IMAGE_SIZE || quality <= 0.4) {
              const out = new File([blob], file.name, { type: blob.type });
              // Carry the final pixel size so the tile can show it without
              // decoding the image a second time.
              out.width = canvas.width;
              out.height = canvas.height;
              return resolve(out);
            }
            quality -= 0.1;
            compress();
          },
          file.type === "image/png" ? "image/png" : "image/jpeg",
          quality
        );
      };
      compress();
    };
    img.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/** Read the intrinsic size of an already-uploaded image URL. */
function useRemoteDimensions(urls) {
  const [sizes, setSizes] = useState({});

  useEffect(() => {
    let cancelled = false;
    urls.forEach((url) => {
      if (!url || sizes[url]) return;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setSizes((prev) => ({ ...prev, [url]: { w: img.naturalWidth, h: img.naturalHeight } }));
        }
      };
      img.src = url;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);

  return sizes;
}

/**
 * Image picker shared by the Products and Posts editors.
 *
 * `images` are URLs already stored, `files` are newly picked File objects —
 * both are shown in one grid, each with its pixel dimensions so the shopkeeper
 * can see what they are actually publishing.
 */
export default function ImageUploader({ images = [], files = [], onChange, label = "Images" }) {
  const [dragging, setDragging] = useState(false);

  // Object URLs must be revoked or the tab leaks a blob per preview.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const remote = useRemoteDimensions(images);

  const accept = async (fileList) => {
    const picked = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!picked.length) return;
    const resized = await Promise.all(picked.map((f) => resizeImage(f).catch(() => f)));
    onChange({ images, files: [...files, ...resized] });
  };

  const removeUrl = (index) =>
    onChange({ images: images.filter((_, i) => i !== index), files });

  const removeFile = (index) =>
    onChange({ images, files: files.filter((_, i) => i !== index) });

  const Tile = ({ src, onRemove, badge, dimensions, weight }) => {
    const small =
      dimensions && (dimensions.w < MIN_RECOMMENDED || dimensions.h < MIN_RECOMMENDED);

    return (
      <figure className="w-[110px]">
        <div className="group relative h-[110px] w-[110px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" />
          {badge && (
            <span className="absolute bottom-1 left-1 rounded-md bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {badge}
            </span>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove image"
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow transition hover:text-rose-600 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <figcaption className="mt-1.5 text-center">
          {dimensions ? (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                small ? "text-amber-600" : "text-slate-500"
              }`}
              title={small ? `Below the recommended ${MIN_RECOMMENDED}px` : "Pixel dimensions"}
            >
              {small && <AlertTriangle className="h-3 w-3" />}
              {dimensions.w}×{dimensions.h}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-slate-300">reading…</span>
          )}
          {weight && <span className="block text-[10px] text-slate-400">{weight}</span>}
        </figcaption>
      </figure>
    );
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className="text-[11px] text-slate-400">
          Square works best · at least {MIN_RECOMMENDED}×{MIN_RECOMMENDED}px · resized to{" "}
          {MAX_DIMENSION}px
        </span>
      </div>

      {(images.length > 0 || files.length > 0) && (
        <div className="mb-3 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <Tile
              key={src}
              src={src}
              badge={i === 0 ? "Cover" : null}
              dimensions={remote[src]}
              onRemove={() => removeUrl(i)}
            />
          ))}
          {previews.map((src, i) => (
            <Tile
              key={src}
              src={src}
              badge={images.length === 0 && i === 0 ? "Cover" : "New"}
              dimensions={
                files[i]?.width ? { w: files[i].width, h: files[i].height } : undefined
              }
              weight={formatBytes(files[i]?.size)}
              onRemove={() => removeFile(i)}
            />
          ))}
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-6 py-7 text-center transition ${FOCUS} ${
          dragging
            ? "border-[#4267B2] bg-[#E4ECFA]"
            : "border-slate-200 bg-[#F8FAFD] hover:border-[#4267B2]"
        }`}
      >
        <input
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
        <ImagePlus className="h-6 w-6 text-[#4267B2]" />
        <p className="text-sm font-semibold text-slate-600">Drag & drop images here</p>
        <p className="text-xs text-slate-400">
          or click to browse — the dimensions of each image are shown once added
        </p>
      </label>
    </div>
  );
}
