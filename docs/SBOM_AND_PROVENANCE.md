# SBOM and Build Provenance

## Overview

Prisma Glow generates Software Bill of Materials (SBOM) and build provenance artifacts for supply chain security and compliance.

## SBOM Generation

SBOMs are automatically generated for all major services and components using CycloneDX format:

### Generated SBOMs

- **prisma-root-node.json** - Root workspace Node.js dependencies
- **prisma-backend-python.json** - Python FastAPI backend dependencies
- **prisma-web.json** - Next.js admin PWA dependencies
- **prisma-gateway.json** - Express.js API gateway dependencies
- **prisma-rag.json** - RAG service dependencies
- **prisma-analytics.json** - Analytics service dependencies
- **prisma-agent.json** - Agent runtime dependencies

### Location

SBOMs are stored in `docs/sbom/` and are automatically committed to the main branch on each build.

### Format

All SBOMs use **CycloneDX 1.4+ JSON** format, which is:
- Compatible with OWASP Dependency-Track
- Supported by GitHub Dependency Graph
- Parseable by most security scanning tools
- NTIA minimum elements compliant

### CI Workflow

The SBOM generation workflow (`.github/workflows/sbom.yml`) runs on:
- Every push to main branch
- Every pull request to main
- Every release publication
- Manual dispatch

### Usage

#### Vulnerability Analysis
```bash
# Use with OWASP Dependency-Track
curl -X POST "https://dtrack.example.com/api/v1/bom" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @docs/sbom/prisma-root-node.json
```

#### License Compliance
```bash
# Extract license information
jq '.components[] | {name: .name, license: .licenses[0].license.id}' \
  docs/sbom/prisma-root-node.json
```

#### Dependency Audit
```bash
# List all dependencies and versions
jq -r '.components[] | "\(.name)@\(.version)"' \
  docs/sbom/prisma-root-node.json | sort
```

## Build Provenance

Build provenance documents provide attestation of how artifacts were built, supporting supply chain verification.

### Format

Provenance documents follow a simplified SLSA-inspired format and include:

- **buildType**: Build process identifier
- **builder**: CI runner information
- **invocation**: Source repository and commit details
- **metadata**: Build timestamps and completeness markers
- **materials**: Source repository digest
- **sboms**: References to generated SBOM files

### Location

Provenance documents are stored in `docs/provenance/` with filename pattern:
```
build-provenance-{commit-sha}.json
```

### Verification

To verify a build:

1. **Check commit SHA matches**
   ```bash
   jq -r '.invocation.configSource.digest.sha1' \
     docs/provenance/build-provenance-*.json
   ```

2. **Verify builder identity**
   ```bash
   jq -r '.builder.id' \
     docs/provenance/build-provenance-*.json
   ```

3. **List included SBOMs**
   ```bash
   jq -r '.sboms[].uri' \
     docs/provenance/build-provenance-*.json
   ```

### CI Artifacts

Both SBOMs and provenance are uploaded as GitHub Actions artifacts with:
- **Retention**: 90 days for SBOMs, 90 days for provenance
- **Naming**: `sbom-files-{sha}` and `build-provenance-{sha}`

Download artifacts via GitHub Actions UI or CLI:
```bash
gh run download {run-id} -n sbom-files-{sha}
gh run download {run-id} -n build-provenance-{sha}
```

## Incident Response

During security incidents, use SBOMs to:

1. **Identify affected dependencies**
   ```bash
   # Check if vulnerable package is present
   jq '.components[] | select(.name == "vulnerable-package")' \
     docs/sbom/*.json
   ```

2. **Determine version ranges**
   ```bash
   # List all versions of a package across services
   jq -r '.components[] | select(.name == "package-name") | .version' \
     docs/sbom/*.json | sort -u
   ```

3. **Generate dependency tree**
   ```bash
   # Extract dependency relationships (if present)
   jq '.dependencies' docs/sbom/*.json
   ```

## Compliance Requirements

### SBOM Generation Gates

- ✅ Automated generation on every build
- ✅ CycloneDX format (industry standard)
- ✅ Includes all production dependencies
- ✅ Stored in version control
- ✅ Available as downloadable artifacts

### Provenance Gates

- ✅ Builder identity captured
- ✅ Source commit SHA recorded
- ✅ Build timestamps included
- ✅ SBOM references linked
- ✅ Stored with retention policy

## Integration with Security Tools

### Dependabot
GitHub automatically parses SBOMs and updates the dependency graph.

### Trivy
Scan SBOMs for vulnerabilities:
```bash
trivy sbom docs/sbom/prisma-root-node.json
```

### Grype
```bash
grype sbom:docs/sbom/prisma-root-node.json
```

### OWASP Dependency-Check
```bash
dependency-check.sh --scan docs/sbom/ --format JSON
```

## Updating This Documentation

When making changes to SBOM or provenance generation:

1. Update `.github/workflows/sbom.yml`
2. Test changes in a PR
3. Update this documentation
4. Add ADR if changing format or retention policy

## Related Documentation

- [Security Policy](../SECURITY.md)
- [Deployment Readiness](DEPLOYMENT_READINESS_REPORT.md)
- [Go-Live Gates](../GO-LIVE/GO-LIVE-GATES.md)

## References

- [CycloneDX Specification](https://cyclonedx.org/specification/overview/)
- [SLSA Framework](https://slsa.dev/)
- [NTIA Minimum Elements](https://www.ntia.gov/files/ntia/publications/sbom_minimum_elements_report.pdf)
- [OWASP Dependency-Track](https://dependencytrack.org/)
