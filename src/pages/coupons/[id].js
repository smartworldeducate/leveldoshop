import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Copy, Gift, ImagePlus, TicketPercent, X } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import PurchaseSteps from '../../components/PurchaseSteps'
import { compressReceipt } from '../../lib/compressReceipt'
import { forgetToken, recallToken } from '../../lib/buyToken'
import { fetchMyPurchases, fetchOffers, requestPurchase } from '../../redux/couponSales/couponSalesSlice'
import { fetchDraws } from '../../redux/rewards/rewardsSlice'
import { categoryLabel, formatMoney } from '../../data/grocery'
import { describeDiscount, describeTerms } from '../../data/coupons'
import { whatsappNumber } from '../../data/notifications'
import { accountToCopy, couponShopIsOpen, dayCountdown, formatRewardDay, offerStatus, paymentMethods } from '../../data/couponSales'
import { drawStatus, formatDrawDate } from '../../data/rewards'

export default function BuyCoupon() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user, loading: authLoading } = useAuth()
  const { offers, offersLoaded, mine } = useSelector((s) => s.couponSales)
  const shop = useSelector((s) => s.settings.values.couponShop)
  const settingsLoaded = useSelector((s) => s.settings.loaded)
  const categories = useSelector((s) => s.categories.items)
  const draws = useSelector((s) => s.rewards.draws)

  const offer = offers.find((o) => o.id === router.query.id)
  const methods = paymentMethods(shop)
  const openDraw = draws.find((d) => drawStatus(d).key === 'open')

  // Only ever set by pressing a coupon's copy button, in this browser tab.
  const [token, setToken] = useState(null)

  const [methodId, setMethodId] = useState('')
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [reference, setReference] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState('')
  const [dragging, setDragging] = useState(false)
  const [sent, setSent] = useState(null)

  const method = methods.find((m) => m.id === methodId)
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  useEffect(() => {
    if (!offersLoaded) dispatch(fetchOffers())
    dispatch(fetchDraws())
  }, [dispatch, offersLoaded])

  useEffect(() => {
    if (authLoading || !router.isReady) return
    if (!user) router.replace(`/login?next=${encodeURIComponent(router.asPath)}`)
    else setName((prev) => prev || user.displayName || '')
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) dispatch(fetchMyPurchases(user.uid))
  }, [dispatch, user])

  // Opened from a typed or shared address: buying has to start from a coupon.
  useEffect(() => {
    if (!router.isReady || sent) return
    const remembered = recallToken(router.query.id)
    if (remembered) {
      setToken(remembered)
      if (router.query.token) router.replace(`/coupons/${router.query.id}`, undefined, { shallow: true })
    } else {
      toast('Copy a coupon code to start buying')
      router.replace('/coupons')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.id])

  // Someone who has bought before doesn't have to type their number again.
  const lastPhone = mine[0]?.buyer?.phone
  useEffect(() => {
    if (lastPhone) setPhone((prev) => prev || lastPhone)
  }, [lastPhone])

  useEffect(() => {
    if (methods.length === 1 && !methodId) setMethodId(methods[0].id)
  }, [methods, methodId])

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch {
      toast.error('Could not copy. Please note it down.')
    }
  }

  const takeFile = (chosen) => {
    if (!chosen) return
    if (!chosen.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, file: 'Please choose an image' }))
      return
    }
    setFile(chosen)
    setErrors((prev) => ({ ...prev, file: '' }))
  }

  const pickFile = (e) => {
    takeFile(e.target.files?.[0])
    e.target.value = ''
  }

  const dropFile = (e) => {
    e.preventDefault()
    setDragging(false)
    takeFile(e.dataTransfer.files?.[0])
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = {}
    if (!method) found.method = 'Choose how you paid'
    if (!file) found.file = 'Upload a screenshot or photo of your receipt'
    if (!name.trim()) found.name = 'Enter your name'
    if (!whatsappNumber(phone)) found.phone = 'Enter a valid phone number'
    setErrors(found)
    const firstError = Object.keys(found)[0]
    if (firstError) {
      // The button is at the end of the page, and the problem may be off-screen.
      toast.error(found[firstError])
      document.getElementById(`buy-${firstError}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSaving('Preparing your receipt…')
    try {
      const receipt = await compressReceipt(file)
      setSaving('Sending…')
      await dispatch(
        requestPurchase({
          offer,
          token,
          reference,
          receipt,
          paymentMethod: method.name,
          buyer: { uid: user.uid, email: user.email || '', name: name.trim(), phone: phone.trim() },
        })
      ).unwrap()
      forgetToken(offer.id)
      setSent({ at: new Date(), method: method.name })
      window.scrollTo({ top: 0 })
    } catch {
      toast.error('We could not send this. Your details are still here, so please try again.')
    }
    setSaving('')
  }

  const head = (
    <Head>
      <title>Buy a coupon</title>
      <meta name="robots" content="noindex" />
    </Head>
  )

  if (sent) {
    return (
      <>
        {head}
        <div className="my-orders">
          <div className="buy-done">
            <header className="buy-done__head">
              <CheckCircle2 size={44} />
              <h1>We've received your details</h1>
              <p>Thank you, {name}. You don't need to do anything else right now.</p>
            </header>

            <div className="buy-done__body">
              <PurchaseSteps status="pending" />

              <div className="buy-done__reference">
                <div>
                  <small>Your reference</small>
                  <strong>{token}</strong>
                </div>
                <button type="button" onClick={() => copy(token, 'Reference copied')}>
                  <Copy size={15} /> Copy
                </button>
              </div>

              <dl className="buy-done__facts">
                <div><dt>Coupon</dt><dd>{offer.title}</dd></div>
                <div><dt>Amount</dt><dd>{formatMoney(offer.price)}</dd></div>
                <div><dt>Paid by</dt><dd>{sent.method}</dd></div>
                <div><dt>Sent</dt><dd>{formatDrawDate(sent.at)}</dd></div>
                <div><dt>Your name</dt><dd>{name}</dd></div>
                <div><dt>WhatsApp</dt><dd>{phone}</dd></div>
              </dl>

              <div>
                <h2>What happens next</h2>
                <ol className="buy-done__next">
                  <li>We check your payment{shop.checkTime ? ` within ${shop.checkTime}` : ''}.</li>
                  <li>We send your coupon code on WhatsApp. It also appears under My coupons.</li>
                  <li>You enter the code in your basket to get {describeDiscount(offer)}.</li>
                </ol>
              </div>

              {offer.rewardText && (
                <div className="reward-note">
                  <Gift size={20} />
                  <div>
                    <strong>Your reward day: {formatRewardDay(offer.rewardDay)} {dayCountdown(offer.rewardDay) && `(${dayCountdown(offer.rewardDay)})`}</strong>
                    <p>Once we confirm your payment, you'll be on the reward-day list. Every buyer gets: {offer.rewardText}.</p>
                  </div>
                </div>
              )}

              {openDraw && (
                <div className="free-draw-note">
                  <Gift size={20} />
                  <div>
                    <strong>Separately, there's a free reward draw</strong>
                    <p>
                      {openDraw.title}. Results on {formatDrawDate(openDraw.resultsAt)}. You need to enter it yourself. It's free for everyone, and buying a coupon doesn't affect your chances.
                    </p>
                    <Link href="/rewards">See the free draw</Link>
                  </div>
                </div>
              )}

              <div className="buy-done__actions">
                <Link href="/coupons/mine" className="shop-btn">My coupons</Link>
                <Link href="/catalog" className="shop-btn shop-btn--ghost">Continue shopping</Link>
              </div>

              <p className="buy-done__help">Have a question? <Link href="/contact">Contact us</Link> and give your reference.</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (authLoading || !user || !token || !offersLoaded || !settingsLoaded || !router.isReady) {
    return <div className="my-order my-order--skeleton" aria-busy="true" aria-label="Loading" />
  }

  if (!offer || !couponShopIsOpen(shop) || offerStatus(offer).key !== 'on_sale') {
    return (
      <>
        {head}
        <div className="my-orders__empty">
          <TicketPercent size={36} />
          <h2>This coupon isn't on sale</h2>
          <p>It may have sold out or been taken off sale.</p>
          <Link href="/coupons" className="shop-btn">See coupons</Link>
        </div>
      </>
    )
  }

  const terms = describeTerms(offer, (slug) => categoryLabel(categories, slug))
  const waiting = mine.find((p) => p.status === 'pending' && p.offerId === offer.id)
  const accountNumber = method && (method.accountNumber?.replace(/[ -]/g, '') || accountToCopy(method.details))

  const StepNumber = ({ n, done }) => (
    <span className={done ? 'is-done' : ''}>{done ? <Check size={15} aria-label="Done" /> : n}</span>
  )

  return (
    <>
      {head}
      <form className="my-orders" onSubmit={submit} noValidate>
        <Link href="/coupons" className="back-link"><ArrowLeft size={16} /> All coupons</Link>

        <div className="token-bar">
          <div>
            <span>Your reference (not your coupon code)</span>
            <strong>{token}</strong>
          </div>
          <button type="button" onClick={() => copy(token, 'Reference copied')}>
            <Copy size={15} /> Copy
          </button>
        </div>

        {waiting && (
          <p className="buy-notice">
            <AlertCircle size={18} />
            <span>
              We're still checking your payment for this coupon. If you've already paid, there's nothing more to do: <Link href="/coupons/mine">see My coupons</Link>. Carry on only if you want to buy another.
            </span>
          </p>
        )}

        <div className="my-orders__layout">
          <div className="my-orders__list">
            <section className="return-form">
              <h2><StepNumber n={1} done={Boolean(method)} /> Choose how to pay</h2>
              <div id="buy-method" className="pay-methods" role="radiogroup" aria-label="Payment method">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={methodId === m.id}
                    className={methodId === m.id ? 'is-selected' : ''}
                    onClick={() => {
                      setMethodId(m.id)
                      setErrors((prev) => ({ ...prev, method: '' }))
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              {errors.method && <small className="checkout-pin is-error">{errors.method}</small>}
            </section>

            <section className="return-form">
              <h2><StepNumber n={2} done={Boolean(file)} /> Send the money</h2>
              <p className="pay-amount">
                Send exactly <strong>{formatMoney(offer.price)}</strong>
                {method ? ` by ${method.name}` : ''}.
              </p>
              {method ? (
                <div className="pay-account">
                  {method.accountNumber ? (
                    <dl className="pay-rows">
                      {method.accountName && <div><dt>Account name</dt><dd>{method.accountName}</dd></div>}
                      <div><dt>{method.bankName ? 'IBAN or account number' : 'Send to this number'}</dt><dd>{method.accountNumber}</dd></div>
                    </dl>
                  ) : (
                    <p className="pay-details">{method.details}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => copy(accountNumber || method.details, accountNumber ? `${accountNumber} copied` : 'Details copied')}
                  >
                    <Copy size={15} /> {accountNumber ? 'Copy number' : 'Copy details'}
                  </button>
                </div>
              ) : (
                <p className="my-order__hint coupon-note">Choose a payment method to see the account details.</p>
              )}
              {method?.accountNumber && method.note && <p className="pay-note">{method.note}</p>}
              <p className="my-order__hint coupon-note">If you can, add your reference <strong>{token}</strong> to the payment note.</p>
            </section>

            <section className="return-form">
              <h2><StepNumber n={3} done={Boolean(file)} /> Upload your receipt</h2>
              {previewUrl ? (
                <div className="shot-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Your payment screenshot" />
                  <button type="button" aria-label="Remove screenshot" onClick={() => setFile(null)}><X size={16} /></button>
                </div>
              ) : (
                <label
                  id="buy-file"
                  className={`shot-drop${errors.file ? ' has-error' : ''}${dragging ? ' is-dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={dropFile}
                >
                  <ImagePlus size={26} />
                  <span>Choose or drop a screenshot or photo of your receipt</span>
                  <small>It should show the amount, date and transaction ID. It stays private: only you and our staff can see it.</small>
                  <input id="buy-screenshot" type="file" accept="image/*" onChange={pickFile} />
                </label>
              )}
              {errors.file && <small className="checkout-pin is-error">{errors.file}</small>}
            </section>

            <section className="return-form">
              <h2><StepNumber n={4} done={Boolean(name.trim() && whatsappNumber(phone))} /> Your details</h2>
              <div className="checkout-fields">
                <div className="checkout-field">
                  <label htmlFor="buy-name">Your name</label>
                  <input id="buy-name" name="name" autoComplete="name" value={name} aria-invalid={Boolean(errors.name)} onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: '' })) }} />
                  <small className={errors.name ? 'is-error' : ''}>{errors.name}</small>
                </div>
                <div className="checkout-field">
                  <label htmlFor="buy-phone">WhatsApp number</label>
                  <input id="buy-phone" name="phone" type="tel" autoComplete="tel" placeholder="03001234567" value={phone} aria-invalid={Boolean(errors.phone)} onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: '' })) }} />
                  <small className={errors.phone ? 'is-error' : ''}>{errors.phone || "We'll send your code here."}</small>
                </div>
                <div className="checkout-field checkout-field--wide">
                  <label htmlFor="buy-reference">Transaction ID (optional)</label>
                  <input id="buy-reference" name="reference" autoComplete="off" value={reference} onChange={(e) => setReference(e.target.value)} />
                  <small>Helps us find your payment faster.</small>
                </div>
              </div>
            </section>
          </div>

          <aside className="my-orders__side">
            <section className="side-card return-summary">
              <h2>{offer.title}</h2>
              <p className="offer-card__gives">{describeDiscount(offer)}</p>
              <ul>
                {terms.map((term) => <li key={term}><span>{term}</span></li>)}
                <li><span>{offer.validDays > 0 ? `Lasts ${offer.validDays} days from confirmation` : 'No expiry'}</span></li>
                <li><span>Works once</span></li>
                {offer.rewardText && <li><span>Every buyer gets: {offer.rewardText}, on {formatRewardDay(offer.rewardDay)}</span></li>}
              </ul>
              <div className="return-summary__total">
                <span>You pay</span>
                <strong>{formatMoney(offer.price)}</strong>
              </div>
              <button type="submit" className="shop-btn shop-btn--block" disabled={Boolean(saving)}>
                {saving || 'Send for verification'}
              </button>
              <small>Your code arrives once we've checked your payment.</small>
            </section>
          </aside>
        </div>
      </form>
    </>
  )
}
