/** Cross-component cart UI events (header dropdown, mini toast, etc.) */

export const OPEN_CART_DROPDOWN_EVENT = 'ziggner:open-cart-dropdown'

export type OpenCartDropdownDetail = {
  /** How long the dropdown stays forced open (ms). Default 3500. */
  durationMs?: number
}

export function openCartDropdown(detail: OpenCartDropdownDetail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_CART_DROPDOWN_EVENT, { detail }))
}
