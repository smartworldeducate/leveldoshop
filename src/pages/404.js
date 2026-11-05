import Head from 'next/head'
import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="my-orders">
      <Head>
        <title>Page not found</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="my-orders__empty">
        <SearchX size={36} />
        <h2>We can't find that page</h2>
        <p>It may have moved, or the address may be wrong.</p>
        <Link href="/catalog" className="shop-btn">Shop groceries</Link>
      </div>
    </div>
  )
}
