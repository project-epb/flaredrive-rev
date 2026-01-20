export namespace ClipboardHelper {
  /**
   * Copy text to clipboard
   * @param text The text to copy
   * @returns true if successful, false otherwise
   */
  export async function copyText(text: string): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      console.warn('Clipboard API not available')
      return false
    }
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('Failed to copy text: ', err)
      return false
    }
  }
}
