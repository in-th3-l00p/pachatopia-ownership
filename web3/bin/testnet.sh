#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB3_DIR="$(dirname "$SCRIPT_DIR")"

# ── Anvil default accounts ──────────────────────────────────────────
OWNER_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ALICE_PK="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
BOB_PK="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"

OWNER_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ALICE_ADDR="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
BOB_ADDR="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"

ANVIL_LOG=$(mktemp)

cleanup() {
    echo ""
    echo "Shutting down Anvil (PID $ANVIL_PID)..."
    kill "$ANVIL_PID" 2>/dev/null || true
    rm -f "$ANVIL_LOG"
}
trap cleanup EXIT INT TERM

# ── Print wallets ────────────────────────────────────────────────────
echo "============================================"
echo "  PachaTerra Local Testnet"
echo "============================================"
echo ""
echo "OWNER / ADMIN  (deployer – account #0)"
echo "  Address:     $OWNER_ADDR"
echo "  Private Key: $OWNER_PK"
echo ""
echo "ALICE  (test user – account #1)"
echo "  Address:     $ALICE_ADDR"
echo "  Private Key: $ALICE_PK"
echo ""
echo "BOB  (test user – account #2)"
echo "  Address:     $BOB_ADDR"
echo "  Private Key: $BOB_PK"
echo ""

# ── Start Anvil ──────────────────────────────────────────────────────
echo "Starting Anvil..."
anvil > "$ANVIL_LOG" 2>&1 &
ANVIL_PID=$!

# Wait for Anvil to accept RPC
for _ in $(seq 1 30); do
    if cast chain-id --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

if ! cast chain-id --rpc-url http://127.0.0.1:8545 >/dev/null 2>&1; then
    echo "ERROR: Anvil failed to start within 15 seconds"
    exit 1
fi
echo "Anvil running (PID $ANVIL_PID)"
echo ""

# ── Deploy ───────────────────────────────────────────────────────────
echo "Deploying PachaTerra..."
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
    --rpc-url http://127.0.0.1:8545 \
    --private-key "$OWNER_PK" \
    --broadcast 2>&1)

# Extract deployed address
TERRA_ADDRESS=$(echo "$DEPLOY_OUTPUT" | sed -n 's/.*PachaTerra deployed at: \(0x[a-fA-F0-9]*\).*/\1/p')

if [ -z "$TERRA_ADDRESS" ]; then
    echo "ERROR: Could not extract contract address from deploy output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "PachaTerra deployed at: $TERRA_ADDRESS"
echo ""

# ── Seed ─────────────────────────────────────────────────────────────
echo "Seeding 24 tiles (8 listed for sale)..."
TERRA_ADDRESS="$TERRA_ADDRESS" forge script script/Seed.s.sol \
    --rpc-url http://127.0.0.1:8545 \
    --private-key "$OWNER_PK" \
    --broadcast 2>&1

echo ""
echo "============================================"
echo "  Testnet ready!"
echo ""
echo "  Contract: $TERRA_ADDRESS"
echo "  RPC URL:  http://127.0.0.1:8545"
echo "  Chain ID: 31337"
echo ""
echo "  Press Ctrl+C to stop."
echo "============================================"
echo ""

# ── Tail Anvil logs ──────────────────────────────────────────────────
tail -f "$ANVIL_LOG"
