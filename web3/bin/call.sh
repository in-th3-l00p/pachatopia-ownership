#!/usr/bin/env bash
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
TERRA_ADDRESS="${TERRA_ADDRESS:-0x5FbDB2315678afecb367f032d93F642f64180aa3}"

if [ $# -lt 1 ]; then
    echo "Usage: ./bin/call.sh <signature> [args...]"
    echo ""
    echo "Examples:"
    echo "  ./bin/call.sh 'totalSupply()(uint256)'"
    echo "  ./bin/call.sh 'getTerra(uint256)(int32,int32,uint32,uint32,bool,uint256)' 0"
    echo "  ./bin/call.sh 'ownerOf(uint256)(address)' 0"
    echo "  ./bin/call.sh 'isForSale(uint256)(bool)' 0"
    echo "  ./bin/call.sh 'totalTerras()(uint256)'"
    echo ""
    echo "Env: RPC_URL=$RPC_URL  TERRA_ADDRESS=$TERRA_ADDRESS"
    exit 1
fi

cast call "$TERRA_ADDRESS" "$@" --rpc-url "$RPC_URL"
