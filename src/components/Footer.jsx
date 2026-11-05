import React from 'react'
import Link from 'next/link'
import { useSelector } from 'react-redux'

import Grid from './Grid'
import { couponShopIsOpen } from '../data/couponSales'

const footerCustomerLinks = [
  { display: "Delivery & Slots", path: "/policy?tab=delivery" },
  { display: "Freshness Promise", path: "/policy?tab=freshness" },
  { display: "Payment & Refunds", path: "/policy?tab=cod" },
  { display: "Coupons & Rewards", path: "/policy?tab=rewards" },
  { display: "My Orders", path: "/orders" },
]

export default function Footer() {
  const { contact = {}, storeName, pages, couponShop } = useSelector((state) => state.settings.values)
  const draws = useSelector((state) => state.rewards.draws)

  // Only what's switched on: the shop's own links, and the blog lives here too.
  const shopLinks = [
    { display: "Shop All Groceries", path: "/catalog" },
    ...(couponShopIsOpen(couponShop) ? [{ display: "Coupons", path: "/coupons" }] : []),
    ...(draws.some((d) => d.visible !== false) ? [{ display: "Rewards", path: "/rewards" }] : []),
    ...(pages?.posts !== false ? [{ display: "Recipes & News", path: "/posts" }] : []),
  ]

  return (
    <footer className="footer">
      <div className="container">
        <Grid col={4} mdCol={2} smCol={1} gap={40}>
          {/* Reach us */}
          <div>
            <div className="footer__title">Get in touch</div>
            <div className="footer__content">
              {contact.phone && (
                <p>
                  Call us <strong>{contact.phone}</strong>
                </p>
              )}
              {contact.whatsapp && (
                <p>
                  WhatsApp <strong>{contact.whatsapp}</strong>
                </p>
              )}
              {contact.email && (
                <p>
                  Email <strong>{contact.email}</strong>
                </p>
              )}
              {contact.hours && (
                <p>
                  Open <strong>{contact.hours}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Shop links */}
          <div>
            <div className="footer__title">Shop</div>
            <div className="footer__content">
              {shopLinks.map((item, index) => (
                <p key={index}>
                  <Link href={item.path}>{item.display}</Link>
                </p>
              ))}
            </div>
          </div>

          {/* Customer Care */}
          <div>
            <div className="footer__title">Customer Care</div>
            <div className="footer__content">
              {footerCustomerLinks.map((item, index) => (
                <p key={index}>
                  <Link href={item.path}>{item.display}</Link>
                </p>
              ))}
            </div>
          </div>

          {/* Footer About */}
          <div className="footer__about">
            <Link href="/" className="footer__brand">
              <span><i className="bx bx-basket"></i></span>
              <strong>A-one</strong>
              <small>grocery</small>
            </Link>
            <p>
              A neighbourhood grocery that buys small and often, so what reaches your kitchen is
              what came in this morning. Same-day delivery, cash on delivery, and a freshness
              promise we actually honour.
            </p>
          </div>
        </Grid>

        <div className="footer__bottom">
          © {new Date().getFullYear()} {storeName || 'A-one Grocery'}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
