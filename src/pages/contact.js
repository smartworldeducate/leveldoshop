import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useDispatch, useSelector } from 'react-redux'

import PageGuard from '../components/PageGuard'
import { sendContactMessage, resetContactState } from '../redux/contact/contactSlice'

/** Only the channels the shopkeeper has actually filled in are offered. */
function channelsFrom(contact = {}) {
  const list = []
  if (contact.phone) {
    list.push({
      key: 'phone',
      icon: 'bx bx-phone',
      label: 'Call the shop',
      value: contact.phone,
      href: `tel:${contact.phone.replace(/\s/g, '')}`,
      action: 'Call',
    })
  }
  if (contact.whatsapp) {
    list.push({
      key: 'whatsapp',
      icon: 'bx bxl-whatsapp',
      label: 'WhatsApp',
      value: contact.whatsapp,
      href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`,
      action: 'Message',
      external: true,
    })
  }
  if (contact.email) {
    list.push({
      key: 'email',
      icon: 'bx bx-envelope',
      label: 'Email us',
      value: contact.email,
      href: `mailto:${contact.email}`,
      action: 'Write',
    })
  }
  if (contact.address) {
    list.push({
      key: 'address',
      icon: 'bx bx-map-pin',
      label: 'Visit the shop',
      value: contact.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`,
      action: 'Directions',
      external: true,
    })
  }
  return list
}

function Contact() {
  const dispatch = useDispatch()
  const { loading, success } = useSelector(state => state.contact)
  const { contact = {}, storeName } = useSelector(state => state.settings.values)

  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (success) {
      setFormData({ name: '', email: '', message: '' })
      const t = setTimeout(() => dispatch(resetContactState()), 6000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [success, dispatch])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const err = {}
    if (!formData.name.trim()) err.name = 'Please tell us your name'
    if (!formData.email.trim()) err.email = 'We need an email to reply to'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) err.email = 'That email does not look right'
    if (!formData.message.trim()) err.message = 'Let us know how we can help'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    dispatch(sendContactMessage(formData))
  }

  const channels = channelsFrom(contact)

  return (
    <>
      <Head>
        <title>Contact us</title>
        <meta name="description" content="Call, message or write to the shop — we reply the same day." />
      </Head>

      <section className="home-block">
        <div className="contact-hero">
          <span className="contact-hero__eyebrow">
            <i className="bx bx-message-dots"></i>
            We reply the same day
          </span>
          <h1 className="contact-hero__title">Talk to the shop</h1>
          <p className="contact-hero__lead">
            Missing something from your basket, a delivery running late, or an item that did not
            arrive fresh — tell us and we will put it right.
          </p>
        </div>
      </section>

      <section className="home-block">
        <div className="contact-layout">
          {/* ways to reach a human */}
          <div className="contact-channels">
            {channels.length > 0 ? (
              channels.map((c) => (
                <a
                  key={c.key}
                  href={c.href}
                  className="contact-channel"
                  {...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <span className="contact-channel__icon">
                    <i className={c.icon}></i>
                  </span>
                  <span className="contact-channel__text">
                    <strong>{c.label}</strong>
                    <small>{c.value}</small>
                  </span>
                  <span className="contact-channel__action">
                    {c.action}
                    <i className="bx bx-chevron-right"></i>
                  </span>
                </a>
              ))
            ) : (
              <div className="contact-channel is-empty">
                <span className="contact-channel__icon">
                  <i className="bx bx-envelope"></i>
                </span>
                <span className="contact-channel__text">
                  <strong>Use the form</strong>
                  <small>Phone and address are not published yet — the form reaches us either way.</small>
                </span>
              </div>
            )}

            {(contact.hours || contact.orderCutoff) && (
              <div className="contact-hours">
                {contact.hours && (
                  <div>
                    <i className="bx bx-time-five"></i>
                    <span>
                      <strong>Open</strong>
                      <small>{contact.hours}</small>
                    </span>
                  </div>
                )}
                {contact.orderCutoff && (
                  <div>
                    <i className="bx bx-cycling"></i>
                    <span>
                      <strong>Same-day cut-off</strong>
                      <small>Order before {contact.orderCutoff}</small>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* the form */}
          <div className="contact-form-card">
            {success ? (
              <div className="contact-sent">
                <span className="contact-sent__icon">
                  <i className="bx bx-check"></i>
                </span>
                <h2>Message sent</h2>
                <p>
                  Thanks — {storeName || 'the shop'} has your message and will reply to your email
                  shortly.
                </p>
                <button
                  type="button"
                  className="catalog__filter__clear"
                  onClick={() => dispatch(resetContactState())}
                >
                  Send another
                </button>
              </div>
            ) : (
              <>
                <h2 className="contact-form-card__title">Send a message</h2>
                <p className="contact-form-card__note">
                  Include your order number if it is about a delivery.
                </p>

                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                  <label className={`contact-field ${errors.name ? 'has-error' : ''}`}>
                    <span>Your name</span>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Ayesha Khan"
                    />
                    {errors.name && <small>{errors.name}</small>}
                  </label>

                  <label className={`contact-field ${errors.email ? 'has-error' : ''}`}>
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                    />
                    {errors.email && <small>{errors.email}</small>}
                  </label>

                  <label className={`contact-field ${errors.message ? 'has-error' : ''}`}>
                    <span>How can we help?</span>
                    <textarea
                      name="message"
                      rows="6"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us what happened…"
                    />
                    {errors.message && <small>{errors.message}</small>}
                  </label>

                  <button type="submit" className="contact-submit" disabled={loading}>
                    {loading ? 'Sending…' : 'Send message'}
                    <i className="bx bx-send"></i>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* map only when there is a real address to point at */}
      {contact.address && (
        <section className="home-block">
          <div className="contact-map">
            <iframe
              title="Shop location"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                contact.address
              )}&output=embed`}
            />
          </div>
        </section>
      )}
    </>
  )
}

// Switched off from the dashboard? Show a notice instead of the page.
export default function GuardedContact(props) {
  return (
    <PageGuard page="contact" title="The contact page">
      <Contact {...props} />
    </PageGuard>
  )
}
