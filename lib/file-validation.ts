// Shared client-side file validation. The `accept` attribute on <input> only
// filters the OS picker — it does not block drag-and-drop or "All files" mode,
// so every handler must call validateImageFile / validateFontFile before doing
// anything with the File.

export const IMAGE_MIME_BY_FORMAT = {
  png: "image/png",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
} as const

export type ImageFormat = keyof typeof IMAGE_MIME_BY_FORMAT

export const DEFAULT_IMAGE_FORMATS: ImageFormat[] = ["png", "jpeg", "svg"]

const EXTENSIONS_BY_FORMAT: Record<ImageFormat, string[]> = {
  png: [".png"],
  jpeg: [".jpg", ".jpeg"],
  svg: [".svg"],
  webp: [".webp"],
}

const FORMAT_LABEL: Record<ImageFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  svg: "SVG",
  webp: "WEBP",
}

export const FONT_EXTENSIONS = ["ttf", "otf", "woff", "woff2"] as const

export interface ImageValidateOptions {
  allow?: ImageFormat[]
  maxSizeMb?: number
}

function unsupportedFormatMessage(allow: ImageFormat[]): string {
  const labels = allow.map((f) => FORMAT_LABEL[f]).join(", ")
  // "Непідтримуваний формат файлу. Будь ласка, завантажте зображення у форматі ${labels}"
  return `Непідтримуваний формат файлу. Будь ласка, завантажте зображення у форматі ${labels}`
}

function tooLargeMessage(maxSizeMb: number): string {
  // "Файл занадто великий. Максимум ${maxSizeMb} МБ."
  return `Файл занадто великий. Максимум ${maxSizeMb} МБ.`
}

export function validateImageFile(
  file: File,
  opts: ImageValidateOptions = {},
): string | null {
  const allow = opts.allow ?? DEFAULT_IMAGE_FORMATS
  const maxSizeMb = opts.maxSizeMb ?? 5

  const allowedMimes = new Set<string>(allow.map((f) => IMAGE_MIME_BY_FORMAT[f]))
  const allowedExts = allow.flatMap((f) => EXTENSIONS_BY_FORMAT[f])

  // Some browsers omit file.type for SVG or unknown content; fall back to ext.
  const mimeOk = !!file.type && allowedMimes.has(file.type)
  const lowerName = file.name.toLowerCase()
  const extOk = allowedExts.some((ext) => lowerName.endsWith(ext))

  if (!mimeOk && !extOk) {
    return unsupportedFormatMessage(allow)
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return tooLargeMessage(maxSizeMb)
  }

  return null
}

export function imageAcceptString(
  formats: ImageFormat[] = DEFAULT_IMAGE_FORMATS,
): string {
  return formats.map((f) => IMAGE_MIME_BY_FORMAT[f]).join(",")
}

export function validateFontFile(file: File, maxSizeMb = 10): string | null {
  const lowerName = file.name.toLowerCase()
  const extOk = FONT_EXTENSIONS.some((ext) => lowerName.endsWith(`.${ext}`))
  if (!extOk) {
    // "Непідтримуваний формат шрифту. Підтримуються TTF, OTF, WOFF, WOFF2."
    return "Непідтримуваний формат шрифту. Підтримуються TTF, OTF, WOFF, WOFF2."
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    return tooLargeMessage(maxSizeMb)
  }
  return null
}
