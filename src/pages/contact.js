import React from 'react'
import Head from 'next/head'

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us</title>
        <meta name="description" content="Get in touch with us" />
      </Head>

      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        {/* Uncomment and use this block when ready
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-700 text-lg leading-relaxed">
            Have questions or suggestions? Feel free to reach out to us!
          </p>
          <form className="mt-6 space-y-4">
            <div>
              <label className="block text-gray-700 font-medium">Name</label>
              <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Your Name" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium">Email</label>
              <input type="email" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Your Email" />
            </div>
            <div>
              <label className="block text-gray-700 font-medium">Message</label>
              <textarea className="w-full p-3 border border-gray-300 rounded-lg" rows="4" placeholder="Your Message"></textarea>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">Send Message</button>
          </form>
        </div>
        */}
      </div>
    </>
  )
}
