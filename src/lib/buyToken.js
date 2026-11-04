// The reference for a coupon being bought. Kept in this browser tab only, never
// in the address, so a link can't carry one to anyone else.
// `memory` covers browsers that block storage.

const memory = {}
const keyFor = (offerId) => `buyToken:${offerId}`

export function rememberToken(offerId, token) {
  memory[offerId] = token
  try {
    sessionStorage.setItem(keyFor(offerId), token)
  } catch {
    // Kept in memory instead.
  }
}

export function recallToken(offerId) {
  let token = memory[offerId]
  try {
    token = sessionStorage.getItem(keyFor(offerId)) || token
  } catch {
    // Use what's in memory.
  }
  return /^TKN-[A-Z2-9]{6}$/.test(String(token)) ? token : null
}

export function forgetToken(offerId) {
  delete memory[offerId]
  try {
    sessionStorage.removeItem(keyFor(offerId))
  } catch {
    // Nothing to remove.
  }
}
