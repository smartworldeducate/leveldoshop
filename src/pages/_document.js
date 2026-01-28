// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* You can put global <link> or <meta> tags here */}
        </Head>
        <body>
          <Main /> {/* This renders your app */}
          <NextScript /> {/* Next.js scripts */}
        </body>
      </Html>
    )
  }
}

export default MyDocument
