// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
         <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6218367996393783"
     crossorigin="anonymous"></script>
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
