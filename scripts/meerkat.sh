#!/usr/bin/env bash
#
# meerkat - OpenPromo codegen orchestrator
#
# This script runs all code generation steps in the correct order:
# 1. Generate Python OpenAPI spec from Modal/FastAPI (source of truth for callbacks)
# 2. Generate Protobuf/Connect RPC code for backend (Python) and client (TypeScript)
# 3. Generate container Connect RPC code (Go + TypeScript) for CF Containers
# 4. Build/test Go container code (Connect server + handlers)
# 5. Generate TypeScript Zod schemas from Python OpenAPI via orval
# 6. Generate Internal API OpenAPI spec from ORPC routes (legacy)
# 7. Generate Python SDK from Internal API OpenAPI spec (legacy, optional)
# 8. Run lint
#
# NOTE: For new internal services, use Connect RPC (step 2) instead of ORPC (steps 5-6).
# See packages/backend/proto/ for proto definitions.
#
# Connect RPC Flow:
#   - Proto files: packages/backend/proto/
#   - Python server/client: packages/backend/src/gen/
#   - TypeScript client: packages/core/src/gen/
#   - Internal callbacks (Modal → CF Worker) use Connect RPC via InternalService
#
# Usage:
#   ./scripts/meerkat.sh        # Run all steps
#   ./scripts/meerkat.sh --help # Show help
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🦔 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

show_help() {
    echo "meerkat - OpenPromo codegen orchestrator"
    echo ""
    echo "Usage: ./scripts/meerkat.sh [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h       Show this help message"
    echo "  --skip-modal     Skip Modal OpenAPI generation (use existing openapi.json)"
    echo "  --skip-sdk       Skip legacy Python SDK generation (using Connect RPC instead)"
    echo ""
    echo "Steps:"
    echo "  1. Generate Python OpenAPI spec from Modal/FastAPI"
    echo "  2. Generate Protobuf/Connect RPC code for backend (Python) and client (TypeScript)"
    echo "  3. Generate container Connect RPC code (Go + TypeScript) for CF Containers"
    echo "  4. Build/test Go container code (Connect server + handlers)"
    echo "  5. Generate TypeScript Zod schemas via orval"
    echo "  6. Generate Internal API OpenAPI spec from ORPC (legacy)"
    echo "  7. Generate Python SDK for Internal API (legacy, skippable with --skip-sdk)"
    echo "  8. Run lint"
    echo ""
    echo "NOTE: For new internal services, use Connect RPC (step 2) instead of ORPC."
    echo ""
    echo "Connect RPC:"
    echo "  Proto files live in packages/backend/proto/"
    echo "  Python code is generated to packages/backend/src/gen/"
    echo "  TypeScript code is generated to packages/core/src/gen/"
    echo "  Internal callbacks (Modal → CF Worker) use InternalService via Connect RPC"
}

SKIP_MODAL=false
SKIP_SDK=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --skip-modal)
            SKIP_MODAL=true
            shift
            ;;
        --skip-sdk)
            SKIP_SDK=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

cd "$ROOT_DIR"

echo -e "${YELLOW}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║                                                          ║"
echo "  ║   🦔 MEERKAT - OpenPromo Codegen Orchestrator            ║"
echo "  ║                                                          ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Generate Python OpenAPI spec
if [ "$SKIP_MODAL" = false ]; then
    log_step "Step 1/8: Generate Python OpenAPI spec from Modal/FastAPI"
    cd "$ROOT_DIR/packages/backend"
    uv run modal run main.py::sdk
    log_success "Generated packages/backend/openapi.json"
else
    log_step "Step 1/8: Skipping Modal OpenAPI generation (--skip-modal)"
    log_success "Using existing packages/backend/openapi.json"
fi

# Step 2: Generate Protobuf code (backend Python + client TypeScript)
log_step "Step 2/8: Generate Protobuf/Connect RPC code"
cd "$ROOT_DIR/packages/backend"
make buf
log_success "Generated packages/backend/src/gen/ (Python Connect RPC stubs)"
cd "$ROOT_DIR/packages/shared"
npx buf generate ../backend/proto
log_success "Generated packages/shared/src/gen/ (TypeScript Connect RPC client)"

# Step 3: Generate container Connect RPC code (Go + TypeScript) for CF Containers
log_step "Step 3/8: Generate container Connect RPC code (Go + TypeScript) for CF Containers"
cd "$ROOT_DIR/packages/core/src/containers"
buf generate
log_success "Generated packages/core/src/containers/gen/ (Go + TypeScript Connect stubs)"

# Step 4: Build/test Go container code (Connect server + handlers)
log_step "Step 4/8: Build/test Go container code (Connect server + handlers)"
cd "$ROOT_DIR/packages/core/src/containers"
GOCACHE="$ROOT_DIR/.gocache" go test ./...
log_success "Go container build/test passed"

# Step 5: Generate TypeScript Zod schemas via orval
log_step "Step 5/8: Generate TypeScript Zod schemas via orval"
cd "$ROOT_DIR/packages/scripts"
pnpm orval
log_success "Generated packages/shared/src/generated/openpromo_backend.zod.ts"

# Step 6: Generate Internal API OpenAPI spec from ORPC (legacy)
# NOTE: New internal services should use Connect RPC instead (see step 2)
log_step "Step 6/8: Generate Internal API OpenAPI spec from ORPC (legacy)"
cd "$ROOT_DIR/packages/core"
pnpm gen:openapi
log_success "Generated packages/dash/worker/openapi-internal.json (legacy)"

# Step 7: Generate Python SDK for Internal API (legacy, optional)
if [ "$SKIP_SDK" = false ]; then
    log_step "Step 7/8: Generate Python SDK for Internal API (legacy)"
    cd "$ROOT_DIR/packages/backend"
    uv run python scripts/gen_internal_api.py
    log_success "Generated packages/backend/src/sdks/internal_api/"
else
    log_step "Step 7/8: Skipping Python SDK generation (--skip-sdk)"
    log_success "Using Connect RPC for internal callbacks instead"
fi

# Step 8: run biome lint
log_step "Step 8/8: Run Biome lint"
cd "$ROOT_DIR"
pnpm lint
log_success "Biome lint passed"

echo -e "\n${GREEN}"
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║                                                          ║"
echo "  ║   🦔 All codegen steps completed successfully!           ║"
echo "  ║                                                          ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Generated files:"
echo "  • packages/backend/openapi.json                  (Python API spec)"
echo "  • packages/backend/src/gen/                      (Python Connect RPC stubs)"
echo "  • packages/core/src/gen/                         (TypeScript Connect RPC client)"
echo "  • packages/core/src/containers/gen/              (CF Container Connect stubs - Go + TS)"
echo "  • packages/core/src/containers (Go)              (Connect server tested via go test)"
echo "  • packages/shared/src/generated/*.zod.ts         (TypeScript Zod schemas)"
echo "  • packages/dash/worker/openapi-internal.json     (Internal API spec)"
if [ "$SKIP_SDK" = false ]; then
echo "  • packages/backend/src/sdks/internal_api/        (Python SDK - legacy)"
fi
echo ""
echo "Connect RPC services:"
echo "  • InternalService (Modal → CF Worker callbacks)"
echo "    - Endpoint: /api/connect/internal.v1.InternalService/*"
echo "    - Python client: src/rpc/internal_client.py"
