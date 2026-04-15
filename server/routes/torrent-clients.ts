import { Router } from 'express'
import { requireAuth } from '../auth.js'
import {
    getDriver, getAvailableClients,
    listClients, addClient, removeClient, getClient,
    sanitizeClient, updateClient,
} from '../torrent-clients/index.js'

const router = Router()

router.get('/torrent-clients/available', requireAuth, (_req, res) => {
    res.json(getAvailableClients())
})

router.get('/torrent-clients', requireAuth, (_req, res) => {
    res.json(listClients().map((c: any) => sanitizeClient(c)))
})

router.post('/torrent-clients', requireAuth, (req, res) => {
    const { name, type, config } = req.body
    if (!name || !type || !config) { res.status(400).json({ error: 'name, type et config requis' }); return }
    if (!getDriver(type))          { res.status(400).json({ error: `Type inconnu : ${type}` }); return }
    res.json(sanitizeClient(addClient(name, type, config)))
})

router.delete('/torrent-clients/:uuid', requireAuth, (req, res) => {
    const ok = removeClient(String(req.params.uuid))
    if (!ok) { res.status(404).json({ error: 'Client introuvable' }); return }
    res.json({ ok: true })
})

router.put('/torrent-clients/:uuid', requireAuth, (req, res) => {
    const { name, type, config } = req.body
    if (!name || !type || !config) { res.status(400).json({ error: 'name, type et config requis' }); return }
    if (!getDriver(type))          { res.status(400).json({ error: `Type inconnu : ${type}` }); return }
    const oldClient = getClient(String(req.params.uuid))
    if (oldClient) {
        const driver = getDriver(type)
        if (driver) {
            for (const field of driver.definition.fields) {
                if (field.type === 'password' && config[field.key] === '••••••••') {
                    config[field.key] = oldClient.config[field.key]
                }
            }
        }
    }
    const updated = updateClient(String(req.params.uuid), name, type, config)
    if (!updated) { res.status(404).json({ error: 'Client introuvable' }); return }
    res.json(sanitizeClient(updated))
})

router.post('/torrent-clients/test-config', requireAuth, async (req, res) => {
    const { type, config, uuid } = req.body
    if (!type || !config) { res.status(400).json({ error: 'type et config requis' }); return }
    const driver = getDriver(type)
    if (!driver) { res.status(400).json({ error: `Type inconnu : ${type}` }); return }
    if (uuid) {
        const oldClient = getClient(uuid)
        if (oldClient) {
            for (const field of driver.definition.fields) {
                if (field.type === 'password' && config[field.key] === '••••••••') {
                    config[field.key] = oldClient.config[field.key]
                }
            }
        }
    }
    res.json(await driver.test(config))
})

router.post('/torrent-clients/:uuid/test', requireAuth, async (req, res) => {
    const client = getClient(String(req.params.uuid))
    if (!client) { res.status(404).json({ error: 'Client introuvable' }); return }
    const driver = getDriver(client.type)
    if (!driver) { res.status(400).json({ error: 'Driver introuvable' }); return }
    res.json(await driver.test(client.config))
})

router.get('/torrent-clients/:uuid/healthcheck', requireAuth, async (req, res) => {
    const client = getClient(String(req.params.uuid))
    if (!client) { res.status(404).json({ error: 'Client introuvable' }); return }
    const driver = getDriver(client.type)
    if (!driver) { res.status(400).json({ error: 'Driver introuvable' }); return }
    res.json(await driver.healthcheck(client.config))
})

export default router
