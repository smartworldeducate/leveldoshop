// A receipt is stored inside a Firestore document, which has a size limit, so
// it's shrunk until it fits. Keep MAX_LENGTH under the limit in firestore.rules.

const MAX_LENGTH = 700_000
const ATTEMPTS = [
  [1600, 0.8],
  [1400, 0.7],
  [1200, 0.6],
  [1000, 0.55],
  [800, 0.5],
  [600, 0.45],
]

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })

/** The image as a JPEG data URL. Redrawing it also drops any hidden location data. */
export async function compressReceipt(file) {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  for (const [size, quality] of ATTEMPTS) {
    const scale = Math.min(1, size / Math.max(img.width, img.height))
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/jpeg', quality)
    if (data.length <= MAX_LENGTH) return data
  }
  throw new Error('That image is too large')
}
