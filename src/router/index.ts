import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // ─── Page publique hors layout ───────────────────────────
        {
            path: '/auth',
            component: () => import('@/views/AuthView.vue'),
            meta: { public: true },
        },

        // ─── App principale avec layout sidebar ──────────────────
        {
            path: '/',
            component: AppLayout,
            children: [
                // Redirections des anciennes URLs
                { path: '',        redirect: '/series' },
                { path: 'downloads', redirect: '/activity' },

                // Dashboard
                {
                    path: 'dashboard',
                    name: 'dashboard',
                    component: () => import('@/views/DashboardView.vue'),
                },

                // Médiathèque
                {
                    path: 'series',
                    name: 'series',
                    component: () => import('@/views/SeriesView.vue'),
                },
                {
                    path: 'series/:id',
                    name: 'serie-detail',
                    component: () => import('@/views/SerieView.vue'),
                },

                // Activité (ex-downloads)
                {
                    path: 'activity',
                    name: 'activity',
                    component: () => import('@/views/DownloadsView.vue'),
                },

                // Paramètres — layout imbriqué avec sous-routes
                {
                    path: 'settings',
                    component: () => import('@/views/settings/SettingsLayout.vue'),
                    children: [
                        { path: '',                redirect: '/settings/download-client' },
                        {
                            path: 'download-client',
                            name: 'settings-download',
                            component: () => import('@/views/settings/DownloadClientView.vue'),
                        },
                        {
                            path: 'media-management',
                            name: 'settings-media',
                            component: () => import('@/views/settings/MediaManagementView.vue'),
                        },
                        {
                            path: 'catalogue',
                            name: 'settings-catalogue',
                            component: () => import('@/views/settings/CatalogueView.vue'),
                        },
                        {
                            path: 'logs',
                            name: 'settings-logs',
                            component: () => import('@/views/settings/LogsView.vue'), // ← nouveau chemin
                        },
                        {
                            path: 'advanced',
                            name: 'settings-advanced',
                            component: () => import('@/views/settings/AdvancedView.vue'),
                        },
                    ],
                },
            ],
        },
    ],

    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition
        // Retour depuis le détail vers la liste — ne pas scroller en haut
        if (to.name === 'series' && from.name === 'serie-detail') return false
        return { el: '#main-scroll', top: 0 }
    },
})

// ─── Guard auth (inchangé) ────────────────────────────────────
router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (auth.loading) {
        await auth.checkStatus()
    }

    if (!to.meta.public && !auth.loggedIn) {
        return '/auth'
    }

    if (to.path === '/auth' && auth.loggedIn) {
        return '/series'
    }
})

export default router