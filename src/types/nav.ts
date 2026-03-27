export interface NavChild {
    label: string
    to: string
}

export interface NavItem {
    label?    : string
    icon?     : string
    to?       : string
    children? : NavChild[]
    separator?: true
    badge?    : string | number  // ← badge optionnel
}