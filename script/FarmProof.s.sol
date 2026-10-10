// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {FarmProof} from "../src/FarmProof.sol";

contract FarmProofScript is Script {
    function run() external returns (FarmProof) {
        vm.startBroadcast();

        FarmProof farmProof = new FarmProof();

        vm.stopBroadcast();

        return farmProof;
    }
}
