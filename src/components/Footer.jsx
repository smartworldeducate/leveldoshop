import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

import Grid from './Grid'
import logo from '../assets/images/Logo-2.png'

const footerAboutLinks = [
  { display: "About Us", path: "/about" },
  { display: "Contact", path: "/about" },
  { display: "Careers", path: "/about" },
  { display: "News", path: "/about" },
  { display: "Store Locations", path: "/about" }
]

const footerCustomerLinks = [
  { display: "Return Policy", path: "/about" },
  { display: "Warranty Policy", path: "/about" },
  { display: "Refund Policy", path: "/about" }
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <Grid col={4} mdCol={2} smCol={1} gap={10}>
          {/* Support Hotline */}
          <div>
            <div className="footer__title">Support Hotline</div>
            <div className="footer__content">
              <p>Order Support <strong>0123456789</strong></p>
              <p>Order Inquiries <strong>0123456789</strong></p>
              <p>Feedback & Complaints <strong>0123456789</strong></p>
            </div>
          </div>

          {/* About Links */}
          <div>
            <div className="footer__title">About Yolo</div>
            <div className="footer__content">
              {footerAboutLinks.map((item, index) => (
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
            <p>
              <Link href="/">
                <Image
                  src={logo}
                  alt="Yolo Logo"
                  width={150} // adjust width
                  height={50} // adjust height
                  className="footer__logo"
                />
              </Link>
            </p>
            <p>
              Our goal is to bring fresh fashion joy every day to millions of consumers. Join Yolo in embracing a more dynamic and positive lifestyle.
            </p>
          </div>
        </Grid>
      </div>
    </footer>
  )
}
