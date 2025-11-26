#!/usr/bin/env bash
#
# meerkat - OpenPromo codegen orchestrator
#
# This script runs all code generation steps in the correct order:
# 1. Generate Python OpenAPI spec from Modal/FastAPI (source of truth for callbacks)
# 2. Generate Protobuf/Connect RPC code for backend (Python) and client (TypeScript)
# 3. Generate TypeScript Zod schemas from Python OpenAPI via orval
# 4. Generate Internal API OpenAPI spec from ORPC routes
# 5. Generate Python SDK from Internal API OpenAPI spec (legacy, optional)
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
    echo "  3. Generate TypeScript Zod schemas via orval"
    echo "  4. Generate Internal API OpenAPI spec from ORPC"
    echo "  5. Generate Python SDK for Internal API (legacy, skippable with --skip-sdk)"
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
    log_step "Step 1/6: Generate Python OpenAPI spec from Modal/FastAPI"
    cd "$ROOT_DIR/packages/backend"
    uv run modal run main.py::sdk
    log_success "Generated packages/backend/openapi.json"
else
    log_step "Step 1/6: Skipping Modal OpenAPI generation (--skip-modal)"
    log_success "Using existing packages/backend/openapi.json"
fi

# Step 2: Generate Protobuf code (backend Python + client TypeScript)
log_step "Step 2/6: Generate Protobuf/Connect RPC code"
cd "$ROOT_DIR/packages/backend"
make buf
log_success "Generated packages/backend/src/gen/ (Python Connect RPC stubs)"
cd "$ROOT_DIR/packages/shared"
npx buf generate ../backend/proto
log_success "Generated packages/shared/src/gen/ (TypeScript Connect RPC client)"

# Step 3: Generate TypeScript Zod schemas via orval
log_step "Step 3/6: Generate TypeScript Zod schemas via orval"
cd "$ROOT_DIR/packages/scripts"
pnpm orval
log_success "Generated packages/shared/src/generated/openpromo_backend.zod.ts"

# Step 4: Generate Internal API OpenAPI spec from ORPC
log_step "Step 4/6: Generate Internal API OpenAPI spec from ORPC"
cd "$ROOT_DIR/packages/core"
pnpm gen:openapi
log_success "Generated packages/dash/worker/openapi-internal.json"

# Step 5: Generate Python SDK for Internal API (legacy, optional)
if [ "$SKIP_SDK" = false ]; then
    log_step "Step 5/6: Generate Python SDK for Internal API (legacy)"
    cd "$ROOT_DIR/packages/backend"
    uv run python scripts/gen_internal_api.py
    log_success "Generated packages/backend/src/sdks/internal_api/"
else
    log_step "Step 5/6: Skipping Python SDK generation (--skip-sdk)"
    log_success "Using Connect RPC for internal callbacks instead"
fi

# Step 6: run biome lint
log_step "Step 6/6: Run Biome lint"
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
