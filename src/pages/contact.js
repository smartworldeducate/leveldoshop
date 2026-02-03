import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useDispatch, useSelector } from 'react-redux'

import Button from '../components/Button'
import {
  sendContactMessage,
  resetContactState
} from '../redux/contact/contactSlice'

export default function Contact() {
  const dispatch = useDispatch()
  const { loading, success } = useSelector(state => state.contact)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (success) {
      setFormData({ name: '', email: '', message: '' })
      setTimeout(() => dispatch(resetContactState()), 3000)
    }
  }, [success, dispatch])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const err = {}
    if (!formData.name.trim()) err.name = 'Name is required'
    if (!formData.email.trim()) err.email = 'Email is required'
    if (!formData.message.trim()) err.message = 'Message is required'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    dispatch(sendContactMessage(formData))
  }

 return (
    <>
      <Head>
        <title>Contact Us</title>
      </Head>

      {/* 🔴 FIXED ROOT CLASS */}
      <div className="contact-page">
        <div className="contact-page__content">

          <div className="contact-page__info">
            <h2>Office Information</h2>
            <p>Feel free to contact us or visit our office.</p>

            {/* 🔴 FIXED MAP CLASS */}
            <div className="contact-page__info__map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18..."
                loading="lazy"
              />
            </div>
          </div>

          <div className="contact-page__form-wrapper">
            {success && (
              <div className="contact-page__form-wrapper__success">
                Message sent successfully!
              </div>
            )}

            {/* 🔴 FIXED FORM CLASS */}
            <form className="contact-page__form" onSubmit={handleSubmit}>
              <div className="form-group">
                <input name="name" value={formData.name} onChange={handleChange} />
                <label>Name</label>
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="form-group">
                <input name="email" value={formData.email} onChange={handleChange} />
                <label>Email</label>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <textarea
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                />
                <label>Message</label>
                {errors.message && <p className="form-error">{errors.message}</p>}
              </div>

              <Button type="submit" size="block" disabled={loading}>
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>

        </div>
      </div>
    </>
  )
}
