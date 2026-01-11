// ../../vitest.config.ts
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { defineConfig } from "file:///Volumes/PRO-G40/Projects/repos/prisma/node_modules/.pnpm/vitest@2.1.9_@edge-runtime+vm@3.2.0_@types+node@22.19.0_jsdom@24.1.3_terser@5.44.1/node_modules/vitest/dist/config.js";
import react from "file:///Volumes/PRO-G40/Projects/repos/prisma/node_modules/.pnpm/@vitejs+plugin-react-swc@4.2.2_vite@5.4.21_@types+node@22.19.0_terser@5.44.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import tsconfigPaths from "file:///Volumes/PRO-G40/Projects/repos/prisma/node_modules/.pnpm/vite-tsconfig-paths@6.0.4_typescript@5.9.3_vite@5.4.21_@types+node@22.19.0_terser@5.44.1_/node_modules/vite-tsconfig-paths/dist/index.js";
var __vite_injected_original_dirname = "/Volumes/PRO-G40/Projects/repos/prisma";
var toPosix = (value) => value.replace(/\\/g, "/");
var projectRoot = path.resolve(__vite_injected_original_dirname);
var srcRoot = path.resolve(projectRoot, "./src");
var appsRoot = path.resolve(projectRoot, "./apps");
var aliasPrefix = /^@\//;
var pathExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
var escapeForRegex = (value) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
var createPathMatchers = (tsconfigPath) => {
  try {
    const raw = readFileSync(tsconfigPath, "utf8");
    const config = JSON.parse(raw);
    const compilerOptions = config.compilerOptions ?? {};
    const baseUrl = compilerOptions.baseUrl ?? ".";
    const absoluteBaseUrl = path.resolve(path.dirname(tsconfigPath), baseUrl);
    const paths = compilerOptions.paths ?? {};
    const matchers = [];
    for (const [pattern, replacements] of Object.entries(paths)) {
      if (!Array.isArray(replacements) || replacements.length === 0) continue;
      const segments = pattern.split("*");
      const wildcardCount = segments.length - 1;
      const regexSource = `^${segments.map((segment) => escapeForRegex(segment)).join("(.*)")}$`;
      const regex = new RegExp(regexSource);
      const absoluteReplacements = replacements.map(
        (replacement) => path.resolve(absoluteBaseUrl, replacement)
      );
      matchers.push({
        regex,
        wildcardCount,
        replacements: absoluteReplacements,
        specificity: pattern.replaceAll("*", "").length
      });
    }
    return matchers.sort((a, b) => b.specificity - a.specificity);
  } catch {
    return [];
  }
};
var createProjectResolvers = () => {
  const resolvers = [];
  const rootTsconfig = path.resolve(projectRoot, "tsconfig.json");
  resolvers.push({
    rootDir: projectRoot,
    rootDirPosix: toPosix(projectRoot),
    fallbackRoot: srcRoot,
    matchers: existsSync(rootTsconfig) ? createPathMatchers(rootTsconfig) : [],
    tsconfigPath: existsSync(rootTsconfig) ? rootTsconfig : void 0
  });
  if (existsSync(appsRoot)) {
    for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const appRoot = path.resolve(appsRoot, entry.name);
      const tsconfigPath = path.join(appRoot, "tsconfig.json");
      if (!existsSync(tsconfigPath)) continue;
      resolvers.push({
        rootDir: appRoot,
        rootDirPosix: toPosix(appRoot),
        fallbackRoot: appRoot,
        matchers: createPathMatchers(tsconfigPath),
        tsconfigPath
      });
    }
  }
  return resolvers;
};
var projectResolvers = createProjectResolvers();
var rootResolver = projectResolvers[0];
var tsconfigProjects = Array.from(
  new Set(
    [
      ...projectResolvers.map((resolver) => resolver.tsconfigPath).filter((value) => Boolean(value)),
      path.resolve(__vite_injected_original_dirname, "./tsconfig.base.json")
    ].filter((value) => existsSync(value))
  )
);
var findResolverForImporter = (importer) => {
  if (!importer) {
    return rootResolver;
  }
  const absoluteImporter = toPosix(path.resolve(importer));
  let bestMatch = rootResolver;
  for (const resolver of projectResolvers) {
    if (absoluteImporter === resolver.rootDirPosix || absoluteImporter.startsWith(`${resolver.rootDirPosix}/`)) {
      if (resolver.rootDirPosix.length > bestMatch.rootDirPosix.length) {
        bestMatch = resolver;
      }
    }
  }
  return bestMatch;
};
var resolveFromProject = (specifier, project) => {
  for (const matcher of project.matchers) {
    const match = matcher.regex.exec(specifier);
    if (!match) continue;
    const wildcardValues = match.slice(1);
    for (const replacement of matcher.replacements) {
      let candidate = replacement;
      for (let index = 0; index < matcher.wildcardCount; index += 1) {
        const value = wildcardValues[index] ?? "";
        candidate = candidate.replace("*", value);
      }
      const resolved = resolveWithExtensions(candidate);
      if (resolved) {
        return resolved;
      }
    }
  }
  return null;
};
var resolveWithExtensions = (absolutePath) => {
  if (existsSync(absolutePath)) {
    const stats = statSync(absolutePath);
    if (stats.isFile()) {
      return absolutePath;
    }
    if (stats.isDirectory()) {
      for (const ext of pathExtensions) {
        const indexCandidate = path.join(absolutePath, `index${ext}`);
        if (existsSync(indexCandidate)) {
          return indexCandidate;
        }
      }
    }
  }
  for (const ext of pathExtensions) {
    const fileCandidate = `${absolutePath}${ext}`;
    if (existsSync(fileCandidate)) {
      const stats = statSync(fileCandidate);
      if (stats.isFile()) {
        return fileCandidate;
      }
    }
  }
  return null;
};
var resolveAppSpecifier = (rawSpecifier, importer) => {
  const specifier = aliasPrefix.test(rawSpecifier) ? rawSpecifier : `@/${rawSpecifier.replace(/^\/+/, "")}`;
  if (!aliasPrefix.test(specifier)) {
    return null;
  }
  const importerResolver = findResolverForImporter(importer);
  const searchResolvers = [
    importerResolver,
    ...projectResolvers.filter((resolver) => resolver !== importerResolver)
  ];
  for (const resolver of searchResolvers) {
    const resolved = resolveFromProject(specifier, resolver);
    if (resolved) {
      return resolved;
    }
  }
  const relativePath = specifier.replace(aliasPrefix, "");
  for (const resolver of searchResolvers) {
    const fallbackCandidate = resolveWithExtensions(
      path.resolve(resolver.fallbackRoot, relativePath)
    );
    if (fallbackCandidate) {
      return fallbackCandidate;
    }
  }
  return path.resolve(searchResolvers[0].fallbackRoot, relativePath);
};
var vitest_config_default = defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      projects: tsconfigProjects
    })
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    include: [
      "apps/web/lib/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "apps/web/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "packages/*/src/**/*.{test,spec}.{js,ts}"
    ],
    exclude: [
      "node_modules/**",
      "node_modules/.pnpm/**",
      "apps/**/node_modules/**",
      "packages/**/node_modules/**"
    ],
    testTimeout: 12e4,
    hookTimeout: 6e4,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "apps/web/lib/**",
        "packages/*/src/**"
      ],
      thresholds: {
        statements: Number(process.env.VITEST_COVERAGE_STATEMENTS ?? "60"),
        branches: Number(process.env.VITEST_COVERAGE_BRANCHES ?? "55"),
        functions: Number(process.env.VITEST_COVERAGE_FUNCTIONS ?? "60"),
        lines: Number(process.env.VITEST_COVERAGE_LINES ?? "60")
      }
    }
  },
  resolve: {
    alias: [
      {
        find: aliasPrefix,
        replacement: "",
        customResolver(source, importer) {
          const resolved = resolveAppSpecifier(source, importer);
          return resolved ? { id: resolved } : null;
        }
      },
      {
        find: /^@\/components\/ui\//,
        replacement: path.resolve(__vite_injected_original_dirname, "./src/components/ui/") + "/"
      },
      {
        find: /^@\/hooks\//,
        replacement: path.resolve(__vite_injected_original_dirname, "./src/hooks/") + "/"
      },
      {
        find: /^@\/integrations\//,
        replacement: path.resolve(__vite_injected_original_dirname, "./src/integrations/") + "/"
      },
      {
        find: /^@\/lib\/security\/password$/,
        replacement: path.resolve(__vite_injected_original_dirname, "./src/lib/security/password.ts")
      },
      {
        find: "@",
        replacement: path.resolve(__vite_injected_original_dirname, "./src")
      },
      {
        find: "next/server",
        replacement: path.resolve(__vite_injected_original_dirname, "./tests/stubs/next-server.ts")
      },
      {
        find: "server-only",
        replacement: path.resolve(__vite_injected_original_dirname, "./tests/stubs/server-only.ts")
      },
      {
        find: "google-auth-library",
        replacement: path.resolve(__vite_injected_original_dirname, "./tests/stubs/google-auth-library.ts")
      },
      {
        find: "@prisma/api-client",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/api-client/index.ts")
      },
      {
        find: /^@prisma-glow\/lib\/(.*)/,
        replacement: "",
        customResolver(source) {
          const match = /^@prisma-glow\/lib\/(.*)/.exec(source);
          if (!match) return null;
          const relativePath = match[1];
          const withExtension = path.resolve(__vite_injected_original_dirname, "./packages/lib/dist", `${relativePath}.js`);
          if (existsSync(withExtension)) {
            return { id: withExtension };
          }
          const fallbackPath = path.resolve(__vite_injected_original_dirname, "./packages/lib/dist", relativePath);
          return { id: fallbackPath };
        }
      },
      {
        find: "@prisma/lib",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/lib/dist/index.js")
      },
      {
        find: "@prisma/logger",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/logger/src/index.ts")
      },
      {
        find: "@prisma/logging",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/logging/src/index.ts")
      },
      {
        find: "@prisma/otel",
        replacement: path.resolve(__vite_injected_original_dirname, "./services/otel/src/index.ts")
      },
      {
        find: "@prisma/system-config",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/system-config/src/index.ts")
      },
      {
        find: "@prisma/agents",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/agents/src")
      },
      {
        find: "@prisma/api/schemas",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/api/src/schemas/index.ts")
      },
      {
        find: "@prisma/api",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/api/src/index.ts")
      },
      {
        find: "@prisma/config/env/security",
        replacement: path.resolve(__vite_injected_original_dirname, "./config/env/security.ts")
      },
      {
        find: "@prisma/tax",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/tax/src/index.ts")
      },
      {
        find: "@prisma/audit-agents",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/audit/src/index.ts")
      },
      {
        find: "@prisma/core",
        replacement: path.resolve(__vite_injected_original_dirname, "./packages/core/src/index.ts")
      }
    ]
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vdml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Wb2x1bWVzL1BSTy1HNDAvUHJvamVjdHMvcmVwb3MvcHJpc21hXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVm9sdW1lcy9QUk8tRzQwL1Byb2plY3RzL3JlcG9zL3ByaXNtYS92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Wb2x1bWVzL1BSTy1HNDAvUHJvamVjdHMvcmVwb3MvcHJpc21hL3ZpdGVzdC5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMsIHJlYWRkaXJTeW5jLCBzdGF0U3luYyB9IGZyb20gJ2ZzJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJ1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSAndml0ZS10c2NvbmZpZy1wYXRocydcblxuY29uc3QgdG9Qb3NpeCA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5yZXBsYWNlKC9cXFxcL2csICcvJylcblxuY29uc3QgcHJvamVjdFJvb3QgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lKVxuY29uc3Qgc3JjUm9vdCA9IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgJy4vc3JjJylcbmNvbnN0IGFwcHNSb290ID0gcGF0aC5yZXNvbHZlKHByb2plY3RSb290LCAnLi9hcHBzJylcbmNvbnN0IGFsaWFzUHJlZml4ID0gL15AXFwvL1xuY29uc3QgcGF0aEV4dGVuc2lvbnMgPSBbJy50cycsICcudHN4JywgJy5qcycsICcuanN4JywgJy5tanMnLCAnLmNqcycsICcuanNvbiddXG5cbnR5cGUgUGF0aE1hdGNoZXIgPSB7XG4gIHJlZ2V4OiBSZWdFeHBcbiAgd2lsZGNhcmRDb3VudDogbnVtYmVyXG4gIHJlcGxhY2VtZW50czogc3RyaW5nW11cbiAgc3BlY2lmaWNpdHk6IG51bWJlclxufVxuXG50eXBlIFByb2plY3RSZXNvbHZlciA9IHtcbiAgcm9vdERpcjogc3RyaW5nXG4gIHJvb3REaXJQb3NpeDogc3RyaW5nXG4gIGZhbGxiYWNrUm9vdDogc3RyaW5nXG4gIG1hdGNoZXJzOiBQYXRoTWF0Y2hlcltdXG4gIHRzY29uZmlnUGF0aD86IHN0cmluZ1xufVxuXG5jb25zdCBlc2NhcGVGb3JSZWdleCA9ICh2YWx1ZTogc3RyaW5nKSA9PiB2YWx1ZS5yZXBsYWNlKC9bLS9cXFxcXiQqKz8uKCl8W1xcXXt9XS9nLCAnXFxcXCQmJylcblxuY29uc3QgY3JlYXRlUGF0aE1hdGNoZXJzID0gKHRzY29uZmlnUGF0aDogc3RyaW5nKTogUGF0aE1hdGNoZXJbXSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKHRzY29uZmlnUGF0aCwgJ3V0ZjgnKVxuICAgIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UocmF3KSBhcyB7XG4gICAgICBjb21waWxlck9wdGlvbnM/OiB7IGJhc2VVcmw/OiBzdHJpbmc7IHBhdGhzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+IH1cbiAgICB9XG4gICAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gY29uZmlnLmNvbXBpbGVyT3B0aW9ucyA/PyB7fVxuICAgIGNvbnN0IGJhc2VVcmwgPSBjb21waWxlck9wdGlvbnMuYmFzZVVybCA/PyAnLidcbiAgICBjb25zdCBhYnNvbHV0ZUJhc2VVcmwgPSBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKHRzY29uZmlnUGF0aCksIGJhc2VVcmwpXG4gICAgY29uc3QgcGF0aHMgPSBjb21waWxlck9wdGlvbnMucGF0aHMgPz8ge31cblxuICAgIGNvbnN0IG1hdGNoZXJzOiBQYXRoTWF0Y2hlcltdID0gW11cblxuICAgIGZvciAoY29uc3QgW3BhdHRlcm4sIHJlcGxhY2VtZW50c10gb2YgT2JqZWN0LmVudHJpZXMocGF0aHMpKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVwbGFjZW1lbnRzKSB8fCByZXBsYWNlbWVudHMubGVuZ3RoID09PSAwKSBjb250aW51ZVxuXG4gICAgICBjb25zdCBzZWdtZW50cyA9IHBhdHRlcm4uc3BsaXQoJyonKVxuICAgICAgY29uc3Qgd2lsZGNhcmRDb3VudCA9IHNlZ21lbnRzLmxlbmd0aCAtIDFcbiAgICAgIGNvbnN0IHJlZ2V4U291cmNlID0gYF4ke3NlZ21lbnRzLm1hcCgoc2VnbWVudCkgPT4gZXNjYXBlRm9yUmVnZXgoc2VnbWVudCkpLmpvaW4oJyguKiknKX0kYFxuICAgICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKHJlZ2V4U291cmNlKVxuICAgICAgY29uc3QgYWJzb2x1dGVSZXBsYWNlbWVudHMgPSByZXBsYWNlbWVudHMubWFwKChyZXBsYWNlbWVudCkgPT5cbiAgICAgICAgcGF0aC5yZXNvbHZlKGFic29sdXRlQmFzZVVybCwgcmVwbGFjZW1lbnQpXG4gICAgICApXG5cbiAgICAgIG1hdGNoZXJzLnB1c2goe1xuICAgICAgICByZWdleCxcbiAgICAgICAgd2lsZGNhcmRDb3VudCxcbiAgICAgICAgcmVwbGFjZW1lbnRzOiBhYnNvbHV0ZVJlcGxhY2VtZW50cyxcbiAgICAgICAgc3BlY2lmaWNpdHk6IHBhdHRlcm4ucmVwbGFjZUFsbCgnKicsICcnKS5sZW5ndGgsXG4gICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBtYXRjaGVycy5zb3J0KChhLCBiKSA9PiBiLnNwZWNpZmljaXR5IC0gYS5zcGVjaWZpY2l0eSlcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cblxuY29uc3QgY3JlYXRlUHJvamVjdFJlc29sdmVycyA9ICgpOiBQcm9qZWN0UmVzb2x2ZXJbXSA9PiB7XG4gIGNvbnN0IHJlc29sdmVyczogUHJvamVjdFJlc29sdmVyW10gPSBbXVxuXG4gIGNvbnN0IHJvb3RUc2NvbmZpZyA9IHBhdGgucmVzb2x2ZShwcm9qZWN0Um9vdCwgJ3RzY29uZmlnLmpzb24nKVxuICByZXNvbHZlcnMucHVzaCh7XG4gICAgcm9vdERpcjogcHJvamVjdFJvb3QsXG4gICAgcm9vdERpclBvc2l4OiB0b1Bvc2l4KHByb2plY3RSb290KSxcbiAgICBmYWxsYmFja1Jvb3Q6IHNyY1Jvb3QsXG4gICAgbWF0Y2hlcnM6IGV4aXN0c1N5bmMocm9vdFRzY29uZmlnKSA/IGNyZWF0ZVBhdGhNYXRjaGVycyhyb290VHNjb25maWcpIDogW10sXG4gICAgdHNjb25maWdQYXRoOiBleGlzdHNTeW5jKHJvb3RUc2NvbmZpZykgPyByb290VHNjb25maWcgOiB1bmRlZmluZWQsXG4gIH0pXG5cbiAgaWYgKGV4aXN0c1N5bmMoYXBwc1Jvb3QpKSB7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiByZWFkZGlyU3luYyhhcHBzUm9vdCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pKSB7XG4gICAgICBpZiAoIWVudHJ5LmlzRGlyZWN0b3J5KCkpIGNvbnRpbnVlXG4gICAgICBjb25zdCBhcHBSb290ID0gcGF0aC5yZXNvbHZlKGFwcHNSb290LCBlbnRyeS5uYW1lKVxuICAgICAgY29uc3QgdHNjb25maWdQYXRoID0gcGF0aC5qb2luKGFwcFJvb3QsICd0c2NvbmZpZy5qc29uJylcbiAgICAgIGlmICghZXhpc3RzU3luYyh0c2NvbmZpZ1BhdGgpKSBjb250aW51ZVxuXG4gICAgICByZXNvbHZlcnMucHVzaCh7XG4gICAgICAgIHJvb3REaXI6IGFwcFJvb3QsXG4gICAgICAgIHJvb3REaXJQb3NpeDogdG9Qb3NpeChhcHBSb290KSxcbiAgICAgICAgZmFsbGJhY2tSb290OiBhcHBSb290LFxuICAgICAgICBtYXRjaGVyczogY3JlYXRlUGF0aE1hdGNoZXJzKHRzY29uZmlnUGF0aCksXG4gICAgICAgIHRzY29uZmlnUGF0aCxcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc29sdmVyc1xufVxuXG5jb25zdCBwcm9qZWN0UmVzb2x2ZXJzID0gY3JlYXRlUHJvamVjdFJlc29sdmVycygpXG5jb25zdCByb290UmVzb2x2ZXIgPSBwcm9qZWN0UmVzb2x2ZXJzWzBdXG5cbmNvbnN0IHRzY29uZmlnUHJvamVjdHMgPSBBcnJheS5mcm9tKFxuICBuZXcgU2V0KFxuICAgIFtcbiAgICAgIC4uLnByb2plY3RSZXNvbHZlcnNcbiAgICAgICAgLm1hcCgocmVzb2x2ZXIpID0+IHJlc29sdmVyLnRzY29uZmlnUGF0aClcbiAgICAgICAgLmZpbHRlcigodmFsdWUpOiB2YWx1ZSBpcyBzdHJpbmcgPT4gQm9vbGVhbih2YWx1ZSkpLFxuICAgICAgcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vdHNjb25maWcuYmFzZS5qc29uJyksXG4gICAgXS5maWx0ZXIoKHZhbHVlKSA9PiBleGlzdHNTeW5jKHZhbHVlKSlcbiAgKVxuKVxuXG5jb25zdCBmaW5kUmVzb2x2ZXJGb3JJbXBvcnRlciA9IChpbXBvcnRlcj86IHN0cmluZyk6IFByb2plY3RSZXNvbHZlciA9PiB7XG4gIGlmICghaW1wb3J0ZXIpIHtcbiAgICByZXR1cm4gcm9vdFJlc29sdmVyXG4gIH1cblxuICBjb25zdCBhYnNvbHV0ZUltcG9ydGVyID0gdG9Qb3NpeChwYXRoLnJlc29sdmUoaW1wb3J0ZXIpKVxuICBsZXQgYmVzdE1hdGNoID0gcm9vdFJlc29sdmVyXG5cbiAgZm9yIChjb25zdCByZXNvbHZlciBvZiBwcm9qZWN0UmVzb2x2ZXJzKSB7XG4gICAgaWYgKFxuICAgICAgYWJzb2x1dGVJbXBvcnRlciA9PT0gcmVzb2x2ZXIucm9vdERpclBvc2l4IHx8XG4gICAgICBhYnNvbHV0ZUltcG9ydGVyLnN0YXJ0c1dpdGgoYCR7cmVzb2x2ZXIucm9vdERpclBvc2l4fS9gKVxuICAgICkge1xuICAgICAgaWYgKHJlc29sdmVyLnJvb3REaXJQb3NpeC5sZW5ndGggPiBiZXN0TWF0Y2gucm9vdERpclBvc2l4Lmxlbmd0aCkge1xuICAgICAgICBiZXN0TWF0Y2ggPSByZXNvbHZlclxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBiZXN0TWF0Y2hcbn1cblxuY29uc3QgcmVzb2x2ZUZyb21Qcm9qZWN0ID0gKHNwZWNpZmllcjogc3RyaW5nLCBwcm9qZWN0OiBQcm9qZWN0UmVzb2x2ZXIpID0+IHtcbiAgZm9yIChjb25zdCBtYXRjaGVyIG9mIHByb2plY3QubWF0Y2hlcnMpIHtcbiAgICBjb25zdCBtYXRjaCA9IG1hdGNoZXIucmVnZXguZXhlYyhzcGVjaWZpZXIpXG4gICAgaWYgKCFtYXRjaCkgY29udGludWVcblxuICAgIGNvbnN0IHdpbGRjYXJkVmFsdWVzID0gbWF0Y2guc2xpY2UoMSlcblxuICAgIGZvciAoY29uc3QgcmVwbGFjZW1lbnQgb2YgbWF0Y2hlci5yZXBsYWNlbWVudHMpIHtcbiAgICAgIGxldCBjYW5kaWRhdGUgPSByZXBsYWNlbWVudFxuXG4gICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbWF0Y2hlci53aWxkY2FyZENvdW50OyBpbmRleCArPSAxKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gd2lsZGNhcmRWYWx1ZXNbaW5kZXhdID8/ICcnXG4gICAgICAgIGNhbmRpZGF0ZSA9IGNhbmRpZGF0ZS5yZXBsYWNlKCcqJywgdmFsdWUpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZVdpdGhFeHRlbnNpb25zKGNhbmRpZGF0ZSlcbiAgICAgIGlmIChyZXNvbHZlZCkge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZWRcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbFxufVxuXG5jb25zdCByZXNvbHZlV2l0aEV4dGVuc2lvbnMgPSAoYWJzb2x1dGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgaWYgKGV4aXN0c1N5bmMoYWJzb2x1dGVQYXRoKSkge1xuICAgIGNvbnN0IHN0YXRzID0gc3RhdFN5bmMoYWJzb2x1dGVQYXRoKVxuICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgcmV0dXJuIGFic29sdXRlUGF0aFxuICAgIH1cblxuICAgIGlmIChzdGF0cy5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGV4dCBvZiBwYXRoRXh0ZW5zaW9ucykge1xuICAgICAgICBjb25zdCBpbmRleENhbmRpZGF0ZSA9IHBhdGguam9pbihhYnNvbHV0ZVBhdGgsIGBpbmRleCR7ZXh0fWApXG4gICAgICAgIGlmIChleGlzdHNTeW5jKGluZGV4Q2FuZGlkYXRlKSkge1xuICAgICAgICAgIHJldHVybiBpbmRleENhbmRpZGF0ZVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBleHQgb2YgcGF0aEV4dGVuc2lvbnMpIHtcbiAgICBjb25zdCBmaWxlQ2FuZGlkYXRlID0gYCR7YWJzb2x1dGVQYXRofSR7ZXh0fWBcbiAgICBpZiAoZXhpc3RzU3luYyhmaWxlQ2FuZGlkYXRlKSkge1xuICAgICAgY29uc3Qgc3RhdHMgPSBzdGF0U3luYyhmaWxlQ2FuZGlkYXRlKVxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIHJldHVybiBmaWxlQ2FuZGlkYXRlXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cblxuY29uc3QgcmVzb2x2ZUFwcFNwZWNpZmllciA9IChyYXdTcGVjaWZpZXI6IHN0cmluZywgaW1wb3J0ZXI/OiBzdHJpbmcpID0+IHtcbiAgY29uc3Qgc3BlY2lmaWVyID0gYWxpYXNQcmVmaXgudGVzdChyYXdTcGVjaWZpZXIpXG4gICAgPyByYXdTcGVjaWZpZXJcbiAgICA6IGBALyR7cmF3U3BlY2lmaWVyLnJlcGxhY2UoL15cXC8rLywgJycpfWBcblxuICBpZiAoIWFsaWFzUHJlZml4LnRlc3Qoc3BlY2lmaWVyKSkge1xuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBjb25zdCBpbXBvcnRlclJlc29sdmVyID0gZmluZFJlc29sdmVyRm9ySW1wb3J0ZXIoaW1wb3J0ZXIpXG4gIGNvbnN0IHNlYXJjaFJlc29sdmVycyA9IFtcbiAgICBpbXBvcnRlclJlc29sdmVyLFxuICAgIC4uLnByb2plY3RSZXNvbHZlcnMuZmlsdGVyKChyZXNvbHZlcikgPT4gcmVzb2x2ZXIgIT09IGltcG9ydGVyUmVzb2x2ZXIpLFxuICBdXG5cbiAgZm9yIChjb25zdCByZXNvbHZlciBvZiBzZWFyY2hSZXNvbHZlcnMpIHtcbiAgICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmVGcm9tUHJvamVjdChzcGVjaWZpZXIsIHJlc29sdmVyKVxuICAgIGlmIChyZXNvbHZlZCkge1xuICAgICAgcmV0dXJuIHJlc29sdmVkXG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gc3BlY2lmaWVyLnJlcGxhY2UoYWxpYXNQcmVmaXgsICcnKVxuXG4gIGZvciAoY29uc3QgcmVzb2x2ZXIgb2Ygc2VhcmNoUmVzb2x2ZXJzKSB7XG4gICAgY29uc3QgZmFsbGJhY2tDYW5kaWRhdGUgPSByZXNvbHZlV2l0aEV4dGVuc2lvbnMoXG4gICAgICBwYXRoLnJlc29sdmUocmVzb2x2ZXIuZmFsbGJhY2tSb290LCByZWxhdGl2ZVBhdGgpXG4gICAgKVxuICAgIGlmIChmYWxsYmFja0NhbmRpZGF0ZSkge1xuICAgICAgcmV0dXJuIGZhbGxiYWNrQ2FuZGlkYXRlXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShzZWFyY2hSZXNvbHZlcnNbMF0uZmFsbGJhY2tSb290LCByZWxhdGl2ZVBhdGgpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHRzY29uZmlnUGF0aHMoe1xuICAgICAgcHJvamVjdHM6IHRzY29uZmlnUHJvamVjdHMsXG4gICAgfSksXG4gIF0sXG4gIHRlc3Q6IHtcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIHNldHVwRmlsZXM6IFsnLi92aXRlc3Quc2V0dXAudHMnXSxcbiAgICBjc3M6IHRydWUsXG4gICAgaW5jbHVkZTogW1xuICAgICAgJ2FwcHMvd2ViL2xpYi8qKi8qLnt0ZXN0LHNwZWN9Lntqcyx0cyxqc3gsdHN4fScsXG4gICAgICAnYXBwcy93ZWIvKiovKi57dGVzdCxzcGVjfS57anMsdHMsanN4LHRzeH0nLFxuICAgICAgJ3BhY2thZ2VzLyovc3JjLyoqLyoue3Rlc3Qsc3BlY30ue2pzLHRzfScsXG4gICAgXSxcbiAgICBleGNsdWRlOiBbXG4gICAgICAnbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICdub2RlX21vZHVsZXMvLnBucG0vKionLFxuICAgICAgJ2FwcHMvKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICdwYWNrYWdlcy8qKi9ub2RlX21vZHVsZXMvKionLFxuICAgIF0sXG4gICAgdGVzdFRpbWVvdXQ6IDEyMDAwMCxcbiAgICBob29rVGltZW91dDogNjAwMDAsXG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxuICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdsY292J10sXG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICdhcHBzL3dlYi9saWIvKionLFxuICAgICAgICAncGFja2FnZXMvKi9zcmMvKionLFxuICAgICAgXSxcbiAgICAgIHRocmVzaG9sZHM6IHtcbiAgICAgICAgc3RhdGVtZW50czogTnVtYmVyKHByb2Nlc3MuZW52LlZJVEVTVF9DT1ZFUkFHRV9TVEFURU1FTlRTID8/ICc2MCcpLFxuICAgICAgICBicmFuY2hlczogTnVtYmVyKHByb2Nlc3MuZW52LlZJVEVTVF9DT1ZFUkFHRV9CUkFOQ0hFUyA/PyAnNTUnKSxcbiAgICAgICAgZnVuY3Rpb25zOiBOdW1iZXIocHJvY2Vzcy5lbnYuVklURVNUX0NPVkVSQUdFX0ZVTkNUSU9OUyA/PyAnNjAnKSxcbiAgICAgICAgbGluZXM6IE51bWJlcihwcm9jZXNzLmVudi5WSVRFU1RfQ09WRVJBR0VfTElORVMgPz8gJzYwJyksXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiBhbGlhc1ByZWZpeCxcbiAgICAgICAgcmVwbGFjZW1lbnQ6ICcnLFxuICAgICAgICBjdXN0b21SZXNvbHZlcihzb3VyY2UsIGltcG9ydGVyKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlQXBwU3BlY2lmaWVyKHNvdXJjZSwgaW1wb3J0ZXIpXG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVkID8geyBpZDogcmVzb2x2ZWQgfSA6IG51bGxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6IC9eQFxcL2NvbXBvbmVudHNcXC91aVxcLy8sXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29tcG9uZW50cy91aS8nKSArICcvJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6IC9eQFxcL2hvb2tzXFwvLyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9ob29rcy8nKSArICcvJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6IC9eQFxcL2ludGVncmF0aW9uc1xcLy8sXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvaW50ZWdyYXRpb25zLycpICsgJy8nLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogL15AXFwvbGliXFwvc2VjdXJpdHlcXC9wYXNzd29yZCQvLFxuICAgICAgICByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2xpYi9zZWN1cml0eS9wYXNzd29yZC50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0AnLFxuICAgICAgICByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaW5kOiAnbmV4dC9zZXJ2ZXInLFxuICAgICAgICByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vdGVzdHMvc3R1YnMvbmV4dC1zZXJ2ZXIudHMnKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6ICdzZXJ2ZXItb25seScsXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi90ZXN0cy9zdHVicy9zZXJ2ZXItb25seS50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ2dvb2dsZS1hdXRoLWxpYnJhcnknLFxuICAgICAgICByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vdGVzdHMvc3R1YnMvZ29vZ2xlLWF1dGgtbGlicmFyeS50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvYXBpLWNsaWVudCcsXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9wYWNrYWdlcy9hcGktY2xpZW50L2luZGV4LnRzJyksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaW5kOiAvXkBwcmlzbWEtZ2xvd1xcL2xpYlxcLyguKikvLFxuICAgICAgICByZXBsYWNlbWVudDogJycsXG4gICAgICAgIGN1c3RvbVJlc29sdmVyKHNvdXJjZSkge1xuICAgICAgICAgIGNvbnN0IG1hdGNoID0gL15AcHJpc21hLWdsb3dcXC9saWJcXC8oLiopLy5leGVjKHNvdXJjZSk7XG4gICAgICAgICAgaWYgKCFtYXRjaCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gbWF0Y2hbMV07XG4gICAgICAgICAgY29uc3Qgd2l0aEV4dGVuc2lvbiA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3BhY2thZ2VzL2xpYi9kaXN0JywgYCR7cmVsYXRpdmVQYXRofS5qc2ApO1xuICAgICAgICAgIGlmIChleGlzdHNTeW5jKHdpdGhFeHRlbnNpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpZDogd2l0aEV4dGVuc2lvbiB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBmYWxsYmFja1BhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9wYWNrYWdlcy9saWIvZGlzdCcsIHJlbGF0aXZlUGF0aCk7XG4gICAgICAgICAgcmV0dXJuIHsgaWQ6IGZhbGxiYWNrUGF0aCB9O1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvbGliJyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3BhY2thZ2VzL2xpYi9kaXN0L2luZGV4LmpzJyksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBmaW5kOiAnQHByaXNtYS9sb2dnZXInLFxuICAgICAgICByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vcGFja2FnZXMvbG9nZ2VyL3NyYy9pbmRleC50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvbG9nZ2luZycsXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9wYWNrYWdlcy9sb2dnaW5nL3NyYy9pbmRleC50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvb3RlbCcsXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zZXJ2aWNlcy9vdGVsL3NyYy9pbmRleC50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvc3lzdGVtLWNvbmZpZycsXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9wYWNrYWdlcy9zeXN0ZW0tY29uZmlnL3NyYy9pbmRleC50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvYWdlbnRzJyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3BhY2thZ2VzL2FnZW50cy9zcmMnKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6ICdAcHJpc21hL2FwaS9zY2hlbWFzJyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3BhY2thZ2VzL2FwaS9zcmMvc2NoZW1hcy9pbmRleC50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvYXBpJyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3BhY2thZ2VzL2FwaS9zcmMvaW5kZXgudHMnKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6ICdAcHJpc21hL2NvbmZpZy9lbnYvc2VjdXJpdHknLFxuICAgICAgICByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vY29uZmlnL2Vudi9zZWN1cml0eS50cycpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ0BwcmlzbWEvdGF4JyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3BhY2thZ2VzL3RheC9zcmMvaW5kZXgudHMnKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6ICdAcHJpc21hL2F1ZGl0LWFnZW50cycsXG4gICAgICAgIHJlcGxhY2VtZW50OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9wYWNrYWdlcy9hdWRpdC9zcmMvaW5kZXgudHMnKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGZpbmQ6ICdAcHJpc21hL2NvcmUnLFxuICAgICAgICByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vcGFja2FnZXMvY29yZS9zcmMvaW5kZXgudHMnKSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQ0EsU0FBUyxZQUFZLGNBQWMsYUFBYSxnQkFBZ0I7QUFDaEUsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLG1CQUFtQjtBQUwxQixJQUFNLG1DQUFtQztBQU96QyxJQUFNLFVBQVUsQ0FBQyxVQUFrQixNQUFNLFFBQVEsT0FBTyxHQUFHO0FBRTNELElBQU0sY0FBYyxLQUFLLFFBQVEsZ0NBQVM7QUFDMUMsSUFBTSxVQUFVLEtBQUssUUFBUSxhQUFhLE9BQU87QUFDakQsSUFBTSxXQUFXLEtBQUssUUFBUSxhQUFhLFFBQVE7QUFDbkQsSUFBTSxjQUFjO0FBQ3BCLElBQU0saUJBQWlCLENBQUMsT0FBTyxRQUFRLE9BQU8sUUFBUSxRQUFRLFFBQVEsT0FBTztBQWlCN0UsSUFBTSxpQkFBaUIsQ0FBQyxVQUFrQixNQUFNLFFBQVEseUJBQXlCLE1BQU07QUFFdkYsSUFBTSxxQkFBcUIsQ0FBQyxpQkFBd0M7QUFDbEUsTUFBSTtBQUNGLFVBQU0sTUFBTSxhQUFhLGNBQWMsTUFBTTtBQUM3QyxVQUFNLFNBQVMsS0FBSyxNQUFNLEdBQUc7QUFHN0IsVUFBTSxrQkFBa0IsT0FBTyxtQkFBbUIsQ0FBQztBQUNuRCxVQUFNLFVBQVUsZ0JBQWdCLFdBQVc7QUFDM0MsVUFBTSxrQkFBa0IsS0FBSyxRQUFRLEtBQUssUUFBUSxZQUFZLEdBQUcsT0FBTztBQUN4RSxVQUFNLFFBQVEsZ0JBQWdCLFNBQVMsQ0FBQztBQUV4QyxVQUFNLFdBQTBCLENBQUM7QUFFakMsZUFBVyxDQUFDLFNBQVMsWUFB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
