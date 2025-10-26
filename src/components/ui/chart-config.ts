import type { ComponentType, CSSProperties, ReactNode } from "react"

const THEMES = { light: "", dark: ".dark" } as const

export type ThemeName = keyof typeof THEMES

type CSSVarStyles = CSSProperties & Record<string, string>

type ChartVariableMap = {
  base: CSSVarStyles
  themes: Record<ThemeName, CSSVarStyles>
  hasVariables: boolean
}

const THEME_NAMES = Object.keys(THEMES) as ThemeName[]

export type ChartConfig = {
  [k in string]: {
    label?: ReactNode
    icon?: ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && value in THEMES
}

export function generateChartVariables(config: ChartConfig): ChartVariableMap {
  const base: CSSVarStyles = {} as CSSVarStyles
  const themes = THEME_NAMES.reduce(
    (acc, theme) => {
      acc[theme] = {} as CSSVarStyles
      return acc
    },
    {} as Record<ThemeName, CSSVarStyles>
  )

  let hasVariables = false

  for (const [key, itemConfig] of Object.entries(config)) {
    const variable = `--color-${key}`

    if ("theme" in itemConfig && itemConfig.theme) {
      let fallbackAssigned = false

      for (const themeName of THEME_NAMES) {
        const value = itemConfig.theme?.[themeName]

        if (!value) continue

        themes[themeName][variable] = value
        if (!fallbackAssigned) {
          base[variable] = value
          fallbackAssigned = true
        }
        hasVariables = true
      }
    } else if (itemConfig.color) {
      base[variable] = itemConfig.color
      hasVariables = true
    }
  }

  return { base, themes, hasVariables }
}
