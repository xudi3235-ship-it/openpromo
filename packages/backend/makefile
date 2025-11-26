# gen openapi spec
codegen: 
	uv run modal run main.py::sdk

# gen proto/connect code
buf:
	buf generate proto
	uv run python scripts/fix_proto_imports.py

meerkat:
	cd ../.. && pnpm meerkat