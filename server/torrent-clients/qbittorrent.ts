/**
 * qBittorrent Driver
 */

import type { TorrentClientDriver, TorrentInfo, DownloadOptions } from './index.js'
import { logger } from '../logger.js'

function mapState(state: string): TorrentInfo['state'] {
    if (['downloading', 'metaDL', 'queuedDL', 'stalledDL', 'forcedDL'].includes(state)) return 'downloading'
    if (['uploading', 'queuedUP', 'stalledUP', 'forcedUP'].includes(state))              return 'seeding'
    if (['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP'].includes(state))              return 'paused'
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

async function qbTorrentExists(config: Record<string, string | number>, sid: string, hash: string): Promise<boolean> {
    try {
        const res = await fetch(`${config.url}/api/v2/torrents/info?hashes=${hash}`, {
            headers: { Cookie: `SID=${sid}` },
        })
        if (!res.ok) return false
        const list = await res.json()
        return Array.isArray(list) && list.length > 0
    } catch {
        return false
    }
}

/**
 * Attend que les métadonnées soient disponibles, applique les priorités, puis reprend le torrent.
 * Utilisé après un ajout avec stopCondition=MetadataReceived (qBit actif → auto-pause après metadata)
 * ou pour un torrent déjà présent (resume=false, juste mise à jour de priorité).
 */
async function qbApplyFilePriority(
    config   : Record<string, string | number>,
    hash     : string,
    fileIndex: number,
    resume   : boolean,
): Promise<void> {
    // 60 tentatives × 500 ms = 30 s max
    for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(r => setTimeout(r, 500))
        try {
            const sid = await qbLogin(config)
            const res = await fetch(`${config.url}/api/v2/torrents/files?hash=${hash}`, {
                headers: { Cookie: `SID=${sid}` },
            })
            if (!res.ok) continue
            const files: any[] = await res.json()
            if (!Array.isArray(files) || files.length === 0) continue

            // Si tous les fichiers sont à priorité normale (état initial du torrent),
            // on applique le filtrage complet : on désactive tout sauf la cible.
            // Si certains sont déjà à 0 (filtrage déjà effectué pour un épisode précédent),
            // on se contente d'activer la nouvelle cible sans toucher aux autres.
            const isInitialState = files.every((f: any) => (f.priority ?? 1) > 0)

            if (isInitialState) {
                const unwanted = files.map((_, i) => i).filter(i => i !== fileIndex)
                if (unwanted.length > 0) {
                    const form = new FormData()
                    form.append('hash', hash)
                    form.append('id', unwanted.join('|'))
                    form.append('priority', '0')
                    await fetch(`${config.url}/api/v2/torrents/filePrio`, { method: 'POST', body: form, headers: { Cookie: `SID=${sid}` } })
                }
            }

            // Activer le fichier cible (dans tous les cas)
            const form2 = new FormData()
            form2.append('hash', hash)
            form2.append('id', String(fileIndex))
            form2.append('priority', '1')
            await fetch(`${config.url}/api/v2/torrents/filePrio`, { method: 'POST', body: form2, headers: { Cookie: `SID=${sid}` } })

            // Reprendre (torrent auto-mis en pause par stopCondition=MetadataReceived)
            // On appelle les deux endpoints : resume (qBit ≤ 4.x) et start (qBit ≥ 5.0)
            if (resume) {
                const resumeForm = new FormData()
                resumeForm.append('hashes', hash)
                await Promise.allSettled([
                    fetch(`${config.url}/api/v2/torrents/resume`, { method: 'POST', body: resumeForm, headers: { Cookie: `SID=${sid}` } }),
                    fetch(`${config.url}/api/v2/torrents/start`,  { method: 'POST', body: resumeForm, headers: { Cookie: `SID=${sid}` } }),
                ])
            }

            logger.info('qbittorrent', `Fichier ${fileIndex} sélectionné${resume ? ' + reprise' : ''} pour ${hash.slice(0, 8)}…`)
            return
        } catch {}
    }

    // Timeout : reprendre quand même pour ne pas laisser le torrent bloqué
    if (resume) {
        try {
            const sid = await qbLogin(config)
            const resumeForm = new FormData()
            resumeForm.append('hashes', hash)
            await Promise.allSettled([
                fetch(`${config.url}/api/v2/torrents/resume`, { method: 'POST', body: resumeForm, headers: { Cookie: `SID=${sid}` } }),
                fetch(`${config.url}/api/v2/torrents/start`,  { method: 'POST', body: resumeForm, headers: { Cookie: `SID=${sid}` } }),
            ])
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

        // Récupérer la progression par fichier pour chaque torrent (requêtes parallèles)
        const fileMap = new Map<string, any[]>()
        await Promise.all(data.map(async (t: any) => {
            try {
                const r = await fetch(`${config.url}/api/v2/torrents/files?hash=${t.hash}`, {
                    headers: { Cookie: `SID=${sid}` },
                })
                if (r.ok) fileMap.set(t.hash, await r.json())
            } catch {}
        }))

        return data.map(t => {
            const fileInfo = fileMap.get(t.hash) ?? []
            return {
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
                files     : fileInfo.length > 0
                    ? fileInfo.map((f: any, i: number) => ({ index: i, progress: Math.round((f.progress ?? 0) * 100) }))
                    : undefined,
            } satisfies TorrentInfo
        })
    },

    async add(config, url, options?: DownloadOptions) {
        const sid = await qbLogin(config)

        const hashMatch = url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
        const hash      = hashMatch?.[1]?.toLowerCase() ?? null

        if (options?.file_index != null && hash) {
            const exists = await qbTorrentExists(config, sid, hash)

            if (exists) {
                // Torrent déjà présent → mettre à jour la priorité directement (async OK)
                logger.info('qbittorrent', `Torrent ${hash.slice(0, 8)}… déjà présent, mise à jour priorité fichier ${options.file_index}`)
                qbApplyFilePriority(config, hash, options.file_index, false).catch(err =>
                    logger.warn('qbittorrent', `Priorité fichier non appliquée : ${err instanceof Error ? err.message : err}`)
                )
                return
            }

            // Nouveau torrent → ajout actif avec stopCondition=MetadataReceived
            // qBit fetch les métadonnées normalement via DHT/peers,
            // puis se met en pause automatiquement dès qu'elles sont disponibles.
            // On set les priorités sur la pause, puis on reprend. Zéro data indésirable.
            const form = new FormData()
            form.append('urls', url)
            if (config.category) form.append('category', String(config.category))
            if (config.savePath)  form.append('savepath', String(config.savePath))
            form.append('stopCondition', 'MetadataReceived')  // qBit ≥ 4.6

            const res  = await fetch(`${config.url}/api/v2/torrents/add`, {
                method: 'POST', body: form, headers: { Cookie: `SID=${sid}` },
            })
            const text = await res.text()
            if (text !== 'Ok.') throw new Error(`Ajout échoué : ${text}`)

            logger.info('qbittorrent', `Torrent ajouté (stopCondition=MetadataReceived, sélection fichier ${options.file_index} en attente)`)
            qbApplyFilePriority(config, hash, options.file_index, true).catch(err =>
                logger.warn('qbittorrent', `Priorité fichier non appliquée : ${err instanceof Error ? err.message : err}`)
            )
            return
        }

        // Pas de sélection de fichier → ajout normal
        const form = new FormData()
        form.append('urls', url)
        if (config.category) form.append('category', String(config.category))
        if (config.savePath)  form.append('savepath', String(config.savePath))

        const res  = await fetch(`${config.url}/api/v2/torrents/add`, {
            method: 'POST', body: form, headers: { Cookie: `SID=${sid}` },
        })
        const text = await res.text()
        if (text !== 'Ok.') throw new Error(`Ajout échoué : ${text}`)
        logger.info('qbittorrent', `Torrent ajouté (catégorie: ${config.category ?? 'aucune'}${config.savePath ? `, dossier: ${config.savePath}` : ''})`)
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
