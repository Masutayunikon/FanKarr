/**
 * qBittorrent Driver
 * Supports qBittorrent 4.x and 5.x (including 5.2.0+ API key authentication)
 */

import type { TorrentClientDriver, TorrentInfo, DownloadOptions, ClientConfig } from './index.js'
import { clientFetch } from './index.js'
import { logger } from '../logger.js'

// qBittorrent répond normalement "Ok." mais certains setups (reverse proxy, etc.)
// peuvent wrapper la réponse en JSON — on accepte les deux
function isQbAddSuccess(text: string): boolean {
    if (text.trim() === 'Ok.') return true
    try {
        const json = JSON.parse(text)
        if (typeof json?.success_count === 'number') return json.success_count > 0
    } catch {}
    return false
}

function mapState(state: string): TorrentInfo['state'] {
    if (['downloading', 'metaDL', 'queuedDL', 'stalledDL', 'forcedDL'].includes(state)) return 'downloading'
    if (['uploading', 'queuedUP', 'stalledUP', 'forcedUP'].includes(state))              return 'seeding'
    if (['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP'].includes(state))              return 'paused'
    if (['checkingDL', 'checkingUP', 'checkingResumeData'].includes(state))               return 'checking'
    if (state === 'error' || state === 'missingFiles')                                    return 'error'
    return 'unknown'
}

// Retourne les headers d'authentification : Bearer (≥5.2.0) ou cookie SID
async function qbAuth(config: ClientConfig): Promise<Record<string, string>> {
    if (config.apiKey) {
        return { Authorization: `Bearer ${config.apiKey}` }
    }
    const cookie = await qbLogin(config)
    return { Cookie: cookie }
}

async function qbLogin(config: ClientConfig): Promise<string> {
    const form = new URLSearchParams()
    form.append('username', String(config.username ?? ''))
    form.append('password', String(config.password ?? ''))

    const res = await clientFetch(config, `${config.url}/api/v2/auth/login`, {
        method : 'POST',
        body   : form,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    const text = await res.text()
    if (!res.ok) throw new Error(`Login échoué : ${text.trim() || res.status}`)
    if (text.trim() === 'Fails.') throw new Error('Identifiants incorrects (vérifiez le nom d\'utilisateur et le mot de passe)')

    const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0].trim()
    if (!cookie) throw new Error('Cookie de session introuvable')
    return cookie
}

async function qbTorrentExists(config: ClientConfig, authHeaders: Record<string, string>, hash: string): Promise<boolean> {
    try {
        const res = await clientFetch(config, `${config.url}/api/v2/torrents/info?hashes=${hash}`, {
            headers: authHeaders,
        })
        if (!res.ok) return false
        const list = await res.json()
        return Array.isArray(list) && list.length > 0
    } catch {
        return false
    }
}

/**
 * Attend que les fichiers soient disponibles, résout l'index par chemin si possible,
 * puis applique les priorités (désactive tout sauf la cible).
 */
async function qbApplyFilePriority(
    config   : ClientConfig,
    hash     : string,
    fileIndex: number,
): Promise<void> {
    // Première tentative rapide (100 ms), puis 500 ms — 60 tentatives max ≈ 30 s
    for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(r => setTimeout(r, attempt === 0 ? 100 : 500))
        try {
            const authH = await qbAuth(config)
            const res = await clientFetch(config, `${config.url}/api/v2/torrents/files?hash=${hash}`, {
                headers: authH,
            })
            if (!res.ok) continue
            const files: any[] = await res.json()
            if (!Array.isArray(files) || files.length === 0) continue

            if (fileIndex >= files.length) {
                throw new Error(`Index fichier ${fileIndex} hors limites (torrent a ${files.length} fichiers)`)
            }

            // Si tous les fichiers sont à priorité normale (état initial du torrent),
            // on applique le filtrage complet : on désactive tout sauf la cible.
            // Si certains sont déjà à 0 (filtrage déjà effectué pour un épisode précédent),
            // on se contente d'activer la nouvelle cible sans toucher aux autres.
            const isInitialState = files.every((f: any) => (f.priority ?? 1) > 0)

            const headers = { ...authH, 'Content-Type': 'application/x-www-form-urlencoded' }

            if (isInitialState) {
                const unwanted = files.map((_, i) => i).filter(i => i !== fileIndex)
                if (unwanted.length > 0) {
                    const body = new URLSearchParams({ hash, id: unwanted.join('|'), priority: '0' })
                    const r = await clientFetch(config, `${config.url}/api/v2/torrents/filePrio`, { method: 'POST', body, headers })
                    if (!r.ok) { logger.warn('qbittorrent', `filePrio désactivation échouée (${r.status}) — retry`); continue }
                }
            }

            // Activer le fichier cible (dans tous les cas)
            const r2 = await clientFetch(config, `${config.url}/api/v2/torrents/filePrio`, {
                method: 'POST',
                body   : new URLSearchParams({ hash, id: String(fileIndex), priority: '1' }),
                headers,
            })
            if (!r2.ok) { logger.warn('qbittorrent', `filePrio activation échouée (${r2.status}) — retry`); continue }

            // Vérification : le fichier cible est bien à priorité > 0
            const verif = await clientFetch(config, `${config.url}/api/v2/torrents/files?hash=${hash}`, { headers: authH })
            if (verif.ok) {
                const verifiedFiles: any[] = await verif.json()
                const target = verifiedFiles[fileIndex]
                if (!target || (target.priority ?? 0) === 0) {
                    logger.warn('qbittorrent', `Fichier ${fileIndex} toujours à priorité 0 après application — retry`)
                    continue
                }
            }

            logger.info('qbittorrent', `Fichier ${fileIndex} sélectionné pour ${hash.slice(0, 8)}…`)
            return
        } catch (err) {
            if (err instanceof Error && err.message.includes('hors limites')) throw err
        }
    }

    throw new Error(`Timeout : métadonnées non disponibles pour ${hash.slice(0, 8)}…`)
}

const QB: TorrentClientDriver = {
    definition: {
        id    : 'qbittorrent',
        label : 'qBittorrent',
        fields: [
            { key: 'url',      label: 'URL WebUI',       type: 'url',      placeholder: 'http://localhost:8080', required: true },
            { key: 'apiKey',   label: 'Clé API (≥5.2.0)', type: 'password', placeholder: 'qbt_xxxx…',           required: false },
            { key: 'username', label: 'Identifiant',     type: 'text',     placeholder: 'admin',                required: false },
            { key: 'password', label: 'Mot de passe',    type: 'password', placeholder: '••••••••',             required: false },
            { key: 'category', label: 'Catégorie',       type: 'text',     placeholder: 'fankai',               required: false, default: 'fankai' },
            { key: 'savePath',   label: 'Dossier cible',          type: 'text', placeholder: '/downloads/fankai',     required: false },
            { key: 'remotePath', label: 'Chemin distant (client)', type: 'text', placeholder: '/downloads',           required: false },
            { key: 'localPath',  label: 'Chemin local (FanKarr)',  type: 'text', placeholder: '/mnt/nas/downloads',   required: false },
            { key: 'ignoreCertificateErrors', label: 'Ignorer les erreurs de certificat SSL', type: 'boolean', required: false },
        ],
    },

    async test(config) {
        try {
            const authH = await qbAuth(config)
            const res = await clientFetch(config, `${config.url}/api/v2/app/version`, { headers: authH })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
            const authH = await qbAuth(config)
            const res = await clientFetch(config, `${config.url}/api/v2/app/version`, {
                headers: authH,
            })
            if (!res.ok) return { online: false }
            const version = (await res.text()).trim()
            if (version.startsWith('<')) throw new Error('Réponse HTML reçue — clé API invalide ou non supportée par cette version de qBittorrent')
            logger.debug('qbittorrent', `Healthcheck OK — version ${version}`)
            return { online: true, version }
        } catch (err) {
            logger.debug('qbittorrent', `Healthcheck échoué : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const authH  = await qbAuth(config)
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        const res = await clientFetch(config, `${config.url}/api/v2/torrents/info?${params}`, {
            headers: authH,
        })
        if (!res.ok) throw new Error(`qB list échoué : ${res.status}`)
        const data: any[] = await res.json()

        // Récupérer la progression par fichier pour chaque torrent (requêtes parallèles)
        const fileMap = new Map<string, any[]>()
        await Promise.all(data.map(async (t: any) => {
            try {
                const r = await clientFetch(config, `${config.url}/api/v2/torrents/files?hash=${t.hash}`, {
                    headers: authH,
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
                    ? fileInfo.map((f: any, i: number) => ({
                        index   : i,
                        name    : String(f.name ?? ''),
                        progress: f.progress ?? 0,   // 0–1
                        priority: f.priority ?? 1,
                    }))
                    : undefined,
            } satisfies TorrentInfo
        })
    },

    async getFiles(config, hash) {
        const authH = await qbAuth(config)
        const res = await clientFetch(config, `${config.url}/api/v2/torrents/files?hash=${hash}`, {
            headers: authH,
        })
        if (!res.ok) return []
        const data: any[] = await res.json()
        return data.map((f: any, i: number) => ({
            index   : i,
            name    : String(f.name ?? ''),
            progress: f.progress ?? 0,
            priority: f.priority ?? 1,
        }))
    },

    async add(config, url, options?: DownloadOptions) {
        const authH = await qbAuth(config)

        // Priorité : infohash direct (depuis les données API) > parsing du magnet/URL
        const hash = (options?.infohash?.toLowerCase() ?? null)
                  || url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)?.[1]?.toLowerCase()
                  || options?.magnet?.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)?.[1]?.toLowerCase()
                  || null

        if (options?.file_index != null) {
            if (hash) {
                const exists = await qbTorrentExists(config, authH, hash)
                if (exists) {
                    logger.info('qbittorrent', `Torrent ${hash.slice(0, 8)}… déjà présent, mise à jour priorité fichier ${options.file_index}`)
                    qbApplyFilePriority(config, hash, options.file_index).catch(err =>
                        logger.warn('qbittorrent', `Priorité fichier non appliquée : ${err instanceof Error ? err.message : err}`)
                    )
                    return
                }
            }

            // Snapshot des hashes avant ajout (pour retrouver le nouveau si hash inconnu)
            let knownHashes: Set<string> = new Set()
            if (!hash) {
                try {
                    const lr = await clientFetch(config, `${config.url}/api/v2/torrents/info`, { headers: authH })
                    if (lr.ok) knownHashes = new Set((await lr.json()).map((t: any) => String(t.hash).toLowerCase()))
                } catch {}
            }

            // Stratégie d'ajout selon le type de lien :
            //   magnet link  → URLSearchParams (application/x-www-form-urlencoded), pas de binaire
            //   .torrent URL → FormData multipart obligatoire pour uploader le blob binaire
            //                  (qBit n'a pas forcément accès à internet / nyaa.si depuis son réseau Docker)
            const isMagnet = url.startsWith('magnet:')
            let res: Response

            if (isMagnet) {
                const params = new URLSearchParams()
                params.set('urls', url)
                if (config.category) params.set('category', String(config.category))
                if (config.savePath)  params.set('savepath', String(config.savePath))
                res = await clientFetch(config, `${config.url}/api/v2/torrents/add`, {
                    method: 'POST', body: params,
                    headers: { ...authH, 'Content-Type': 'application/x-www-form-urlencoded' },
                })
            } else {
                // FanKarr télécharge le .torrent et l'envoie directement à qBit
                logger.debug('qbittorrent', `Téléchargement .torrent via FanKarr : ${url.slice(0, 120)}`)
                const torrentRes = await fetch(url, { headers: { 'User-Agent': 'FanKarr/1.0' } })
                if (!torrentRes.ok) throw new Error(`Impossible de télécharger le .torrent (${torrentRes.status}) : ${url}`)
                const torrentBytes = await torrentRes.arrayBuffer()
                const form = new FormData()
                if (config.category) form.append('category', String(config.category))
                if (config.savePath)  form.append('savepath', String(config.savePath))
                form.append('torrents', new Blob([torrentBytes], { type: 'application/x-bittorrent' }), 'torrent.torrent')
                res = await clientFetch(config, `${config.url}/api/v2/torrents/add`, { method: 'POST', body: form, headers: authH })
            }
            const text = await res.text()
            if (!isQbAddSuccess(text)) throw new Error(`Ajout échoué : ${text}`)

            if (hash) {
                logger.info('qbittorrent', `Torrent ajouté — sélection fichier ${options.file_index} en attente des métadonnées`)
                qbApplyFilePriority(config, hash, options.file_index).catch(err =>
                    logger.warn('qbittorrent', `Priorité fichier non appliquée : ${err instanceof Error ? err.message : err}`)
                )
            } else {
                // Hash inconnu (pas d'infohash, pas de magnet) → retrouve le nouveau torrent par diff de liste
                logger.info('qbittorrent', `Torrent ajouté sans hash connu — recherche dans la liste (sélection fichier ${options.file_index})`)
                const fileIndex = options.file_index
                ;(async () => {
                    for (let attempt = 0; attempt < 20; attempt++) {
                        await new Promise(r => setTimeout(r, 500))
                        try {
                            const ah = await qbAuth(config)
                            const lr = await clientFetch(config, `${config.url}/api/v2/torrents/info`, { headers: ah })
                            if (!lr.ok) continue
                            const newT = (await lr.json()).find((t: any) => !knownHashes.has(String(t.hash).toLowerCase()))
                            if (!newT) continue
                            const resolvedHash = String(newT.hash).toLowerCase()
                            logger.info('qbittorrent', `Hash résolu : ${resolvedHash.slice(0, 8)}… — application priorité fichier ${fileIndex}`)
                            await qbApplyFilePriority(config, resolvedHash, fileIndex)
                            return
                        } catch {}
                    }
                    logger.warn('qbittorrent', `Impossible de résoudre le hash pour appliquer la priorité fichier ${fileIndex}`)
                })().catch(() => {})
            }
            return
        }

        // Pas de sélection de fichier → ajout normal (URLSearchParams, pas de binaire)
        const params = new URLSearchParams()
        params.set('urls', url)
        if (config.category) params.set('category', String(config.category))
        if (config.savePath)  params.set('savepath', String(config.savePath))

        const res  = await clientFetch(config, `${config.url}/api/v2/torrents/add`, {
            method: 'POST', body: params,
            headers: { ...authH, 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        const text = await res.text()
        if (!isQbAddSuccess(text)) throw new Error(`Ajout échoué : ${text}`)
        logger.info('qbittorrent', `Torrent ajouté (catégorie: ${config.category ?? 'aucune'}${config.savePath ? `, dossier: ${config.savePath}` : ''})`)
    },

    async remove(config, hash, deleteFiles = false) {
        const authH = await qbAuth(config)
        const params = new URLSearchParams({ hashes: hash, deleteFiles: deleteFiles ? 'true' : 'false' })
        const res = await clientFetch(config, `${config.url}/api/v2/torrents/delete`, {
            method : 'POST',
            body   : params,
            headers: { ...authH, 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        if (!res.ok) throw new Error(`Suppression échouée : ${res.status}`)
        logger.info('qbittorrent', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },
}

export default QB
