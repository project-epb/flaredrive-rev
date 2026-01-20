export namespace DateHelper {
  /**
   * Format date to locale string
   */
  export function formatLocaleString(date: string | number | Date | null | undefined) {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString()
  }
}
