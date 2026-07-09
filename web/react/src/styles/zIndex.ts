export const zIndex = {
  base: 1,
  content: 10,
  header: 100,
  dropdown: 2000,
  dropdownContent: 2001,
  button: 9999,
  modal: 99999,
} as const

export type ZIndexKey = keyof typeof zIndex