/**
 * Synology Download Station Driver
 */

import type { TorrentClientDriver, TorrentInfo } from './index.js'
import { logger } from '../logger.js'

// Synology Download Station task status codes
function mapState(status: string): TorrentInfo['state'] {
    if (status === 'downloading')                          return 'downloading'
    if (status === 'seeding' || status === 'finished')    return 'seeding'
    if (status === 'paused')                              return 'paused'
    if (status === 'waiting' || status === 'filehosting_waiting') return 'downloading'
    if (status === 'hash_checking')                       return 'checking'
    if (status === 'error')                               return 'error'
    return 'unknown'
}

// Authentification DSM — retourne un SID
async function dsLogin(config: Record<string, string | number>): Promise<string> {
    const params = new URLSearchParams({
        api    : 'SYNO.API.Auth',
        version: '3',
        method : 'login',
        account: String(config.username ?? ''),
        passwd : String(config.password ?? ''),
        session: 'DownloadStation',
        format : 'sid',
    })

    const res = await fetch(`${config.url}/webapi/auth.cgi?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.success) throw new Error(`Auth échouée : ${JSON.stringify(data.error)}`)
    return data.data.sid
}

async function dsRequest(
    config : Record<string, string | number>,
    api    : string,
    method : string,
    version: string,
    extra  : Record<string, string> = {},
    sid    : string,
): Promise<any> {
    const params = new URLSearchParams({ api, version, method, _sid: sid, ...extra })
    const res = await fetch(`${config.url}/webapi/DownloadStation/task.cgi?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.success) throw new Error(`DS erreur : ${JSON.stringify(data.error)}`)
    return data.data
}

const DS: TorrentClientDriver = {
    definition: {
        id    : 'synology-ds',
        label : 'Synology Download Station',
        fields: [
            { key: 'url',      label: 'URL DSM',         type: 'url',      placeholder: 'http://192.168.1.x:5000', required: true },
            { key: 'username', label: 'Identifiant',     type: 'text',     placeholder: 'admin',                   required: true },
            { key: 'password', label: 'Mot de passe',    type: 'password', placeholder: '••••••••',               required: true },
            { key: 'category', label: 'Catégorie',       type: 'text',     placeholder: 'fankai',                  required: false, default: 'fankai' },
            { key: 'savePath',   label: 'Dossier cible',          type: 'text', placeholder: '/volume1/downloads/fankai', required: false },
            { key: 'remotePath', label: 'Chemin distant (client)', type: 'text', placeholder: '/volume1/downloads',      required: false },
            { key: 'localPath',  label: 'Chemin local (FanKarr)',  type: 'text', placeholder: '/mnt/nas/downloads',      required: false },
        ],
    },

    async test(config) {
        try {
            await dsLogin(config)
            logger.info('synology-ds', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('synology-ds', `Test de connexion échoué sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const sid = await dsLogin(config)
            const params = new URLSearchParams({
                api    : 'SYNO.DownloadStation.Info',
                version: '2',
                method : 'getinfo',
                _sid   : sid,
            })
            const res = await fetch(`${config.url}/webapi/DownloadStation/info.cgi?${params}`)
            if (!res.ok) return { online: false }
            const data = await res.json()
            if (!data.success) return { online: false }
            const version = data.data?.version_string ?? 'inconnue'
            logger.debug('synology-ds', `Healthcheck OK — version ${version}`)
            return { online: true, version }
        } catch (err) {
            logger.debug('synology-ds', `Healthcheck échoué : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const sid  = await dsLogin(config)
        const data = await dsRequest(config, 'SYNO.DownloadStation.Task', 'list', '1',
            { additional: 'transfer,detail' }, sid)

        const tasks: any[] = data?.tasks ?? []

        return tasks
            .filter(t => {
                if (!category) return true
                // Synology n'a pas de labels natifs — on filtre par destination si elle contient la catégorie
                return (t.additional?.detail?.destination as string)?.includes(String(category))
            })
            .map(t => {
                const transfer = t.additional?.transfer ?? {}
                const size     = t.size ?? 0
                const dl       = transfer.size_downloaded ?? 0
                return {
                    hash      : t.id,
                    name      : t.title,
                    state     : mapState(t.status),
                    progress  : size > 0 ? Math.min(100, Math.round((dl / size) * 100)) : 0,
                    size,
                    downloaded: dl,
                    speed     : transfer.speed_download ?? 0,
                    eta       : -1,
                    save_path : t.additional?.detail?.destination ?? '',
                    category  : '',
                } satisfies TorrentInfo
            })
    },

    async add(config, url) {
        const sid = await dsLogin(config)

        const extra: Record<string, string> = { uri: url }
        if (config.savePath) extra.destination = String(config.savePath)

        const params = new URLSearchParams({
            api    : 'SYNO.DownloadStation.Task',
            version: '1',
            method : 'create',
            _sid   : sid,
            ...extra,
        })

        const res = await fetch(`${config.url}/webapi/DownloadStation/task.cgi?${params}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!data.success) throw new Error(`Ajout échoué : ${JSON.stringify(data.error)}`)

        logger.info('synology-ds', `Torrent ajouté avec succès${config.savePath ? ` (dossier: ${config.savePath})` : ''}`)
    },
}

export default DS