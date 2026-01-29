import React, { useState } from 'react'
import Head from 'next/head'
import Button from '../components/Button'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebaseClient'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'
    if (!formData.message.trim()) newErrors.message = 'Message is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await addDoc(collection(db, 'contactMessages'), {
        ...formData,
        createdAt: serverTimestamp()
      })
      setSuccessMessage('Your message has been sent successfully!')
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    }
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Contact Us</title>
        <meta name="description" content="Get in touch with us" />
      </Head>

      <div className="contact-page">


        {/* Main Content */}
        <div className="contact-page__content">
          {/* Left Info Column */}
          <div className="contact-page__info">
            <h2>Office Information</h2>
            <p>Feel free to contact us or visit our office during business hours.</p>

         

            {/* Optional Google Map */}
            <div className="contact-page__map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.0195708244983!2d-122.41941518468195!3d37.774929279758774!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085809c5a7d5d1d%3A0xdeadbeef!2sSan%20Francisco%2C%20CA!5e0!3m2!1sen!2sus!4v1610000000000"
                width="100%"
                height="250"
                style={{ border: 0, borderRadius: '16px' }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="contact-page__form-wrapper">
            {successMessage && <div className="contact-page__success">{successMessage}</div>}

            <form className="contact-page__form" onSubmit={handleSubmit}>
              <div className="form-group">
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                <label>Name</label>
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="form-group">
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                <label>Email</label>
                {errors.email && <p className="form-error">{errors.email}</p>}
              </div>

              <div className="form-group">
                <textarea name="message" value={formData.message} onChange={handleInputChange} rows="6" required />
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

      <style jsx>{`
        .contact-page {
          width: 100%;
          background-color: #f4f6f8;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .contact-page__hero h1 {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .contact-page__hero p {
          font-size: 1.25rem;
        }

        .contact-page__content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          max-width: 1200px;
          width: 100%;
          padding: 60px 20px;
          gap: 60px;
          flex-wrap: wrap;
        }

        .contact-page__info {
          flex: 1 1 400px;
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.05);
        }

        .contact-page__info h2 {
          font-size: 2rem;
          margin-bottom: 20px;
        }

        .contact-page__info p {
          font-size: 1rem;
          margin-bottom: 20px;
          color: #555;
        }

        .contact-page__info ul {
          list-style: none;
          padding: 0;
          font-size: 1rem;
          color: #333;
        }

        .contact-page__info ul li {
          margin-bottom: 10px;
        }

        .contact-page__map {
          margin-top: 30px;
          border-radius: 16px;
          overflow: hidden;
        }

        .contact-page__form-wrapper {
          flex: 1 1 500px;
          background: #fff;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.05);
        }

        .contact-page__success {
          background-color: #d4edda;
          color: #155724;
          padding: 15px 20px;
          border-radius: 12px;
          margin-bottom: 25px;
          font-weight: 500;
        }

        .contact-page__form .form-group {
          position: relative;
          margin-bottom: 25px;
        }

        .contact-page__form input,
        .contact-page__form textarea {
          width: 100%;
          padding: 18px 20px;
          font-size: 1rem;
          border-radius: 12px;
          border: 1px solid #ccc;
          outline: none;
          transition: border 0.3s, box-shadow 0.3s;
        }

        .contact-page__form input:focus,
        .contact-page__form textarea:focus {
          border-color: #0070f3;
          box-shadow: 0 0 0 3px rgba(0,112,243,0.2);
        }

        .contact-page__form label {
          position: absolute;
          top: -10px;
          left: 20px;
          background: #fff;
          padding: 0 6px;
          font-size: 0.9rem;
          color: #555;
        }

        .form-error {
          color: #dc3545;
          font-size: 0.85rem;
          margin-top: 5px;
        }

        @media (max-width: 1024px) {
          .contact-page__content {
            flex-direction: column;
            gap: 40px;
          }
        }
      `}</style>
    </>
  )
}
