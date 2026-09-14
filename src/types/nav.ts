import type { Component } from 'vue'

export interface NavItem {
    label?     : string
    icon?      : Component
    to?        : string
    separator? : true
    badge?     : number
    badgeStyle?: 'count' | 'dot'
    tour?      : string
}
