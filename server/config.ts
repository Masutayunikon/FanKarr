import fs from 'fs'
import path from 'path'

export const _isBunBinary = typeof (globalThis as any).Bun !== 'undefined'
    && path.dirname((process as any).execPath) !== process.cwd()

export const BASE_DIR = _isBunBinary
    ? path.dirname((process as any).execPath)
    : process.cwd()

export const DATA_DIR = fs.existsSync('/.dockerenv')
    ? '/config'
    : path.join(BASE_DIR, 'data')