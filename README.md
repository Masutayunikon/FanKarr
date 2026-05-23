<div align="center">

# FanKarr

![Version](https://img.shields.io/github/v/release/masutayunikon/fankarr?style=flat-square&color=e8513a&label=version)
![Docker Image Size](https://img.shields.io/docker/image-size/masutayunikon/fankarr/latest?style=flat-square&color=1e2d3d&label=image)
![Docker Pulls](https://img.shields.io/docker/pulls/masutayunikon/fankarr?style=flat-square&color=1e2d3d)
![GitHub Actions](https://img.shields.io/github/actions/workflow/status/masutayunikon/fankarr/containerize.yml?style=flat-square&label=build)
![License](https://img.shields.io/github/license/masutayunikon/fankarr?style=flat-square&color=5a7a94)
![Vue](https://img.shields.io/badge/vue-3-42b883?style=flat-square)
![Bun](https://img.shields.io/badge/bun-ready-f9f1e1?style=flat-square)

**Gestionnaire de téléchargements pour le catalogue [Fankai](https://fankai.fr)**  
Inspiré de Radarr/Sonarr — interface dédiée aux éditions Kai & Yabai

![Banner](.github/images/banner.svg)

</div>

---

## Aperçu

<!-- [img] : vue catalogue complète — grille des affiches avec les barres d'état en bas de chaque affiche (couleurs : dispo / en cours / importé), barre de recherche visible -->
![Catalogue](.github/images/catalog.png)

> Vue catalogue : toutes les séries Fankai. Une barre en bas de chaque affiche indique l'état — disponible, en cours de téléchargement ou déjà importé dans votre médiathèque.

---

<!-- [img] : vue série — détail des saisons et épisodes avec badges VOSTFR/MULTI + drapeaux, boutons de téléchargement avec dropdown multi-sources, barres de progression par épisode -->
![Série](.github/images/serie.png)

> Vue série : épisodes avec badge de langue (VOSTFR / MULTI), progression par fichier, et dropdown de sélection quand plusieurs sources sont disponibles.

---

<!-- [img] : vue téléchargements — liste des torrents actifs avec barres de progression, état d'organisation, badges erreur au hover -->
![Téléchargements](.github/images/downloads.png)

> Vue téléchargements : suivi en temps réel, état d'organisation par torrent et détail des erreurs au survol.

---

## Fonctionnalités

### 📥 Téléchargement
- **Catalogue complet** des séries Fankai avec affiches et état de disponibilité
- **Téléchargement en un clic** vers votre client torrent — par épisode, par saison ou en intégrale
- **Dropdown intelligent** sur chaque bouton quand plusieurs sources sont disponibles (qualités différentes, packs différents)
- **"Tout télécharger"** unifié — sélectionne automatiquement les épisodes non couverts par l'intégrale choisie et complète avec les packs individuels
- **Progression par fichier** — barre de téléchargement au niveau de l'épisode, même pour les fichiers dans un pack intégrale
- **RSS Sync** — surveillance automatique des nouvelles sorties toutes les 6 heures pour les séries abonnées, téléchargement sans intervention

### 🗂️ Organisation
- **Import automatique** des fichiers terminés vers votre médiathèque, déclenché dès la fin d'un téléchargement ou toutes les 5 minutes en arrière-plan
- **Scan de médiathèque** — détecte les fichiers déjà présents sur le disque et les référence sans les déplacer
- **Mode hardlink** (recommandé), **déplacement** ou **copie** — le hardlink préserve le seeding du client torrent
- **Désimport automatique** optionnel quand un fichier est supprimé du disque
- **Suppression du dossier série** automatique lors d'un désimport complet avec suppression des fichiers

### 📋 Demandes
- **Système de demandes** — les utilisateurs peuvent demander des séries, saisons ou épisodes spécifiques depuis l'interface ou le plugin Jellyfin
- **Workflow admin** — approbation / refus avec message / marquage disponible depuis la page dédiée
- **Auto-téléchargement** configurable par utilisateur — les demandes sont approuvées et lancées automatiquement pour les utilisateurs autorisés
- **Suppression en masse** pour les admins (bouton "Tout supprimer")
- **Nettoyage automatique** — les demandes marquées "disponible" sont supprimées lors du désimport de la série concernée

### 🏷️ Métadonnées & Affichage
- **Badges de langue** VOSTFR et MULTI avec drapeaux sur chaque épisode (détectés automatiquement)
- **Support NFO** — nommage compatible avec les plugins Jellyfin/Plex utilisant les fichiers `.nfo`
- **Intégration Plex** — connexion à votre serveur Plex pour déclencher le scan médiathèque après import

### 👥 Utilisateurs & Jellyfin
- **Multi-utilisateurs** avec rôles (`admin` / `user`) et système d'invitations
- **SSO Jellyfin** — les utilisateurs se connectent avec leur compte Jellyfin, aucun mot de passe FanKarr requis
- **Synchronisation Jellyfin** — création automatique des comptes FanKarr pour les utilisateurs Jellyfin, toutes les heures en arrière-plan ou manuellement depuis les paramètres
- **Token API personnel** — chaque utilisateur dispose d'un token pour accéder à l'API publique

### ⚙️ Système
- **Logs centralisés** — filtre par niveau et source, rotation automatique, clear depuis l'UI
- **Authentification** par mot de passe avec session JWT
- **Multi-client torrent** — qBittorrent, Transmission, Synology Download Station, µTorrent, rTorrent, Real-Debrid, AllDebrid
- **Compatible Docker / Runtipi / Binaire autonome**

---

## Données torrent — Scraper

Les données du catalogue sont récupérées depuis le repo [`fankarr-scraper`](https://github.com/masutayunikon/fankarr-scraper).

Ce repo contient un pipeline Python qui collecte, parse et résout les torrents Fankai depuis les trackers publics, les croise avec l'API metadata de Fankai pour identifier chaque épisode, et publie le résultat automatiquement **toutes les 6 heures** via GitHub Actions. Les données sont organisées par série dans un dossier `/serie` et des fichiers d'index à la racine du repo.

FanKarr récupère ces données au démarrage et via le bouton **Mettre à jour** dans les paramètres. Aucun scraping ne se fait en local.

---

## Installation

### Docker Compose (recommandé)

**Prérequis** : Docker + Docker Compose, un client torrent accessible en réseau.

```yaml
services:
  fankarr:
    image: masutayunikon/fankarr:latest
    container_name: fankarr
    environment:
      - PUID=1000        # UID de votre utilisateur (id -u)
      - PGID=1000        # GID de votre utilisateur (id -g)
      - TZ=Europe/Paris  # Votre timezone
    volumes:
      - ./config:/config  # Config, logs, base de données
      - /votre/chemin:/media  # Racine de votre médiathèque (voir note hardlinks)
    ports:
      - 9898:9898
    restart: unless-stopped
```

```bash
docker compose up -d
```

> **⚠️ Note sur les hardlinks** : Pour que le mode `hardlink` fonctionne, vos dossiers de téléchargement complets et votre médiathèque doivent être sur le **même filesystem**. La solution recommandée est de monter un seul volume racine (ex: `/votre/chemin:/media`) et de configurer vos chemins à l'intérieur — comme Radarr et Sonarr le font.
>
> Plusieurs volumes sont possibles mais les hardlinks ne fonctionneront pas entre deux volumes différents — FanKarr basculera automatiquement en copie.

---

### Binaire autonome (Windows / Linux / macOS)

Téléchargez l'archive correspondant à votre système depuis les [Releases GitHub](https://github.com/masutayunikon/fankarr/releases/latest) :

| Système                          | Archive                          |
| -------------------------------- | -------------------------------- |
| Windows x64                      | `fankarr-windows-x64.zip`        |
| Windows Legacy (anciens CPU)     | `fankarr-windows-legacy.zip`     |
| Linux x64                        | `fankarr-linux-x64.zip`          |
| macOS (Apple Silicon)            | `fankarr-macos.zip`              |

Extrayez l'archive — tous les fichiers doivent rester ensemble dans le même répertoire :

```
fankarr-windows-x64/
├── fankarr.exe        ← lancer ce fichier
├── organize-worker.js ← worker d'organisation (ne pas déplacer)
├── .env               ← configuration optionnelle (voir Variables d'environnement)
└── public/            ← assets frontend (ne pas déplacer)
```

> Le fichier `.env` permet de configurer le port, la durée des sessions, etc. sans passer par des variables d'environnement système. Il est chargé automatiquement au démarrage si présent à côté du binaire.

**Linux / macOS** — rendre le binaire exécutable avant le premier lancement :

```bash
wget https://github.com/Masutayunikon/FanKarr/releases/download/v3.14.6/fankarr-linux-arm64.zip
unzip fankarr-linux-arm64.zip -d fankarr
cd fankarr
################
# if the "fankarr" files in inside the binaries directory use this command
# mv ./binaries/fankarr .
##################
chmod +x fankarr
./fankarr
```

FanKarr sera accessible sur `http://localhost:9898`. La configuration, les logs et la base de données sont sauvegardés dans un dossier `config/` créé automatiquement à côté du binaire.

---

### Variables d'environnement

| Variable           | Défaut        | Description                                                                     |
| ------------------ | ------------- | ------------------------------------------------------------------------------- |
| `PUID`             | `1000`        | UID utilisateur pour les permissions fichiers (Docker)                          |
| `PGID`             | `1000`        | GID utilisateur pour les permissions fichiers (Docker)                          |
| `TZ`               | —             | Timezone (ex: `Europe/Paris`)                                                   |
| `PORT`             | `9898`        | Port d'écoute du serveur                                                        |
| `JWT_SECRET`       | auto-généré   | Secret JWT — généré automatiquement dans `/config/secret.key` si absent         |
| `AUTH_TOKEN_EXPIRY`| `30d`         | Durée de validité du token de connexion (ex: `7d`, `1y`, `never`)               |
| `DATA_DIR`         | `./config`    | Répertoire de stockage des données (binaire uniquement)                         |
| `GITHUB_RAW_URL`   | repo scraper  | URL de base du repo scraper si vous hébergez votre propre instance              |

---

### Premier démarrage

1. Ouvrir `http://localhost:9898`
2. Créer un mot de passe à la première connexion
3. Aller dans **Paramètres** → configurer votre client torrent
4. Renseigner le chemin vers le dossier des **torrents terminés** et celui de votre **médiathèque**
5. Choisir le mode d'organisation : `hardlink` (recommandé), `move` ou `copy`
6. Optionnel : lancer le **scan** pour référencer les fichiers déjà présents sur le disque
7. Retourner au catalogue et télécharger

<!-- [img] : page paramètres — formulaire de configuration client torrent, chemins, mode d'organisation, toggles autoImport / NFO / désimport auto -->
![Paramètres](.github/images/settings.png)

---

## Organisation des fichiers

FanKarr organise les fichiers terminés vers la structure attendue par Jellyfin / Plex :

```
Black Lagoon Henshū/
├── Saison 1/
│   ├── Black Lagoon Henshū.S01E01.MULTI.1080p.x264-FANKAI.mkv
│   ├── Black Lagoon Henshū.S01E02.MULTI.1080p.x264-FANKAI.mkv
│   ├── Black Lagoon Henshū.S01E03.MULTI.1080p.x264-FANKAI.mkv
│   └── Black Lagoon Henshū.S01E04.MULTI.1080p.x264-FANKAI.mkv
├── Saison 2/
│   ├── Black Lagoon Henshū.S02E05.MULTI.1080p.x264-FANKAI.mkv
│   ├── Black Lagoon Henshū.S02E06.MULTI.1080p.x264-FANKAI.mkv
│   └── Black Lagoon Henshū.S02E07.MULTI.1080p.x264-FANKAI.mkv
└── Saison 3/
    └── Black Lagoon Henshū.S03E08.MULTI.1080p.x264-FANKAI.mkv
```

Le mode **hardlink** est recommandé si vos dossiers de téléchargement et de médiathèque sont sur le même filesystem — les fichiers ne sont pas déplacés et le client torrent continue de seeder sans interruption.

L'organisation se déclenche :
- **Automatiquement** dès la fin d'un téléchargement, et toutes les 5 minutes en arrière-plan pour les torrents déjà en seeding
- **Manuellement** depuis le bouton **Importer** dans la vue téléchargements

Le **scan médiathèque** permet de référencer des fichiers déjà présents sur le disque sans les déplacer — utile si vous avez déjà une bibliothèque existante.

---

## Logs

<!-- [img] : page logs — liste des événements avec filtres niveau/source, bouton clear, affichage compact -->
![Logs](.github/images/logs.png)

> Tous les événements sont horodatés et filtrables par source (`organize`, `api`, `torrent`, …) et niveau (`info`, `warn`, `error`, `debug`).

---

## Plugin Jellyfin — FanKarr Search

Un plugin Jellyfin est disponible pour intégrer la recherche FanKarr directement dans l'interface de votre serveur. Vos utilisateurs peuvent parcourir le catalogue et demander des séries sans quitter Jellyfin.

👉 **[jellyfin-plugin-fankarr-search](https://github.com/Masutayunikon/jellyfin-plugin-fankarr-search)**

Le plugin nécessite **[Jellyfin JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)** — consultez le README du plugin pour les instructions d'installation.

### Synchronisation des utilisateurs

FanKarr peut créer automatiquement un compte pour chaque utilisateur Jellyfin actif. La synchronisation se fait :
- **Automatiquement** toutes les heures en arrière-plan (si Jellyfin est configuré)
- **Manuellement** depuis **Paramètres → Jellyfin → Synchroniser**

Les comptes créés n'ont pas de mot de passe FanKarr — l'authentification se fait uniquement via SSO Jellyfin.

---

## API Publique

FanKarr expose une API publique `v1` utilisée par le plugin Jellyfin et toute intégration tierce.

**Auth** : `Authorization: Bearer <token>` (token visible dans **Profil → Token API**)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/v1/auth/jellyfin` | Échange un token Jellyfin contre un token FanKarr |
| `GET` | `/api/v1/auth/me` | Informations de l'utilisateur connecté |
| `GET` | `/api/v1/series/search?q=` | Recherche dans le catalogue (titre, note, année, description, demande en cours) |
| `GET` | `/api/v1/series/:id` | Détail d'une série — saisons et épisodes (proxy FanKai) |
| `POST` | `/api/v1/requests` | Créer ou mettre à jour une demande |
| `GET` | `/api/v1/requests` | Demandes de l'utilisateur authentifié |

### SSO Jellyfin

```http
POST /api/v1/auth/jellyfin
Content-Type: application/json

{ "jellyfinUserId": "...", "jellyfinToken": "..." }
```

Retourne `{ token, username, role }`. Le `token` est ensuite utilisé comme Bearer pour tous les autres appels.

### Recherche

```http
GET /api/v1/series/search?q=dragon+ball
Authorization: Bearer <token>
```

```json
[
  {
    "id": 42,
    "title": "Dragon Ball Z Kai",
    "original_title": "DRAGON BALL Z KAI",
    "image": "https://...",
    "available": true,
    "year": 2009,
    "rating": 8.5,
    "description": "Suite de Dragon Ball...",
    "request": {
      "id": "uuid",
      "status": "pending",
      "seasons": [1, 2],
      "episodes": []
    }
  }
]
```

Le champ `request` est `null` si aucune demande active n'existe pour cette série.

### Détail série (saisons & épisodes)

```http
GET /api/v1/series/42
Authorization: Bearer <token>
```

```json
{
  "id": 42,
  "title": "Dragon Ball Z Kai",
  "seasons": [
    {
      "season_number": 1,
      "episodes": [
        { "id": 101, "episode_number": 1, "title": "...", "image": "https://..." }
      ]
    }
  ]
}
```

### Créer une demande

```http
POST /api/v1/requests
Authorization: Bearer <token>
Content-Type: application/json

{ "serieId": 42, "serieName": "Dragon Ball Z Kai", "seasons": [1, 2] }
```

- `seasons` : numéros de saison (`season_number`). Tableau vide = toutes les saisons.
- `episodes` : IDs d'épisodes (`episode.id`). Prend le dessus sur `seasons` si renseigné.
- Si une demande active existe déjà, les saisons/épisodes sont **fusionnés**.

---

## Runtipi

FanKarr est disponible dans l'appstore personnalisé. Pour l'installer :

1. Dans Runtipi, aller dans **Paramètres → App Stores**
2. Ajouter l'URL : `https://github.com/Masutayunikon/runtipi-appstore`
3. FanKarr apparaît dans le catalogue → **Installer**

---

## Stack technique

| Couche            | Technologie                              |
| ----------------- | ---------------------------------------- |
| Frontend          | Vue 3 + Vite + Tailwind CSS v4           |
| Backend           | Express 5 + TypeScript                   |
| Auth              | JWT + bcrypt                             |
| Worker            | Node Worker Threads (organisation async) |
| Packaging Docker  | `node:20-slim` + pnpm + gosu (PUID/PGID) |
| Packaging binaire | Bun (self-contained, pas de Node requis) |

---

## Liens

- [fankai.fr](https://fankai.fr) — Le projet Fankai
- [Plugin Jellyfin FanKarr Search](https://github.com/Masutayunikon/jellyfin-plugin-fankarr-search) — Recherche et demandes FanKarr dans Jellyfin
- [Plugin Jellyfin Fankai](https://github.com/Nackophilz/fankai_jellyfin) — Reconnaissance des métadonnées dans Jellyfin
- [fankarr-scraper](https://github.com/masutayunikon/fankarr-scraper) — Pipeline de collecte des torrents
- [runtipi-appstore](https://github.com/Masutayunikon/runtipi-appstore) — Appstore Runtipi personnel