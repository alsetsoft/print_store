"use client"

export interface CompositePreviewInput {
  baseImageUrl: string
  printImageUrl: string | null
  zones: { id: string; x: number; y: number; width: number; height: number }[] | undefined
  placements:
    | Record<
        string,
        { x: number; y: number; scale: number; is_mirrored: boolean; printImageUrl?: string }
      >
    | undefined
  size?: number
}

// Fetching as blob avoids canvas taint when images are served from a different
// origin without proper CORS headers.
function loadImageViaBlob(url: string): Promise<HTMLImageElement> {
  return fetch(url)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const objUrl = URL.createObjectURL(blob)
          const img = new Image()
          img.onload = () => {
            URL.revokeObjectURL(objUrl)
            resolve(img)
          }
          img.onerror = () => {
            URL.revokeObjectURL(objUrl)
            reject(new Error("image load failed"))
          }
          img.src = objUrl
        }),
    )
}

export async function generateCompositePreview(
  input: CompositePreviewInput,
): Promise<string | null> {
  const S = input.size ?? 400

  const canvas = document.createElement("canvas")
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  let baseImg: HTMLImageElement
  try {
    baseImg = await loadImageViaBlob(input.baseImageUrl)
  } catch {
    return null
  }

  const scale = Math.min(S / baseImg.naturalWidth, S / baseImg.naturalHeight)
  const w = baseImg.naturalWidth * scale
  const h = baseImg.naturalHeight * scale
  const ox = (S - w) / 2
  const oy = (S - h) / 2
  ctx.drawImage(baseImg, ox, oy, w, h)

  if (!input.printImageUrl || !input.zones || input.zones.length === 0) {
    return canvas.toDataURL("image/jpeg", 0.75)
  }

  const placements = input.placements ?? {}
  const hasAnyPlacement = Object.keys(placements).length > 0
  const zonesToRender = hasAnyPlacement
    ? input.zones.filter((z) => placements[z.id])
    : [input.zones[0]]

  for (const zone of zonesToRender) {
    const placement = placements[zone.id]
    const url = placement?.printImageUrl ?? input.printImageUrl

    const zx = ox + (zone.x / 100) * w
    const zy = oy + (zone.y / 100) * h
    const zw = (zone.width / 100) * w
    const zh = (zone.height / 100) * h

    let printImg: HTMLImageElement
    try {
      printImg = await loadImageViaBlob(url)
    } catch {
      continue
    }

    if (placement) {
      const px = placement.x / 100
      const py = placement.y / 100
      const ps = placement.scale / 100
      const printRatio = printImg.naturalWidth / printImg.naturalHeight
      const zoneRatio = zw / zh
      let basePw: number
      let basePh: number
      if (printRatio > zoneRatio) {
        basePw = zw
        basePh = zw / printRatio
      } else {
        basePh = zh
        basePw = zh * printRatio
      }
      const pw = basePw * ps
      const ph = basePh * ps
      const finalX = zx + px * zw - pw / 2
      const finalY = zy + py * zh - ph / 2

      ctx.save()
      if (placement.is_mirrored) {
        ctx.translate(finalX + pw / 2, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(printImg, -pw / 2, finalY, pw, ph)
      } else {
        ctx.drawImage(printImg, finalX, finalY, pw, ph)
      }
      ctx.restore()
    } else {
      const printRatio = printImg.naturalWidth / printImg.naturalHeight
      const zoneRatio = zw / zh
      let pw: number
      let ph: number
      if (printRatio > zoneRatio) {
        pw = zw
        ph = zw / printRatio
      } else {
        ph = zh
        pw = zh * printRatio
      }
      ctx.drawImage(printImg, zx + (zw - pw) / 2, zy + (zh - ph) / 2, pw, ph)
    }
  }

  return canvas.toDataURL("image/jpeg", 0.75)
}
