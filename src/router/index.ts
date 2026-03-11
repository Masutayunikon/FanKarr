import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/auth',
            component: () => import('@/views/AuthView.vue'),
            meta: { public: true }
        },
        {
            path: '/',
            name: 'catalog',
            component: () => import('@/views/CatalogView.vue')
        },
        {
            path: '/series/:id',
            component: () => import('@/views/SerieView.vue')
        },
        {
            path: '/downloads',
            component: () => import('@/views/DownloadsView.vue')
        },
        {
            path: '/settings',
            component: () => import('@/views/SettingsView.vue')
        },
        {
            path: '/logs',
            component: () => import('@/views/LogsView.vue')
        }
    ],
    scrollBehavior(to, _from, savedPosition) {
        if (savedPosition) return savedPosition
        return { top: 0 }
    }
})

router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (auth.loading) {
        await auth.checkStatus()
    }

    if (!to.meta.public && !auth.loggedIn) {
        return '/auth'
    }

    if (to.path === '/auth' && auth.loggedIn) {
        return '/'
    }
})

export default router