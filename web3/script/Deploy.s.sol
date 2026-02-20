// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PachaTerra.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        PachaTerra terra = new PachaTerra();
        console.log("PachaTerra deployed at:", address(terra));
        vm.stopBroadcast();
    }
}
