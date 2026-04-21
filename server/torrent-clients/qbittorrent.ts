/**
 * qBittorrent Driver
 */

import type { TorrentClientDriver, TorrentInfo, DownloadOptions } from './index.js'
import { logger } from '../logger.js'

function mapState(state: string): TorrentInfo['state'] {
    if (['downloading', 'metaDL', 'queuedDL', 'stalledDL', 'forcedDL'].includes(state)) return 'downloading'
    if (['uploading', 'queuedUP', 'stalledUP', 'forcedUP'].includes(state))              return 'seeding'
    if (['pausedDL', 'pausedUP'].includes(state))                                         return 'paused'
    if (['checkingDL', 'checkingUP', 'checkingResumeData'].includes(state))               return 'checking'
    if (state === 'error' || state === 'missingFiles')                                    return 'error'
    return 'unknown'
}

async function qbLogin(config: Record<string, string | number>): Promise<string> {
    const form = new URLSearchParams()
    form.append('username', String(config.username ?? ''))
    form.append('password', String(config.password ?? ''))

    const res = await fetch(`${config.url}/api/v2/auth/login`, {
        method : 'POST',
        body   : form,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const text = await res.text()
    if (text !== 'Ok.') throw new Error(`Login échoué : ${text}`)

    const cookie = res.headers.get('set-cookie') ?? ''
    const sid    = cookie.match(/SID=([^;]+)/)?.[1]
    if (!sid) throw new Error('Cookie SID introuvable')
    return sid
}

async function qbSetFilePriority(config: Record<string, string | number>, hash: string, fileIndex: number): Promise<void> {
    for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(r => setTimeout(r, 2000))
        try {
            const sid = await qbLogin(config)
            const res = await fetch(`${config.url}/api/v2/torrents/files?hash=${hash}`, {
                headers: { Cookie: `SID=${sid}` },
            })
            if (!res.ok) continue
            const files: any[] = await res.json()
            if (!Array.isArray(files) || files.length === 0) continue
            const unwanted = files.map((_, i) => i).filter(i => i !== fileIndex)
            if (unwanted.length > 0) {
                const form = new FormData()
                form.append('hash', hash)
                form.append('id', unwanted.join('|'))
                form.append('priority', '0')
                await fetch(`${config.url}/api/v2/torrents/filePrio`, { method: 'POST', body: form, headers: { Cookie: `SID=${sid}` } })
            }
            const form2 = new FormData()
            form2.append('hash', hash)
            form2.append('id', String(fileIndex))
            form2.append('priority', '1')
            await fetch(`${config.url}/api/v2/torrents/filePrio`, { method: 'POST', body: form2, headers: { Cookie: `SID=${sid}` } })
            logger.info('qbittorrent', `Priorité fichier ${fileIndex} définie pour ${hash.slice(0, 8)}…`)
            return
        } catch {}
    }
    throw new Error(`Timeout : métadonnées non disponibles pour ${hash.slice(0, 8)}…`)
}

const QB: TorrentClientDriver = {
    definition: {
        id    : 'qbittorrent',
        label : 'qBittorrent',
        fields: [
            { key: 'url',      label: 'URL WebUI',       type: 'url',      placeholder: 'http://localhost:8080', required: true },
            { key: 'username', label: 'Identifiant',     type: 'text',     placeholder: 'admin',                required: true },
            { key: 'password', label: 'Mot de passe',    type: 'password', placeholder: '••••••••',             required: true },
            { key: 'category', label: 'Catégorie',       type: 'text',     placeholder: 'fankai',               required: false, default: 'fankai' },
            { key: 'savePath',   label: 'Dossier cible',          type: 'text', placeholder: '/downloads/fankai',     required: false },
            { key: 'remotePath', label: 'Chemin distant (client)', type: 'text', placeholder: '/downloads',           required: false },
            { key: 'localPath',  label: 'Chemin local (FanKarr)',  type: 'text', placeholder: '/mnt/nas/downloads',   required: false },
        ],
    },

    async test(config) {
        try {
            await qbLogin(config)
            logger.info('qbittorrent', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('qbittorrent', `Test de connexion échoué sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const sid = await qbLogin(config)
            const res = await fetch(`${config.url}/api/v2/app/version`, {
                headers: { Cookie: `SID=${sid}` },
            })
            if (!res.ok) return { online: false }
            const version = (await res.text()).trim()
            logger.debug('qbittorrent', `Healthcheck OK — version ${version}`)
            return { online: true, version }
        } catch (err) {
            logger.debug('qbittorrent', `Healthcheck échoué : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const sid    = await qbLogin(config)
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        const res = await fetch(`${config.url}/api/v2/torrents/info?${params}`, {
            headers: { Cookie: `SID=${sid}` },
        })
        if (!res.ok) throw new Error(`qB list échoué : ${res.status}`)
        const data: any[] = await res.json()
        return data.map(t => ({
            hash      : t.hash,
            name      : t.name,
            state     : mapState(t.state),
            progress  : Math.round(t.progress * 100),
            size      : t.size,
            downloaded: t.downloaded,
            uploaded  : t.uploaded ?? 0,
            ratio     : Math.round((t.ratio ?? 0) * 100) / 100,
            speed     : t.dlspeed,
            upspeed   : t.upspeed ?? 0,
            eta       : t.eta ?? -1,
            save_path : t.save_path,
            category  : t.category ?? '',
        } satisfies TorrentInfo))
    },

    async add(config, url, options?: DownloadOptions) {
        const sid  = await qbLogin(config)
        const form = new FormData()
        form.append('urls', url)
        if (config.category) form.append('category', String(config.category))
        if (config.savePath)  form.append('savepath', String(config.savePath))
        const res = await fetch(`${config.url}/api/v2/torrents/add`, {
            method : 'POST',
            body   : form,
            headers: { Cookie: `SID=${sid}` },
        })
        const text = await res.text()
        if (text !== 'Ok.') throw new Error(`Ajout échoué : ${text}`)
        logger.info('qbittorrent', `Torrent ajouté avec succès (catégorie: ${config.category ?? 'aucune'}${config.savePath ? `, dossier: ${config.savePath}` : ''})`)
        if (options?.file_index != null) {
            const hashMatch = url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
            const hash = hashMatch?.[1]?.toLowerCase() ?? null
            if (hash) {
                qbSetFilePriority(config, hash, options.file_index).catch(err =>
                    logger.warn('qbittorrent', `Priorité fichier non appliquée : ${err instanceof Error ? err.message : err}`)
                )
            } else {
                logger.warn('qbittorrent', `file_index ignoré : hash non extractible depuis l'URL`)
            }
        }
    },

    async remove(config, hash, deleteFiles = false) {
        const sid  = await qbLogin(config)
        const form = new FormData()
        form.append('hashes', hash)
        form.append('deleteFiles', deleteFiles ? 'true' : 'false')
        const res = await fetch(`${config.url}/api/v2/torrents/delete`, {
            method : 'POST',
            body   : form,
            headers: { Cookie: `SID=${sid}` },
        })
        if (!res.ok) throw new Error(`Suppression échouée : ${res.status}`)
        logger.info('qbittorrent', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },
}

export default QB