import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'

import HeroSlider from '../components/HeroSlider'
import Section, { SectionTitle, SectionBody } from '../components/Section'
import PolicyCard from '../components/PolicyCard'
import Grid from '../components/Grid'
import ProductCard from '../components/ProductCard'

import heroSliderData from '../assets/fake-data/hero-slider'
import policy from '../assets/fake-data/policy'
import banner from '../assets/images/banner.png'

// Firebase
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

export default function Home() {
  const [products, setProducts] = useState([])
  const [bestSelling, setBestSelling] = useState([])
  const [newProducts, setNewProducts] = useState([])
  const [popularProducts, setPopularProducts] = useState([])

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productCol = collection(db, 'products')
        const productSnapshot = await getDocs(productCol)
        const productList = productSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setProducts(productList)
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }

    fetchProducts()
  }, [])

  // Categorize products for sections
  useEffect(() => {
    if (products.length === 0) return

    const shuffleArray = (arr) => {
      const array = [...arr]
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
      return array
    }

    setBestSelling(shuffleArray(products).slice(0, 4))
    setNewProducts(shuffleArray(products).slice(0, 8))
    setPopularProducts(shuffleArray(products).slice(0, 12))
  }, [products])

  return (
    <>
      <Head>
        <title>Home Page</title>
        <meta name="description" content="YoloShop - Home Page" />
      </Head>

      {/* Hero Slider */}
      <HeroSlider
        data={heroSliderData}
        control
        auto={false}
        timeOut={5000}
      />

      {/* Policy Section */}
      <Section>
        <SectionBody>
          <Grid col={4} mdCol={2} smCol={1} gap={20}>
            {policy.map((item, index) => (
              <Link key={index} href="/policy" legacyBehavior>
                <a>
                  <PolicyCard
                    name={item.name}
                    description={item.description}
                    icon={item.icon}
                  />
                </a>
              </Link>
            ))}
          </Grid>
        </SectionBody>
      </Section>

      {/* Best Selling Section */}
      <Section>
        <SectionTitle>Top Best-Selling Products of the Week</SectionTitle>
        <SectionBody>
          <Grid col={4} mdCol={2} smCol={1} gap={20}>
            {bestSelling.map(item => (
              <ProductCard
                key={item.id}
                img01={item.images?.[0]}
                img02={item.images?.[1] || item.images?.[0]}
                name={item.title}
                price={Number(item.price)}
                slug={item.slug}
              />
            ))}
          </Grid>
        </SectionBody>
      </Section>

      {/* New Products Section */}
      <Section>
        <SectionTitle>New Products</SectionTitle>
        <SectionBody>
          <Grid col={4} mdCol={2} smCol={1} gap={20}>
            {newProducts.map(item => (
              <ProductCard
                key={item.id}
                img01={item.images?.[0]}
                img02={item.images?.[1] || item.images?.[0]}
                name={item.title}
                price={Number(item.price)}
                slug={item.slug}
              />
            ))}
          </Grid>
        </SectionBody>
      </Section>

      {/* Banner Section */}
      <Section>
        <SectionBody>
          <Link href="/catalog" legacyBehavior>
            <a className="block w-full relative">
              <Image
                src={banner}
                alt="Promotional Banner"
                layout="responsive"
                width={1200}
                height={400}
                objectFit="cover"
                priority
              />
            </a>
          </Link>
        </SectionBody>
      </Section>

      {/* Popular Products Section */}
      <Section>
        <SectionTitle>Popular</SectionTitle>
        <SectionBody>
          <Grid col={4} mdCol={2} smCol={1} gap={20}>
            {popularProducts.map(item => (
              <ProductCard
                key={item.id}
                img01={item.images?.[0]}
                img02={item.images?.[1] || item.images?.[0]}
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
