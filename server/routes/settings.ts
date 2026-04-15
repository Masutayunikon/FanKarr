import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { readSettings, writeSettings } from '../settings.js'
import { logger } from '../logger.js'

const router = Router()

router.get('/settings', requireAuth, (_req, res) => {
    res.json(readSettings())
})

router.post('/settings', requireAuth, (req, res) => {
    const { mediaPath, completePath, organizeMode, category, nfoSupport, autoImport, devMode, deleteTorrentOnMove, autoUnimportMissing } = req.body
    const patch: Record<string, any> = {}
    if (mediaPath             !== undefined) patch.mediaPath             = mediaPath
    if (completePath          !== undefined) patch.completePath          = completePath
    if (organizeMode          !== undefined) patch.organizeMode          = organizeMode
    if (category              !== undefined) patch.category              = category
    if (nfoSupport            !== undefined) patch.nfoSupport            = nfoSupport
    if (autoImport            !== undefined) patch.autoImport            = autoImport
    if (devMode               !== undefined) patch.devMode               = devMode
    if (deleteTorrentOnMove   !== undefined) patch.deleteTorrentOnMove   = deleteTorrentOnMove
    if (autoUnimportMissing   !== undefined) patch.autoUnimportMissing   = autoUnimportMissing
    const updated = writeSettings(patch)
    logger.info('api', 'Paramètres mis à jour')
    res.json(updated)
})

export default router
