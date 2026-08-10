import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSelector } from 'react-redux'

import Grid from './Grid'
import logo from '../assets/images/Logo-2.png'

const footerAboutLinks = [
  { display: "About Us", path: "/policy" },
  { display: "Contact", path: "/contact" },
  { display: "Our Growers", path: "/policy" },
  { display: "Recipes & News", path: "/posts" },
  { display: "Store Locations", path: "/policy" }
]

const footerCustomerLinks = [
  { display: "Delivery & Slots", path: "/policy?tab=delivery" },
  { display: "Freshness Promise", path: "/policy?tab=freshness" },
  { display: "Payment & Refunds", path: "/policy?tab=cod" }
]

const downloadApp = () => {
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    window.open(
      "https://drive.google.com/uc?export=download&id=1k4uqapBNANRtaNiAf7F_DGar8CSSAnlw",
      "_blank"
    );
  } else {
    alert("App is only available for Android devices");
  }
};

export default function Footer() {
  const { contact = {}, storeName } = useSelector((state) => state.settings.values)
  const hasContact = Boolean(contact.phone || contact.whatsapp || contact.email || contact.hours)

  return (
    <footer className="footer">
      <div className="container">
        <Grid col={4} mdCol={2} smCol={1} gap={40}>
          {/* Reach us — the same details the contact page uses */}
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
              {!hasContact && (
                <p>
                  <Link href="/contact">Send us a message</Link>
                </p>
              )}
            </div>
          </div>

          {/* About Links */}
          <div>
            <div className="footer__title">About Leveldo</div>
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
                  alt="Leveldo Grocery"
                  width={150} // adjust width
                  height={50} // adjust height
                  className="footer__logo"
                />
              </Link>
            </p>
            <p>
              A neighbourhood grocery that buys small and often, so what reaches your kitchen is
              what came in this morning. Same-day delivery, cash on delivery, and a freshness
              promise we actually honour.
            </p>
            <button onClick={downloadApp} className="footer__app-btn">
              <i className="bx bx-download"></i>
              Get App
            </button>
          </div>
        </Grid>

        <div className="footer__bottom">
          © {new Date().getFullYear()} {storeName || 'Leveldo Grocery'}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
