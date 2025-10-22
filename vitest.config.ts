/// <reference types="vitest" />
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

const toPosix = (value: string) => value.replace(/\\/g, '/')

const projectRoot = path.resolve(__dirname)
const srcRoot = path.resolve(projectRoot, './src')
const appsRoot = path.resolve(projectRoot, './apps')
const aliasPrefix = /^@\//
const pathExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']

type PathMatcher = {
  regex: RegExp
  wildcardCount: number
  replacements: string[]
  specificity: number
}

type ProjectResolver = {
  rootDir: string
  rootDirPosix: string
  fallbackRoot: string
  matchers: PathMatcher[]
  tsconfigPath?: string
}

const escapeForRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')

const createPathMatchers = (tsconfigPath: string): PathMatcher[] => {
  try {
    const raw = readFileSync(tsconfigPath, 'utf8')
    const config = JSON.parse(raw) as {
      compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> }
    }
    const compilerOptions = config.compilerOptions ?? {}
    const baseUrl = compilerOptions.baseUrl ?? '.'
    const absoluteBaseUrl = path.resolve(path.dirname(tsconfigPath), baseUrl)
    const paths = compilerOptions.paths ?? {}

    const matchers: PathMatcher[] = []

    for (const [pattern, replacements] of Object.entries(paths)) {
      if (!Array.isArray(replacements) || replacements.length === 0) continue

      const segments = pattern.split('*')
      const wildcardCount = segments.length - 1
      const regexSource = `^${segments.map((segment) => escapeForRegex(segment)).join('(.*)')}$`
      const regex = new RegExp(regexSource)
      const absoluteReplacements = replacements.map((replacement) =>
        path.resolve(absoluteBaseUrl, replacement)
      )

      matchers.push({
        regex,
        wildcardCount,
        replacements: absoluteReplacements,
        specificity: pattern.replaceAll('*', '').length,
      })
    }

    return matchers.sort((a, b) => b.specificity - a.specificity)
  } catch {
    return []
  }
}

const createProjectResolvers = (): ProjectResolver[] => {
  const resolvers: ProjectResolver[] = []

  const rootTsconfig = path.resolve(projectRoot, 'tsconfig.json')
  resolvers.push({
    rootDir: projectRoot,
    rootDirPosix: toPosix(projectRoot),
    fallbackRoot: srcRoot,
    matchers: existsSync(rootTsconfig) ? createPathMatchers(rootTsconfig) : [],
    tsconfigPath: existsSync(rootTsconfig) ? rootTsconfig : undefined,
  })

  if (existsSync(appsRoot)) {
    for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const appRoot = path.resolve(appsRoot, entry.name)
      const tsconfigPath = path.join(appRoot, 'tsconfig.json')
      if (!existsSync(tsconfigPath)) continue

      resolvers.push({
        rootDir: appRoot,
        rootDirPosix: toPosix(appRoot),
        fallbackRoot: appRoot,
        matchers: createPathMatchers(tsconfigPath),
        tsconfigPath,
      })
    }
  }

  return resolvers
}

const projectResolvers = createProjectResolvers()
const rootResolver = projectResolvers[0]

const tsconfigProjects = Array.from(
  new Set(
    [
      ...projectResolvers
        .map((resolver) => resolver.tsconfigPath)
        .filter((value): value is string => Boolean(value)),
      path.resolve(__dirname, './tsconfig.base.json'),
    ].filter((value) => existsSync(value))
  )
)

const findResolverForImporter = (importer?: string): ProjectResolver => {
  if (!importer) {
    return rootResolver
  }

  const absoluteImporter = toPosix(path.resolve(importer))
  let bestMatch = rootResolver

  for (const resolver of projectResolvers) {
    if (
      absoluteImporter === resolver.rootDirPosix ||
      absoluteImporter.startsWith(`${resolver.rootDirPosix}/`)
    ) {
      if (resolver.rootDirPosix.length > bestMatch.rootDirPosix.length) {
        bestMatch = resolver
      }
    }
  }

  return bestMatch
}

const resolveFromProject = (specifier: string, project: ProjectResolver) => {
  for (const matcher of project.matchers) {
    const match = matcher.regex.exec(specifier)
    if (!match) continue

    const wildcardValues = match.slice(1)

    for (const replacement of matcher.replacements) {
      let candidate = replacement

      for (let index = 0; index < matcher.wildcardCount; index += 1) {
        const value = wildcardValues[index] ?? ''
        candidate = candidate.replace('*', value)
      }

      const resolved = resolveWithExtensions(candidate)
      if (resolved) {
        return resolved
      }
    }
  }

  return null
}

const resolveWithExtensions = (absolutePath: string) => {
  if (existsSync(absolutePath)) {
    const stats = statSync(absolutePath)
    if (stats.isFile()) {
      return absolutePath
    }

    if (stats.isDirectory()) {
      for (const ext of pathExtensions) {
        const indexCandidate = path.join(absolutePath, `index${ext}`)
        if (existsSync(indexCandidate)) {
          return indexCandidate
        }
      }
    }
  }

  for (const ext of pathExtensions) {
    const fileCandidate = `${absolutePath}${ext}`
    if (existsSync(fileCandidate)) {
      const stats = statSync(fileCandidate)
      if (stats.isFile()) {
        return fileCandidate
      }
    }
  }

  return null
}

const resolveAppSpecifier = (rawSpecifier: string, importer?: string) => {
  const specifier = aliasPrefix.test(rawSpecifier)
    ? rawSpecifier
    : `@/${rawSpecifier.replace(/^\/+/, '')}`

  if (!aliasPrefix.test(specifier)) {
    return null
  }

  const importerResolver = findResolverForImporter(importer)
  const searchResolvers = [
    importerResolver,
    ...projectResolvers.filter((resolver) => resolver !== importerResolver),
  ]

  for (const resolver of searchResolvers) {
    const resolved = resolveFromProject(specifier, resolver)
    if (resolved) {
      return resolved
    }
  }

  const relativePath = specifier.replace(aliasPrefix, '')

  for (const resolver of searchResolvers) {
    const fallbackCandidate = resolveWithExtensions(
      path.resolve(resolver.fallbackRoot, relativePath)
    )
    if (fallbackCandidate) {
      return fallbackCandidate
    }
  }

  return path.resolve(searchResolvers[0].fallbackRoot, relativePath)
}

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      projects: tsconfigProjects,
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'lib/**/*.{test,spec}.{js,ts}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: ['tests/playwright/**', 'node_modules/**', 'node_modules/.pnpm/**'],
    testTimeout: 120000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'apps/web/app/api/group/**',
        'apps/web/app/lib/**',
        'apps/web/lib/audit/**',
        'tests/**',
      ],
      thresholds: {
        statements: Number(process.env.VITEST_COVERAGE_STATEMENTS ?? '45'),
        branches: Number(process.env.VITEST_COVERAGE_BRANCHES ?? '40'),
        functions: Number(process.env.VITEST_COVERAGE_FUNCTIONS ?? '45'),
        lines: Number(process.env.VITEST_COVERAGE_LINES ?? '45'),
      },
    },
  },
  resolve: {
    alias: [
      {
        find: aliasPrefix,
        replacement: '',
        customResolver(source, importer) {
          const resolved = resolveAppSpecifier(source, importer)
          return resolved ? { id: resolved } : null
        },
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
      {
        find: 'next/server',
        replacement: path.resolve(__dirname, './tests/stubs/next-server.ts'),
      },
      {
        find: 'server-only',
        replacement: path.resolve(__dirname, './tests/stubs/server-only.ts'),
      },
      {
        find: 'google-auth-library',
        replacement: path.resolve(__dirname, './tests/stubs/google-auth-library.ts'),
      },
      {
        find: '@prisma-glow/api-client',
        replacement: path.resolve(__dirname, './packages/api-client/index.ts'),
      },
      {
        find: '@prisma-glow/system-config',
        replacement: path.resolve(__dirname, './packages/system-config/index.js'),
      },
    ],
  },
})
