/**
 * OpenGamma — PDF Image Resolver & Cache
 *
 * Resolves local file paths, base64 data URLs, and remote URLs
 * into image buffers that PDFKit can draw.
 */

import fs from 'fs'
import https from 'https'
import http from 'http'

const imageBufferCache = new Map<string, Buffer>()

export async function resolveImageBuffer(src: string): Promise<Buffer | null> {
  if (!src) return null

  if (imageBufferCache.has(src)) {
    return imageBufferCache.get(src)!
  }

  try {
    // 1. Data URL (Base64)
    if (src.startsWith('data:')) {
      const commaIdx = src.indexOf(',')
      if (commaIdx !== -1) {
        const base64Data = src.slice(commaIdx + 1)
        const buffer = Buffer.from(base64Data, 'base64')
        imageBufferCache.set(src, buffer)
        return buffer
      }
    }

    // 2. Local file path
    let localPath = src
    if (localPath.startsWith('file://')) {
      localPath = localPath.replace('file://', '')
    }

    if (fs.existsSync(localPath)) {
      const buffer = await fs.promises.readFile(localPath)
      imageBufferCache.set(src, buffer)
      return buffer
    }

    // 3. Remote URL
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const buffer = await fetchRemoteImage(src)
      if (buffer) {
        imageBufferCache.set(src, buffer)
        return buffer
      }
    }
  } catch (err) {
    console.warn('[PDF] Failed to load image:', src, err)
  }

  return null
}

function fetchRemoteImage(url: string, redirectCount = 0): Promise<Buffer | null> {
  if (redirectCount > 3) return Promise.resolve(null)

  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    client
      .get(url, { timeout: 8000 }, (res) => {
        if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          return resolve(fetchRemoteImage(res.headers.location, redirectCount + 1))
        }

        if (res.statusCode !== 200) {
          return resolve(null)
        }

        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', () => resolve(null))
      })
      .on('error', () => resolve(null))
  })
}
