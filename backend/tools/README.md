# Backend Security Tooling

This directory contains automated scripts that analyze the Express backend for security posture and configuration gaps. Each tool writes its output to `tools/reports/`.

## Prerequisites

- Node.js installed
- Run scripts from the `backend` directory: `node tools/<script-name>.js`
- Ensure `npm install` has been executed so route modules resolve correctly

## Available Scripts

### security-precheck.js

Scans `index.js`, `package.json`, and `.env.example` to confirm that security middleware and dependencies are present.

**Output:** `reports/security-precheck.json`

**Checks performed:**
- Helmet, CORS, rate limiting, sanitization middleware
- `trust proxy` configuration
- `bodyParser` limits
- Required security dependencies in `package.json`
- Mandatory environment variables in `.env.example`

### auth-map-analyzer.js

Produces a map of all Express routers, their mount paths, and applied middleware stacks. Highlights routes missing authentication unless intentionally allowlisted.

**Output:** `reports/auth-map.json`

**Configuration:** `config/auth-guard-allowlist.json` (regex patterns for public routes)

**Checks performed:**
- Router-level middleware (e.g., `protect`, `admin`)
- Endpoint-specific middleware and handlers
- Detection of unsecured endpoints not present in the allowlist

### schema-validator.js

Inspects Mongoose models and controller files to spot missing validation or potentially unsafe patterns.

**Output:** `reports/schema-validator.json`

**Checks performed:**
- Models exporting valid schemas with timestamps
- Fields lacking explicit types or using `Mixed`
- Controllers using `req.body`, `req.query`, or `req.params` without recognizable validation
- Potential unsafe query construction

## Reports Directory

Ensure `tools/reports/` exists and is git-ignored if necessary. Each script will create the directory automatically.

## Logging

Scripts share a lightweight logger (`utils/logger.js`) with timestamped output. Set `LOG_LEVEL=debug` to see verbose details.
