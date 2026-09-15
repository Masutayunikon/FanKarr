import { readSettings, writeSettings } from './settings.js'
import { markAllToursSeen } from './users.js'
import { listClients } from './torrent-clients/index.js'
import { logger } from './logger.js'

export const ONBOARDING_STEPS = ['welcome', 'paths', 'client', 'import', 'media-server', 'catalog', 'recap'] as const
export type OnboardingStep = typeof ONBOARDING_STEPS[number]

export interface OnboardingState {
    step       : OnboardingStep | null
    completedAt: string | null
}

export function isOnboardingStep(value: unknown): value is OnboardingStep {
    return typeof value === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(value)
}

export function readOnboarding(): OnboardingState {
    const { onboardingStep, onboardingCompletedAt } = readSettings()
    return { step: isOnboardingStep(onboardingStep) ? onboardingStep : null, completedAt: onboardingCompletedAt }
}

// Installation configurée avant l'assistant : on ne l'impose pas
export function migrateOnboarding(): boolean {
    const settings = readSettings()
    if (settings.onboardingCompletedAt || settings.onboardingStep) return false
    if (!settings.mediaPath && listClients().length === 0) return false

    const now = new Date().toISOString()
    writeSettings({ onboardingCompletedAt: now })
    markAllToursSeen(now)
    logger.info('onboarding', 'Installation existante détectée : assistant marqué comme terminé')
    return true
}

export function startOnboarding(): void {
    if (readSettings().onboardingCompletedAt) return
    writeSettings({ onboardingStep: 'welcome' })
}

export function advanceOnboarding(step?: OnboardingStep, complete = false): OnboardingState {
    const current = readOnboarding()
    const patch: { onboardingStep?: string; onboardingCompletedAt?: string } = {}

    if (step && (!current.step || ONBOARDING_STEPS.indexOf(step) > ONBOARDING_STEPS.indexOf(current.step))) {
        patch.onboardingStep = step
    }
    if (complete) {
        patch.onboardingStep        = 'recap'
        patch.onboardingCompletedAt = new Date().toISOString()
        logger.info('onboarding', 'Assistant de configuration terminé')
    }
    if (Object.keys(patch).length > 0) writeSettings(patch)
    return readOnboarding()
}
