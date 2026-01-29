import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Section, { SectionBody, SectionTitle } from '../../components/Section'
import Grid from '../../components/Grid'
import ProductCard from '../../components/ProductCard'
import ProductView from '../../components/ProductView'

// Redux
import { useSelector, useDispatch } from 'react-redux'
import { fetchProducts } from '../../redux/products/productsSlice'

export default function Product() {
  const router = useRouter()
  const { slug } = router.query
  const dispatch = useDispatch()

  const products = useSelector(state => state.products.items)

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])

  // Fetch all products from Redux
  useEffect(() => {
    dispatch(fetchProducts())
  }, [dispatch])

  // Set current product and related products
  useEffect(() => {
    if (!slug || !products || products.length === 0) return

    const mainProduct = products.find(p => p.slug === slug)
    if (!mainProduct) return setProduct(null)
    setProduct(mainProduct)

    const related = products
      .filter(p => p.categorySlug === mainProduct.categorySlug && p.slug !== slug)
      .slice(0, 8)
    setRelatedProducts(related)
  }, [slug, products])

  // Scroll to top on slug change
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [slug])

  if (!product) return <p>Product not found!</p>

  return (
    <>
      <Head>
        <title>{product.title}</title>
        <meta name="description" content={product.description || product.title} />
      </Head>

      <Section>
        <SectionBody>
          <ProductView product={product} />
        </SectionBody>
      </Section>

      <Section>
        <SectionTitle>Discover more</SectionTitle>
        <SectionBody>
          <Grid col={4} mdCol={2} smCol={1} gap={20}>
            {relatedProducts.map((item, index) => (
              <ProductCard
                key={index}
                img01={item.images[0]}
                img02={item.images[1] || item.images[0]}
                name={item.title}
                price={Number(item.price)}
                slug={item.slug}
              />
            ))}
          </Grid>
        </SectionBody>
      </Section>
    </>
  )
}
