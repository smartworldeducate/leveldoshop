import { useEffect } from 'react'

// Discourages casual right-clicking and inspecting. It is NOT security: anyone
// can still open developer tools from the browser menu. Private data is
// protected by firestore.rules, and must stay protected there.
const BLOCKED_LETTERS = ['I', 'J', 'C']

const isInspectShortcut = (e) => {
  const key = e.key?.toUpperCase()
  if (key === 'F12') return true
  if ((e.ctrlKey || e.metaKey) && key === 'U') return true
  return (e.ctrlKey && e.shiftKey && BLOCKED_LETTERS.includes(key)) || (e.metaKey && e.altKey && BLOCKED_LETTERS.includes(key))
}

export default function useInspectGuard() {
  useEffect(() => {
    // Right-click still works in form fields, so people can paste a code.
    const onMenu = (e) => {
      if (!e.target.closest?.('input, textarea, [contenteditable]')) e.preventDefault()
    }
    const onKey = (e) => {
      if (isInspectShortcut(e)) e.preventDefault()
    }
    document.addEventListener('contextmenu', onMenu)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('contextmenu', onMenu)
      document.removeEventListener('keydown', onKey)
    }
  }, [])
}
