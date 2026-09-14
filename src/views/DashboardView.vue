<template>
  <div class="px-4 md:px-10 pt-2 md:pt-[26px] pb-12">
    <div class="max-w-[1400px] flex flex-col gap-[22px]">

      <header class="hidden md:flex items-center justify-between gap-6 min-h-11">
        <div class="flex items-baseline gap-3.5 min-w-0">
          <h1 class="page-title tracking-[0.01em]">Accueil</h1>
          <span class="text-[13px] text-muted truncate">{{ today }}</span>
        </div>
        <label class="hidden md:flex items-center gap-2.5 w-[360px] h-10 rounded-full bg-card border border-border-light pl-4 pr-2 cursor-text focus-within:border-accent transition-colors">
          <Search :size="16" :stroke-width="1.75" class="text-muted shrink-0" />
          <input
              v-model="searchText"
              type="search"
              placeholder="Rechercher une série"
              aria-label="Rechercher une série"
              class="flex-1 min-w-0 bg-transparent outline-none text-sm text-primary placeholder:text-muted"
              @input="openSearchSoon"
              @keydown.enter="librarySearch.open(searchText)"
          />
          <kbd class="h-6 px-[9px] rounded-full bg-hover text-secondary text-[11.5px] font-sans flex items-center">Ctrl K</kbd>
        </label>
      </header>

      <div class="grid lg:grid-cols-[minmax(0,1fr)_356px] gap-7 lg:gap-8">

        <!-- ── Colonne principale-->
        <div class="flex flex-col gap-[30px] min-w-0 max-lg:contents">

          <!-- Dernier import -->
          <section v-if="hero" class="relative sm:min-h-[344px] rounded-card overflow-hidden bg-card max-lg:order-1">
            <img v-if="hero.serie.poster_image" :src="hero.serie.poster_image" alt="" class="absolute inset-0 w-full h-full object-cover blur-[34px] saturate-[1.3] scale-[1.35] opacity-60" />
            <div class="absolute inset-0 bg-linear-to-r from-main/97 via-main/84 via-48% to-main/35" />
            <div class="dot-grid" />
            <div class="relative sm:hidden flex flex-col gap-5 p-4">
              <div class="flex gap-4">
                <RouterLink :to="`/series/${hero.serie.id}`" class="relative shrink-0">
                  <img v-if="hero.serie.poster_image" :src="hero.serie.poster_image" :alt="hero.serie.title" class="w-[88px] h-[132px] object-cover rounded-poster shadow-[0_16px_32px_rgb(0_0_0/0.5),0_0_0_1px_rgb(239_233_221/0.08)]" />
                  <span v-else class="w-[88px] h-[132px] rounded-poster bg-hover flex items-center justify-center text-muted"><Tv :size="22" /></span>
                  <span v-if="isNew(hero.at)" class="stamp-new absolute -left-2 top-3">NOUVEAU</span>
                </RouterLink>
                <div class="flex-1 min-w-0 flex flex-col gap-1.5 pt-1">
                  <span class="text-[10.5px] tracking-[0.16em] font-bold uppercase text-accent">{{ auth.isAdmin ? 'Importé' : 'Ajouté' }} {{ formatRelative(hero.at) }}</span>
                  <RouterLink :to="`/series/${hero.serie.id}`" class="flex flex-col">
                    <span class="font-display text-[28px] leading-[1.05] font-extrabold text-primary line-clamp-2">{{ heroTitle.name }}</span>
                    <span v-if="heroTitle.suffix" class="font-display text-xl leading-snug font-semibold text-accent">{{ heroTitle.suffix }}</span>
                  </RouterLink>
                  <p class="text-meta text-secondary">
                    <template v-for="part in heroMeta" :key="part">{{ part }} · </template>{{ plural(hero.episodes, 'épisode') }} {{ auth.isAdmin ? (hero.episodes > 1 ? 'ajoutés' : 'ajouté') : 'à regarder' }}.
                  </p>
                </div>
              </div>
              <RouterLink :to="`/series/${hero.serie.id}`" class="btn-primary w-full">
                Voir la série <ArrowRight :size="16" />
              </RouterLink>
            </div>
            <div class="relative min-h-[344px] hidden sm:flex items-center gap-9 pl-10 pr-11 py-8">
              <div class="flex-1 min-w-0 flex flex-col gap-4">
                <div class="flex items-center gap-3">
                  <span class="text-[11.5px] tracking-[0.18em] font-bold uppercase text-accent">{{ auth.isAdmin ? 'Dernier import' : 'Nouveau dans la médiathèque' }}</span>
                  <span class="w-[26px] h-px bg-accent/50" />
                  <span class="text-[13px] text-secondary">{{ formatRelative(hero.at) }}</span>
                </div>
                <RouterLink :to="`/series/${hero.serie.id}`" class="flex flex-col gap-0.5 w-fit">
                  <span class="font-display text-[40px] sm:text-[56px] leading-[1.02] font-extrabold text-primary line-clamp-2">{{ heroTitle.name }}</span>
                  <span v-if="heroTitle.suffix" class="font-display text-2xl sm:text-[30px] leading-[1.15] font-semibold text-accent">{{ heroTitle.suffix }}</span>
                </RouterLink>
                <p class="text-[15px] leading-[1.6] text-secondary max-w-[420px] text-pretty">
                  <template v-for="part in heroMeta" :key="part">{{ part }} · </template>
                  <span class="text-primary">{{ plural(hero.episodes, 'épisode') }}{{ auth.isAdmin ? (hero.episodes > 1 ? ' ajoutés' : ' ajouté') : '' }}</span>
                  {{ auth.isAdmin ? 'à la médiathèque.' : 'à regarder.' }}
                </p>
                <div class="flex items-center gap-5 mt-1.5 flex-wrap">
                  <RouterLink :to="`/series/${hero.serie.id}`" class="btn-primary h-[42px] text-sm pl-[22px]">
                    Voir la série <ArrowRight :size="16" />
                  </RouterLink>
                  <RouterLink :to="auth.isAdmin ? '/activity' : '/series'" class="text-body text-secondary hover:text-primary transition-colors">
                    {{ auth.isAdmin ? 'Tous les imports récents' : 'Toutes les nouveautés' }}
                  </RouterLink>
                </div>
              </div>
              <RouterLink :to="`/series/${hero.serie.id}`" class="relative shrink-0 rotate-2">
                <img v-if="hero.serie.poster_image" :src="hero.serie.poster_image" :alt="hero.serie.title" class="w-[180px] h-[270px] object-cover rounded-poster shadow-[0_28px_60px_rgb(0_0_0/0.55),0_0_0_1px_rgb(239_233_221/0.08)]" />
                <span v-if="isNew(hero.at)" class="stamp-new absolute -left-7 top-4 text-[15px] px-[11px] pt-1 pb-[3px] tracking-[0.14em] -rotate-[9deg]">NOUVEAU</span>
              </RouterLink>
            </div>
          </section>

          <section v-else-if="!loadingRecent" class="relative rounded-card overflow-hidden bg-card max-lg:order-1">
            <div class="dot-grid" />
            <div class="relative flex flex-col gap-3 px-6 sm:px-10 py-10">
              <span class="text-[11.5px] tracking-[0.18em] font-bold uppercase text-accent">{{ auth.isAdmin ? 'Dernier import' : 'Nouveautés' }}</span>
              <p class="font-display text-[28px] font-bold text-primary">Rien de nouveau pour l'instant</p>
              <p class="text-body text-secondary max-w-[460px]">
                {{ auth.isAdmin
                  ? 'Les séries importées apparaîtront ici dès la fin de leur téléchargement.'
                  : 'Les séries ajoutées à la médiathèque apparaîtront ici. En attendant, parcourez le catalogue et demandez ce qui vous manque.' }}
              </p>
              <RouterLink to="/series" class="btn-secondary w-fit mt-1">Parcourir la médiathèque</RouterLink>
            </div>
          </section>

          <!-- Récemment ajoutés -->
          <section v-if="recentList.length > 0" class="flex flex-col gap-3.5 max-lg:order-4">
            <div class="flex items-baseline justify-between">
              <h2 class="section-title">Récemment ajoutés</h2>
              <RouterLink to="/series" class="text-[13px] text-secondary hover:text-primary transition-colors flex items-center gap-1">
                Médiathèque <ChevronRight :size="14" />
              </RouterLink>
            </div>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-3.5">
              <RouterLink v-for="item in recentList" :key="item.serie.id" :to="`/series/${item.serie.id}`" class="group flex flex-col gap-2 min-w-0">
                <img v-if="item.serie.poster_image" :src="item.serie.poster_image" :alt="item.serie.title" loading="lazy" class="w-full aspect-[2/3] object-cover rounded-[5px] shadow-[0_0_0_1px_rgb(239_233_221/0.06)] group-hover:-translate-y-0.5 transition-transform" />
                <div v-else class="w-full aspect-[2/3] rounded-[5px] bg-card flex items-center justify-center text-muted"><Tv :size="22" /></div>
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="text-[13px] font-medium text-primary truncate">{{ item.serie.title }}</span>
                  <span class="text-xs text-muted">{{ item.episodes }} ép. · {{ formatRelative(item.at) }}</span>
                </div>
              </RouterLink>
            </div>
          </section>

          <!-- Chiffres -->
          <section data-tour="dashboard-stats" class="border-t border-card pt-[18px] max-lg:order-5">
            <div v-if="auth.isAdmin" class="flex flex-col sm:flex-row gap-3 sm:gap-0">
              <div class="flex-1 flex items-baseline gap-2.5">
                <span class="font-display text-[34px] font-bold text-primary">{{ stats.catalogue }}</span>
                <span class="text-[13px] text-muted">séries au catalogue</span>
              </div>
              <div class="hidden sm:block w-px bg-card mx-6" />
              <div class="flex-1 flex items-baseline gap-2.5">
                <span class="font-display text-[34px] font-bold text-primary">{{ stats.imported }}</span>
                <span class="text-[13px] text-muted">dans la médiathèque · {{ importedPercent }}&nbsp;%</span>
              </div>
              <div class="hidden sm:block w-px bg-card mx-6" />
              <div class="flex-1 flex items-baseline gap-2.5">
                <span class="font-display text-[34px] font-bold text-primary">{{ stats.watched }}</span>
                <span class="text-[13px] text-muted">{{ stats.watched > 1 ? 'séries surveillées' : 'série surveillée' }}</span>
              </div>
            </div>
            <div v-else class="flex items-baseline gap-2.5 flex-wrap">
              <span class="font-display text-[34px] font-bold text-primary">{{ stats.imported }}</span>
              <span class="text-[13px] text-muted">
                {{ stats.imported > 1 ? 'séries disponibles' : 'série disponible' }} dans la médiathèque<template v-if="toRequestCount > 0"> · {{ toRequestCount }} {{ toRequestCount > 1 ? 'autres' : 'autre' }} au catalogue, à demander</template>
              </span>
            </div>
          </section>

          <!-- Panneau debug -->
          <section v-if="devMode" class="flex flex-col gap-3 max-lg:order-6">
            <div class="flex items-center gap-2.5">
              <h2 class="section-title">Diagnostic</h2>
              <span class="pill pill-wait">DEV</span>
              <button @click="fetchDebug" class="ml-auto btn-ghost btn-sm"><RefreshCw :size="13" /> Rafraîchir</button>
            </div>
            <div v-if="debug" class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div v-for="d in debugCards" :key="d.label" class="card flex flex-col gap-1">
                <span class="tag-label">{{ d.label }}</span>
                <span class="font-display text-2xl font-bold" :class="d.accent ? 'text-accent' : 'text-primary'">{{ d.value }}</span>
                <span class="text-meta text-muted">{{ d.hint }}</span>
              </div>
            </div>
            <div v-else class="card text-meta text-muted py-4 text-center">Chargement des stats…</div>
          </section>
        </div>

        <!-- ── Admin --- -->
        <div v-if="auth.isAdmin" class="flex flex-col gap-7 min-w-0 max-lg:contents">

          <section data-tour="dashboard-requests" class="flex flex-col gap-3 max-lg:order-2">
            <div class="flex items-center gap-2.5">
              <h2 class="section-title">À traiter</h2>
              <span v-if="todoCount > 0" class="h-[22px] min-w-[22px] px-[7px] rounded-full bg-accent text-on-accent text-xs font-bold flex items-center justify-center">{{ todoCount }}</span>
            </div>

            <div class="bg-card rounded-card flex flex-col">
              <div v-if="loadingTodo" class="flex items-center gap-2 text-muted text-meta px-[18px] py-5">
                <span class="w-3 h-3 border border-border border-t-accent rounded-full animate-spin" /> Chargement…
              </div>
              <p v-else-if="todoCount === 0" class="text-meta text-muted px-[18px] py-5">Rien à traiter : aucune demande en attente, aucun import en erreur.</p>

              <template v-else>
                <!-- Demandes -->
                <div v-for="req in visibleRequests" :key="req.id" class="flex gap-3.5 px-[18px] py-4 border-b border-hover">
                  <RouterLink :to="`/series/${req.serieId}`" class="shrink-0">
                    <img v-if="posterOf(req.serieId)" :src="posterOf(req.serieId)!" alt="" class="w-10 h-[60px] object-cover rounded-[4px]" />
                    <span v-else class="w-10 h-[60px] rounded-[4px] bg-hover flex items-center justify-center text-muted"><Tv :size="16" /></span>
                  </RouterLink>
                  <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
                    <span class="tag-label">Demande</span>
                    <RouterLink :to="`/series/${req.serieId}`" class="text-[14.5px] font-bold text-primary hover:text-accent transition-colors truncate">{{ titleOf(req.serieId, req.serieName) }}</RouterLink>
                    <span class="text-meta text-secondary">{{ scopeLabel(req) }} · {{ requesterNames(req) }} · {{ formatRelative(req.createdAt) }}</span>
                    <span v-if="req.hasTorrents === false" class="text-meta text-err flex items-center gap-1.5"><TriangleAlert :size="13" /> Aucun torrent disponible</span>
                    <div class="flex items-center gap-x-3.5 gap-y-2 mt-[9px] flex-wrap max-sm:-ml-[54px]">
                      <button @click="approve(req)" :disabled="busy[req.id]" class="btn-sm max-sm:flex-1" :class="req.hasTorrents === false ? 'btn-secondary' : 'btn-primary'">
                        {{ req.hasTorrents === false ? 'Approuver quand même' : 'Approuver et télécharger' }}
                      </button>
                      <button @click="rejectTarget = req" class="text-meta text-secondary hover:text-err transition-colors max-sm:hidden">Refuser</button>
                      <button @click="rejectTarget = req" class="btn-icon btn-sm sm:hidden hover:text-err" title="Refuser" aria-label="Refuser la demande"><X :size="15" /></button>
                    </div>
                  </div>
                </div>

                <!-- Imports en erreur -->
                <div v-for="err in visibleErrors" :key="err.hash" class="flex gap-3.5 px-[18px] py-4 border-b border-hover">
                  <span class="w-10 h-10 rounded-field bg-err/12 text-err flex items-center justify-center shrink-0"><TriangleAlert :size="18" :stroke-width="1.75" /></span>
                  <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
                    <span class="tag-label text-err">Import en erreur</span>
                    <span class="text-[14.5px] font-bold text-primary truncate" :title="err.name">{{ err.title }}</span>
                    <span class="text-meta text-secondary line-clamp-2" :title="err.detail">{{ err.detail }}</span>
                    <div class="flex items-center gap-x-3.5 gap-y-2 mt-[9px] flex-wrap max-sm:-ml-[54px]">
                      <button v-if="err.torrent" @click="retryImport(err)" :disabled="busy[err.hash]" class="btn-secondary btn-sm font-medium max-sm:flex-1">
                        {{ busy[err.hash] ? 'Import…' : 'Réessayer' }}
                      </button>
                      <button v-if="err.serieId" @click="openManualImport(err)" class="text-meta text-secondary hover:text-primary transition-colors max-sm:h-10 max-sm:px-2">Import manuel</button>
                      <RouterLink v-if="!err.torrent" to="/activity" class="text-meta text-secondary hover:text-primary transition-colors">Voir dans Activité</RouterLink>
                    </div>
                  </div>
                </div>

                <!-- Dossiers à renommer -->
                <div v-for="f in visibleFolders" :key="f.serie_id" class="flex gap-3.5 px-[18px] py-4 border-b border-hover">
                  <span class="w-10 h-10 rounded-field bg-accent/10 text-accent flex items-center justify-center shrink-0"><Folder :size="18" :stroke-width="1.75" /></span>
                  <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
                    <span class="tag-label">Dossier à renommer</span>
                    <RouterLink :to="`/series/${f.serie_id}`" class="text-[14.5px] font-bold text-primary hover:text-accent transition-colors truncate">{{ f.serie_title }}</RouterLink>
                    <span class="text-meta text-secondary break-words">{{ f.current.map(basename).join(', ') }} → {{ basename(f.expected) }}</span>
                    <div class="flex items-center gap-x-3.5 gap-y-2 mt-[9px] max-sm:-ml-[54px]">
                      <button @click="renameFolder(f)" :disabled="busy[`folder-${f.serie_id}`]" class="btn-secondary btn-sm font-medium max-sm:flex-1">
                        {{ busy[`folder-${f.serie_id}`] ? 'Renommage…' : 'Renommer le dossier' }}
                      </button>
                    </div>
                  </div>
                </div>

                <RouterLink v-for="more in overflowLinks" :key="more.to + more.label" :to="more.to" class="flex items-center justify-between px-[18px] py-3.5 text-[13px] text-secondary hover:text-primary transition-colors border-b border-hover last:border-b-0">
                  <span>{{ more.label }}</span>
                  <ChevronRight :size="14" />
                </RouterLink>
              </template>
            </div>
          </section>

          <section class="flex flex-col gap-4 max-lg:order-3">
            <div class="flex items-baseline justify-between gap-3">
              <RouterLink to="/activity" class="section-title hover:text-accent transition-colors">Téléchargements</RouterLink>
              <span class="text-meta text-muted">{{ plural(stats.downloading, 'actif') }}<template v-if="totalSpeed > 0"> · {{ formatSpeed(totalSpeed) }}</template></span>
            </div>
            <div v-if="loadingTorrents" class="flex items-center gap-2 text-muted text-meta">
              <span class="w-3 h-3 border border-border border-t-accent rounded-full animate-spin" /> Chargement…
            </div>
            <p v-else-if="activeTorrents.length === 0" class="text-meta text-muted">Aucun téléchargement en cours.</p>
            <div v-for="t in activeTorrents" :key="t.hash" class="flex flex-col gap-[7px]">
              <div class="flex justify-between gap-3">
                <span class="text-body font-medium text-primary truncate" :title="t.name">{{ t.name }}</span>
                <span class="text-[13px] tabular-nums shrink-0" :class="t.state === 'error' ? 'text-err' : 'text-primary'">{{ Math.round(t.progress) }}&nbsp;%</span>
              </div>
              <div class="progress">
                <div class="progress-bar" :class="{ 'bg-muted': t.state === 'paused', 'bg-err': t.state === 'error' }" :style="{ width: `${Math.min(100, t.progress)}%` }" />
              </div>
              <span class="text-xs text-muted">
                {{ formatSize(t.downloaded) }} sur {{ formatSize(t.size) }}<template v-if="t.state === 'downloading' && t.eta > 0"> · reste {{ formatDuration(t.eta) }}</template><template v-else-if="t.state !== 'downloading'"> · {{ torrentStateLabel(t.state) }}</template>
              </span>
            </div>
          </section>
        </div>

        <!-- ── Colonne droite : invité ─────────────────────────── -->
        <div v-else class="flex flex-col gap-7 min-w-0 max-lg:contents">

          <section data-tour="dashboard-requests" class="flex flex-col gap-3 max-lg:order-2">
            <div class="flex items-center gap-2.5">
              <h2 class="section-title">Mes demandes</h2>
              <span v-if="myPendingCount > 0" class="h-[22px] min-w-[22px] px-[7px] rounded-full bg-accent-muted text-accent text-xs font-bold flex items-center justify-center">{{ myPendingCount }}</span>
            </div>
            <div class="bg-card rounded-card flex flex-col">
              <div v-if="loadingTodo" class="flex items-center gap-2 text-muted text-meta px-[18px] py-5">
                <span class="w-3 h-3 border border-border border-t-accent rounded-full animate-spin" /> Chargement…
              </div>
              <p v-else-if="requests.length === 0" class="text-meta text-muted px-[18px] py-5">Aucune demande pour l'instant. Ouvrez une fiche série pour demander ce qui vous manque.</p>
              <RouterLink v-for="req in requests.slice(0, 3)" :key="req.id" :to="`/series/${req.serieId}`" class="flex gap-3.5 px-[18px] py-3.5 border-b border-hover hover:bg-hover/40 transition-colors">
                <img v-if="posterOf(req.serieId)" :src="posterOf(req.serieId)!" alt="" class="w-10 h-[60px] object-cover rounded-[4px] shrink-0" />
                <span v-else class="w-10 h-[60px] rounded-[4px] bg-hover flex items-center justify-center text-muted shrink-0"><Tv :size="16" /></span>
                <div class="flex-1 min-w-0 flex flex-col gap-1">
                  <span class="text-[14.5px] font-bold text-primary truncate">{{ titleOf(req.serieId, req.serieName) }}</span>
                  <span class="text-meta text-secondary">{{ scopeLabel(req) }} · {{ req.status === 'completed' ? 'ajoutée' : 'demandée' }} {{ formatRelative(req.status === 'completed' ? req.updatedAt : req.createdAt) }}</span>
                  <span v-if="req.status === 'completed'" class="flex items-center gap-[7px] text-xs font-bold text-ok"><Check :size="13" :stroke-width="2.5" /> Disponible</span>
                  <span v-else class="pill h-5 px-[9px] text-[11px] w-fit" :class="guestStatus[req.status]?.class">{{ guestStatus[req.status]?.label }}</span>
                </div>
              </RouterLink>
              <RouterLink to="/requests" class="flex items-center justify-between px-[18px] py-3.5 text-[13px] text-secondary hover:text-primary transition-colors">
                <span>Toutes mes demandes</span>
                <ChevronRight :size="14" />
              </RouterLink>
            </div>
          </section>

          <section v-if="notYetHere.length > 0" class="flex flex-col gap-3.5 max-lg:order-3">
            <div class="flex items-baseline justify-between">
              <h2 class="section-title">Pas encore là</h2>
              <span class="text-meta text-muted">au catalogue Fankai</span>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="s in notYetHere" :key="s.id" class="flex flex-col gap-2 min-w-0">
                <RouterLink :to="`/series/${s.id}`">
                  <img v-if="s.poster_image" :src="s.poster_image" :alt="s.title" loading="lazy" class="w-full aspect-[2/3] object-cover rounded-[5px] shadow-[0_0_0_1px_rgb(239_233_221/0.06)]" />
                  <span v-else class="w-full aspect-[2/3] rounded-[5px] bg-card flex items-center justify-center text-muted"><Tv :size="20" /></span>
                </RouterLink>
                <span class="text-meta font-medium text-primary truncate">{{ s.title }}</span>
                <button @click="requestSerie(s)" :disabled="busy[`req-${s.id}`]" class="btn-secondary btn-sm px-2 w-full">
                  {{ busy[`req-${s.id}`] ? 'Envoi…' : 'Demander' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <RejectRequestModal
        v-if="rejectTarget"
        :serie-name="titleOf(rejectTarget.serieId, rejectTarget.serieName)"
        @close="rejectTarget = null"
        @confirm="confirmReject"
    />

    <ManualImportModal
        v-if="manualImport"
        :serie-id="manualImport.serieId"
        :serie-name="manualImport.serieName"
        :seasons="manualImport.seasons"
        :organized="manualImport.organized"
        :initial-path="manualImport.mediaPath"
        @close="manualImport = null"
        @imported="fetchTorrents(); fetchRecent()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useDebounceFn } from '@vueuse/core'
import { ArrowRight, Check, ChevronRight, Folder, RefreshCw, Search, TriangleAlert, Tv, X } from 'lucide-vue-next'
import { useAuthStore }     from '@/stores/auth'
import { useSeriesStore, type Serie } from '@/stores/series'
import { useRequestsStore } from '@/stores/requests'
import { useToast }         from '@/composables/useToast'
import { useLibrarySearch } from '@/composables/useLibrarySearch'
import { formatDuration, formatRelative, formatSize, formatSpeed, formatToday, plural } from '@/utils/format'
import { isNew, splitTitle, statusLabel } from '@/utils/series'
import { requesterNames, scopeLabel, type SerieRequest } from '@/utils/requests'
import RejectRequestModal from '@/components/requests/RejectRequestModal.vue'
import ManualImportModal  from '@/components/ManualImportModal.vue'

const auth          = useAuthStore()
const seriesStore   = useSeriesStore()
const reqStore      = useRequestsStore()
const librarySearch = useLibrarySearch()
const { add: toast } = useToast()

const today      = formatToday()
const searchText = ref('')
const openSearchSoon = useDebounceFn(() => { if (searchText.value.trim()) librarySearch.open(searchText.value) }, 450)

const loadingTorrents = ref(true)
const loadingRecent   = ref(true)
const loadingTodo     = ref(true)
const devMode         = ref(false)
const debug           = ref<any>(null)
const catalogueCount  = ref(0)
const torrents        = ref<any[]>([])
const recent          = ref<{ serieId: number; episodes: number; at: string }[]>([])
const requests        = ref<SerieRequest[]>([])
const errorNotifs     = ref<any[]>([])
const staleFolders    = ref<{ serie_id: number; serie_title: string; expected: string; current: string[] }[]>([])
const busy            = reactive<Record<string, boolean>>({})
const rejectTarget    = ref<SerieRequest | null>(null)
const manualImport    = ref<{ serieId: number; serieName: string; seasons: any[]; organized: Record<string, any>; mediaPath: string } | null>(null)

let interval: ReturnType<typeof setInterval> | null = null

// ── Séries et utilitaires ─────────────────────────────
const seriesById = computed(() => new Map(seriesStore.series.map(s => [s.id, s])))
const posterOf   = (id: number) => seriesById.value.get(id)?.poster_image ?? null
const titleOf    = (id: number, fallback: string) => seriesById.value.get(id)?.title ?? fallback
const basename   = (p: string) => p.split(/[\\/]/).pop() ?? p

const recentWithSerie = computed(() => recent.value
    .map(r => ({ ...r, serie: seriesById.value.get(r.serieId) }))
    .filter((r): r is typeof r & { serie: Serie } => !!r.serie))

const hero       = computed(() => recentWithSerie.value[0] ?? null)
const recentList = computed(() => recentWithSerie.value.slice(1, 7))
const heroTitle  = computed(() => splitTitle(hero.value?.serie.title ?? ''))
const heroMeta   = computed(() => [hero.value?.serie.year, statusLabel(hero.value?.serie.status)].filter(Boolean).map(String))

// ── Chiffres 
const stats = computed(() => ({
  catalogue  : catalogueCount.value || seriesStore.series.length,
  imported   : seriesStore.series.filter(s => s.download_state === 'complete').length,
  watched    : seriesStore.series.filter(s => s.rss_synced).length,
  downloading: torrents.value.filter(t => t.state === 'downloading').length,
}))
const importedPercent = computed(() => stats.value.catalogue > 0 ? Math.round(stats.value.imported / stats.value.catalogue * 100) : 0)
const toRequestCount  = computed(() => Math.max(0, stats.value.catalogue - stats.value.imported))

const activeTorrents = computed(() => torrents.value.filter(t => ['downloading', 'paused', 'checking', 'error'].includes(t.state)).slice(0, 5))
const totalSpeed     = computed(() => torrents.value.filter(t => t.state === 'downloading').reduce((sum, t) => sum + (t.speed ?? 0), 0))

function torrentStateLabel(state: string) {
  return ({ paused: 'en pause', checking: 'vérification', error: 'erreur du client' } as Record<string, string>)[state] ?? state
}

// ── À traiter (admin) 
// Les plus anciennes d'abord
const pendingRequests = computed(() => requests.value.filter(r => r.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt)))


function errorDetail(e: { file: string; error: string }) {
  const ep = basename(e.file).match(/S\d+E(\d+)/i)
  return `${ep ? `E${ep[1]}` : basename(e.file)} · ${e.error}`
}

// Dernier passage d'import de chaque torrent, s'il a laissé des erreurs
const importErrors = computed(() => {
  const seen = new Set<string>()
  const list: { hash: string; name: string; title: string; detail: string; serieId: number | null; torrent: any }[] = []
  for (const n of errorNotifs.value) {
    if (seen.has(n.hash)) continue
    seen.add(n.hash)
    if (!n.errors) continue
    const torrent = torrents.value.find(t => t.hash === n.hash) ?? null
    const serieId = n.serieId ?? torrent?.serieId ?? null
    const first   = n.errorFiles?.[0]
    const detail  = first ? errorDetail(first) : plural(n.errors, 'erreur')
    list.push({
      hash: n.hash, name: n.name, serieId, torrent,
      title : serieId ? titleOf(serieId, n.name) : (torrent?.serieName ?? n.name),
      detail: n.errors > 1 ? `${detail} (+${n.errors - 1})` : detail,
    })
  }
  return list
})

const visibleRequests = computed(() => pendingRequests.value.slice(0, 2))
const visibleErrors   = computed(() => importErrors.value.slice(0, 3))
const visibleFolders  = computed(() => staleFolders.value.slice(0, 3))
const todoCount       = computed(() => pendingRequests.value.length + importErrors.value.length + staleFolders.value.length)

const overflowLinks = computed(() => {
  const links: { to: string; label: string }[] = []
  const moreRequests = pendingRequests.value.length - visibleRequests.value.length
  const moreErrors   = importErrors.value.length - visibleErrors.value.length
  const moreFolders  = staleFolders.value.length - visibleFolders.value.length
  if (moreRequests > 0) links.push({ to: '/requests', label: `${moreRequests} ${moreRequests > 1 ? 'autres demandes' : 'autre demande'} en attente` })
  if (moreErrors > 0)   links.push({ to: '/activity', label: `${moreErrors} ${moreErrors > 1 ? 'autres imports' : 'autre import'} en erreur` })
  if (moreFolders > 0)  links.push({ to: '/settings/import-management', label: `${moreFolders} ${moreFolders > 1 ? 'autres dossiers' : 'autre dossier'} à renommer` })
  return links
})

// ── Invité ────────────────────────────────────────────────────
const myPendingCount = computed(() => requests.value.filter(r => r.status === 'pending').length)

const guestStatus: Record<string, { label: string; class: string }> = {
  pending : { label: 'En attente', class: 'pill-wait' },
  approved: { label: 'Bientôt là', class: 'pill-active' },
  rejected: { label: 'Refusée',    class: 'pill-err' },
}

const notYetHere = computed(() => {
  const requested = new Set(requests.value.filter(r => r.status !== 'rejected').map(r => r.serieId))
  return seriesStore.series
    .filter(s => s.download_state === 'none' && !requested.has(s.id) && !isNew(s.last_imported_at))
    .sort((a, b) => Number(b.has_torrents) - Number(a.has_torrents) || (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 3)
})

// ── Chargement ────────────────────────────────────────────────
async function fetchSettings() {
  if (!auth.isAdmin) return
  const res = await fetch('/api/settings', { credentials: 'include' })
  if (res.ok) {
    const s = await res.json()
    devMode.value = s.devMode ?? false
    if (devMode.value) fetchDebug()
  }
}

async function fetchDebug() {
  const res = await fetch('/api/debug/stats', { credentials: 'include' })
  if (res.ok) debug.value = await res.json()
}

const debugCards = computed(() => debug.value ? [
  { label: 'Heap utilisé',     value: `${debug.value.memory.heapUsed} Mo`, hint: `sur ${debug.value.memory.heapTotal} Mo` },
  { label: 'RSS',              value: `${debug.value.memory.rss} Mo`,      hint: 'mémoire système' },
  { label: 'Uptime',           value: debug.value.uptime,                  hint: 'depuis le démarrage' },
  { label: 'Cache GitHub',     value: debug.value.cache.entries,           hint: `entrées (TTL ${debug.value.cache.ttlHours} h)` },
  { label: 'Fichiers suivis',  value: debug.value.organized.trackedFiles,  hint: 'dans organized.json' },
  { label: 'Worker d’import',  value: debug.value.worker.running ? 'Actif' : 'Inactif', hint: `${debug.value.requests.notifs} import(s) en mémoire`, accent: debug.value.worker.running },
] : [])

async function fetchCatalogue() {
  try {
    const res = await fetch('/api/torrents/status', { credentials: 'include' })
    if (res.ok) catalogueCount.value = (await res.json()).count ?? 0
  } catch {}
}

async function fetchRecent() {
  try {
    const res = await fetch('/api/library/recent?limit=12', { credentials: 'include' })
    if (res.ok) recent.value = await res.json()
  } catch {} finally { loadingRecent.value = false }
}

async function fetchTorrents() {
  if (!auth.isAdmin) { loadingTorrents.value = false; return }
  try {
    const [dl, notifs] = await Promise.all([
      fetch('/api/downloads', { credentials: 'include' }),
      fetch('/api/organize/recent', { credentials: 'include' }),
    ])
    if (dl.ok) torrents.value = await dl.json()
    if (notifs.ok) errorNotifs.value = await notifs.json()
  } catch {} finally { loadingTorrents.value = false }
}

async function fetchRequests() {
  try {
    const res = await fetch('/api/requests', { credentials: 'include' })
    if (res.ok) {
      const all: SerieRequest[] = await res.json()
      requests.value = all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
  } catch {}
}

async function fetchFolders() {
  if (!auth.isAdmin) return
  try {
    const res = await fetch('/api/organized-folders', { credentials: 'include' })
    if (res.ok) staleFolders.value = await res.json()
  } catch {}
}

// ── Actions 
async function patchRequest(req: SerieRequest, body: object) {
  busy[req.id] = true
  try {
    const res = await fetch(`/api/requests/${req.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) { toast((await res.json()).error ?? 'Erreur', 'error'); return false }
    await fetchRequests()
    reqStore.refreshPending()
    return true
  } catch { toast('Impossible de contacter le serveur', 'error'); return false }
  finally { busy[req.id] = false }
}

async function approve(req: SerieRequest) {
  if (await patchRequest(req, { action: 'approve' }))
    toast(req.hasTorrents === false ? 'Demande approuvée, aucun torrent à télécharger' : 'Demande approuvée, téléchargement lancé', 'success')
}

async function confirmReject(message: string) {
  const req = rejectTarget.value
  rejectTarget.value = null
  if (req && await patchRequest(req, { action: 'reject', rejectionMessage: message || undefined })) toast('Demande refusée', 'success')
}

async function retryImport(err: { hash: string; torrent: any }) {
  busy[err.hash] = true
  try {
    const res = await fetch('/api/organize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ hash: err.torrent.hash, save_path: err.torrent.save_path, name: err.torrent.name }),
    })
    const d = await res.json()
    if (!res.ok) toast(d.error ?? "Erreur lors de l'import", 'error')
    else if (d.errors?.length) toast(`${d.done} importé(s), ${d.errors.length} erreur(s)`, 'error')
    else toast(`${d.done} fichier(s) importé(s) ✓`, 'success')
    await Promise.all([fetchTorrents(), fetchRecent()])
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { busy[err.hash] = false }
}

async function openManualImport(err: { serieId: number | null; title: string }) {
  if (!err.serieId) return
  try {
    const [detail, organized, settings] = await Promise.all([
      fetch(`/api/series/${err.serieId}`, { credentials: 'include' }),
      fetch(`/api/organized/${err.serieId}`, { credentials: 'include' }),
      fetch('/api/settings', { credentials: 'include' }),
    ])
    if (!detail.ok) { toast('Série introuvable', 'error'); return }
    const d = await detail.json()
    manualImport.value = {
      serieId  : err.serieId,
      serieName: d.serie?.title ?? err.title,
      seasons  : d.seasons ?? [],
      organized: organized.ok ? await organized.json() : {},
      mediaPath: settings.ok ? ((await settings.json()).mediaPath || '/') : '/',
    }
  } catch { toast('Impossible de contacter le serveur', 'error') }
}

async function renameFolder(f: { serie_id: number; expected: string }) {
  if (!confirm(`Déplacer le contenu vers « ${basename(f.expected)} » ? Les fichiers existants ne sont jamais écrasés.`)) return
  const key = `folder-${f.serie_id}`
  busy[key] = true
  try {
    const res = await fetch(`/api/organized/${f.serie_id}/folder`, { method: 'POST', credentials: 'include' })
    const d = await res.json()
    if (!res.ok) { toast(d.error ?? 'Erreur lors du renommage du dossier', 'error'); return }
    toast(`Dossier renommé ✓ (${plural(d.moved, 'fichier')} ${d.moved > 1 ? 'déplacés' : 'déplacé'})`, 'success')
    await fetchFolders()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { busy[key] = false }
}

async function requestSerie(s: Serie) {
  const key = `req-${s.id}`
  busy[key] = true
  try {
    const res = await fetch('/api/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ serieId: s.id, serieName: s.title, seasons: [] }),
    })
    if (!res.ok) { toast((await res.json()).error ?? 'Erreur', 'error'); return }
    toast(`${s.title} demandée ✓`, 'success')
    await fetchRequests()
    reqStore.refreshPending()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { busy[key] = false }
}

onMounted(async () => {
  if (seriesStore.series.length === 0) seriesStore.fetchSeries()
  await Promise.all([fetchCatalogue(), fetchRecent(), fetchTorrents(), fetchSettings(), fetchRequests(), fetchFolders()])
  loadingTodo.value = false
  interval = setInterval(() => {
    fetchTorrents()
    if (devMode.value) fetchDebug()
  }, 10000)
})

onUnmounted(() => { if (interval) clearInterval(interval) })
</script>
