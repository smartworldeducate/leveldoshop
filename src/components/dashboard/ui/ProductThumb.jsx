import { Package } from "lucide-react";

/** Product image, or a tinted tile with an icon while a product has no photo. */
export default function ProductThumb({ src, className = "h-11 w-11" }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`shrink-0 rounded-xl object-cover ${className}`} />;
  }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#E4ECFA] text-[#4267B2] ${className}`}>
      <Package className="h-1/2 w-1/2" strokeWidth={1.75} />
    </span>
  );
}
