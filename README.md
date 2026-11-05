This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Customer updates

After each delivery step, the order page offers a **Send on WhatsApp** button with the message ready.
Email is optional and sent automatically when these are set in `.env.local` (and on your host):

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-login
SMTP_PASS=your-password
SMTP_FROM=orders@example.com
NEXT_PUBLIC_SITE_URL=https://your-domain.example
STORE_NAME=A-one Grocery
```

## Firestore security rules

The rules are in `firestore.rules`. To test them on a local emulator (needs Java 11 or newer; nothing touches the live project):

```bash
cd firestore-tests
npm install
npm test
```

Publish by pasting the file into **Firebase console → Firestore Database → Rules**. Copy the old rules somewhere first, so you can restore them.

If you add an owner, add their email to `isOwner()` in `firestore.rules` as well as `NEXT_PUBLIC_ADMIN_EMAILS`.

## PayPal (coupon sales)

Set these on the server, for example in `.env.local`. Never commit them, and never give the secret a `NEXT_PUBLIC_` name.

```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_API_BASE=https://api-m.paypal.com
```

Customers only see PayPal once it's added under Sell coupons → Payment methods. Staff confirm each purchase after seeing PayPal's own answer on the review page. Rules for it are in `firestore.rules`, so publish them first.
