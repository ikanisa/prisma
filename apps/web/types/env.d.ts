declare module '*.yaml?raw' {
  const content: string
  export default content
}

interface ImportMeta {
  readonly env: Record<string, string | undefined>
}
