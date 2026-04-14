/**
 * uTorrent Driver
 */

import type { TorrentClientDriver, TorrentInfo } from './index.js'
import { logger } from '../logger.js'

// uTorrent status flags (bitmask) :
// 1 = Started, 2 = Checking, 4 = Start after check, 8 = Checked,
// 16 = Error, 32 = Paused, 64 = Queued, 128 = Loaded
function mapState(status: number): TorrentInfo['state'] {
    if (status & 16)                    return 'error'
    if (status & 32)                    return 'paused'
    if (status & 2)                     return 'checking'
    // Démarré + chargé + vérifié → on regarde le ratio de progression
    if (status & 1 && status & 8)       return 'downloading'
    if (status & 64)                    return 'downloading' // queued
    return 'unknown'
}

// uTorrent nécessite un token CSRF + cookie à chaque session
interface UTSession { token: string; cookie: string }

async function utGetSession(config: Record<string, string | number>): Promise<UTSession> {
    const auth    = btoa(`${config.username ?? ''}:${config.password ?? ''}`)
    const headers : Record<string, string> = {
        'Authorization': `Basic ${auth}`,
    }

    const res = await fetch(`${config.url}/gui/token.html`, { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status} — token introuvable`)

    const text   = await res.text()
    const match  = text.match(/<div[^>]+id=['"]token['"][^>]*>([^<]+)</)
    if (!match) throw new Error('Token CSRF introuvable dans la réponse')
    const token  = match[1].trim()
    const cookie = res.headers.get('set-cookie') ?? ''

    return { token, cookie }
}

async function utRequest(
    config : Record<string, string | number>,
    params : Record<string, string>,
    session: UTSession,
): Promise<any> {
    const auth = btoa(`${config.username ?? ''}:${config.password ?? ''}`)
    const qs   = new URLSearchParams({ token: session.token, ...params })

    const res = await fetch(`${config.url}/gui/?${qs}`, {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Cookie'       : session.cookie,
        },
    })
    if (!res.ok) throw new Error(`uTorrent HTTP ${res.status}`)
    return res.json()
}

function mapTorrent(t: any[]): TorrentInfo {
    // uTorrent retourne un tableau par torrent :
    // [hash, status, name, size, progress, downloaded, uploaded, ratio,
    //  ul_speed, dl_speed, eta, label, peers_connected, peers_swarm,
    //  seeds_connected, seeds_swarm, availability, queue_order, remaining]
    const [hash, status, name, size, progress, downloaded, uploaded, ratio, ulSpeed, dlSpeed, eta, label] = t
    return {
        hash      : hash.toLowerCase(),
        name,
        state     : progress >= 1000 ? 'seeding' : mapState(status),
        progress  : Math.min(100, Math.round(progress / 10)),
        size,
        downloaded,
        uploaded  : uploaded ?? 0,
        ratio     : Math.round(((ratio ?? 0) / 1000) * 100) / 100, // uTorrent ratio est x1000
        speed     : dlSpeed ?? 0,
        upspeed   : ulSpeed ?? 0,
        eta       : eta ?? -1,
        save_path : '',
        category  : label ?? '',
    }
}

const UT: TorrentClientDriver = {
    definition: {
        id    : 'utorrent',
        label : 'uTorrent',
        fields: [
            { key: 'url',      label: 'URL WebUI',          type: 'url',      placeholder: 'http://localhost:8080',  required: true },
            { key: 'username', label: 'Identifiant',        type: 'text',     placeholder: 'admin',                  required: true },
            { key: 'password', label: 'Mot de passe',       type: 'password', placeholder: '••••••••',              required: true },
            { key: 'category', label: 'Catégorie',          type: 'text',     placeholder: 'fankai',                 required: false, default: 'fankai' },
            { key: 'savePath', label: 'Dossier cible',      type: 'text',     placeholder: '/downloads/fankai',      required: false },
            { key: 'remotePath', label: 'Chemin distant (client)', type: 'text', placeholder: '/downloads',          required: false },
            { key: 'localPath',  label: 'Chemin local (FanKarr)',  type: 'text', placeholder: '/mnt/nas/downloads',  required: false },
        ],
    },

    async test(config) {
        try {
            await utGetSession(config)
            logger.info('utorrent', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('utorrent', `Test de connexion échoué sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const session = await utGetSession(config)
            const data    = await utRequest(config, { action: 'getsettings' }, session)
            const version = data?.['build']?.toString() ?? 'inconnue'
            logger.debug('utorrent', `Healthcheck OK — build ${version}`)
            return { online: true, version }
        } catch (err) {
            logger.debug('utorrent', `Healthcheck échoué : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const session = await utGetSession(config)
        const data    = await utRequest(config, { list: '1' }, session)
        const torrents: any[][] = data?.torrents ?? []

        return torrents
            .filter(t => {
                if (!category) return true
                return t[11] === category // index 11 = label
            })
            .map(t => {
                const info = mapTorrent(t)

                // Récupérer le save_path depuis les properties si disponible
                const props = data?.props?.find((p: any) => p[0]?.toLowerCase() === info.hash)
                if (props) info.save_path = props[1] ?? ''

                return info
            })
    },

    async add(config, url) {
        const session = await utGetSession(config)
        const auth    = btoa(`${config.username ?? ''}:${config.password ?? ''}`)

        const form = new FormData()
        form.append('torrent_url', url)

        const qs = new URLSearchParams({
            token : session.token,
            action: 'add-url',
            s     : url,
        })

        if (config.savePath) {
            qs.set('path', String(config.savePath))
        }

        const res = await fetch(`${config.url}/gui/?${qs}`, {
            method : 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Cookie'       : session.cookie,
            },
        })

        if (!res.ok) throw new Error(`Ajout échoué : HTTP ${res.status}`)

        // Appliquer le label/catégorie si défini
        if (config.category) {
            // On ne peut pas set le label au moment de l'ajout, il faut attendre
            // que le torrent soit chargé — on le fait via setprops après un délai
            setTimeout(async () => {
                try {
                    const s2   = await utGetSession(config)
                    const data = await utRequest(config, { list: '1' }, s2)
                    const torrents: any[][] = data?.torrents ?? []
                    // Trouver le torrent le plus récemment ajouté sans label
                    const target = torrents.find(t => !t[11])
                    if (target) {
                        await utRequest(config, {
                            action: 'setprops',
                            hash  : target[0],
                            s     : 'label',
                            v     : String(config.category),
                        }, s2)
                    }
                } catch {}
            }, 3000)
        }

        logger.info('utorrent', `Torrent ajouté avec succès (catégorie: ${config.category ?? 'aucune'}${config.savePath ? `, dossier: ${config.savePath}` : ''})`)
    },

    async remove(config, hash, deleteFiles = false) {
        const s = await utGetSession(config)
        await utRequest(config, {
            action: deleteFiles ? 'removedata' : 'remove',
            hash  : hash.toUpperCase(),
        }, s)
        logger.info('utorrent', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },
}

export default UT