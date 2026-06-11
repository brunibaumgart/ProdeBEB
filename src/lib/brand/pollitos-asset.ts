import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const POLLITOS_PATH = join(process.cwd(), 'public/brand/beb-pollitos.png')

export async function getPollitosImageBase64() {
  const buffer = await readFile(POLLITOS_PATH)
  return `data:image/png;base64,${buffer.toString('base64')}`
}
