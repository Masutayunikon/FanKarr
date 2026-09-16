export const AUTO_IMPORT_INTERVAL_MS = 5 * 60_000

export const autoImportSchedule = {
    lastRunAt: null as string | null,
    nextRunAt: null as string | null,
}

export function planNextAutoImport(delayMs = AUTO_IMPORT_INTERVAL_MS) {
    autoImportSchedule.nextRunAt = new Date(Date.now() + delayMs).toISOString()
}
