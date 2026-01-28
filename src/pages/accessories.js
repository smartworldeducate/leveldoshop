import React from 'react'
import Head from 'next/head'

export default function Accessories() {
  return (
    <>
      <Head>
        <title>Accessories Page</title>
        <meta name="description" content="Beautiful blog and accessories content." />
      </Head>

      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Beautiful Blog</h1>
          <p className="text-gray-700 text-lg leading-relaxed">
            Welcome to our beautifully designed blog. Here, we share insightful
            articles on various topics. Stay tuned for more amazing content that
            will inspire and educate.
          </p>
          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-gray-800">Latest Posts</h2>
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg shadow">
                <h3 className="text-xl font-medium text-gray-900">How to Build a Stunning Website</h3>
                <p className="text-gray-600">
                  Learn the secrets of designing an eye-catching website that attracts users.
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg shadow">
                <h3 className="text-xl font-medium text-gray-900">Top 10 Productivity Hacks</h3>
                <p className="text-gray-600">
                  Boost your efficiency with these game-changing productivity tips.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
