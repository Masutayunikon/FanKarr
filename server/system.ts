import fs from 'fs'
import os from 'os'
import type { Request, Response } from 'express'

// GET /api/system/info
export function systemInfo(_req: Request, res: Response): void {
    const isTermux  = fs.existsSync('/data/data/com.termux')
    const platform  = os.platform()

    res.json({
        platform,
        isTermux,
        defaultPath: isTermux ? '/sdcard/' : '/',
    })
}