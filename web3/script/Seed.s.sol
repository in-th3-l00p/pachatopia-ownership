// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PachaTerra.sol";

contract SeedScript is Script {
    function run() external {
        // Expects TERRA_ADDRESS env var
        address terraAddr = vm.envAddress("TERRA_ADDRESS");
        PachaTerra terra = PachaTerra(terraAddr);

        vm.startBroadcast();

        // Mint a 4x6 grid of tiles around Antioquia, Colombia
        // Coordinates stored as microdegrees (lat * 1e6, lng * 1e6)
        int32 baseLat = 6_702_000;  // 6.702
        int32 baseLng = -75_505_000; // -75.505
        int32 step = 3_000;          // 0.003 degrees
        uint32 size = 3_000;         // 30m x 30m in cm

        for (uint256 row = 0; row < 4; row++) {
            for (uint256 col = 0; col < 6; col++) {
                int32 lat = baseLat + int32(int256(row)) * step;
                int32 lng = baseLng + int32(int256(col)) * step;
                terra.mint(lat, lng, size, size);
            }
        }

        // List the first 8 tiles for sale (makes them "available" on the map)
        for (uint256 id = 0; id < 8; id++) {
            terra.list(id, 0.01 ether);
        }

        console.log("Seeded 24 tiles (8 listed for sale)");
        vm.stopBroadcast();
    }
}
