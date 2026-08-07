export function optionalMediaUrl(value: string | null | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized || undefined
}
