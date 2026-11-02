import { Package } from 'lucide-react'

/** Storefront product image, or an icon tile while a product has no photo. */
export function ItemThumb({ src }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="item-thumb" />
  ) : (
    <span className="item-thumb item-thumb--empty"><Package size={22} strokeWidth={1.75} /></span>
  )
}
