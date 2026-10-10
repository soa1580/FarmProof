// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {FarmProof} from "../src/FarmProof.sol";

contract FarmProofTest is Test {
    FarmProof public farmProof;

    address public farmer = makeAddr("farmer");
    address public aggregator = makeAddr("aggregator");
    address public transporter = makeAddr("transporter");

    function setUp() public {
        farmProof = new FarmProof();
    }

    function test_RegisterBatch() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        assertEq(batchId, 1);

        FarmProof.ProduceBatch memory batch = farmProof.getBatch(batchId);

        assertEq(batch.id, 1);
        assertEq(batch.produceType, "Rice");
        assertEq(batch.quantity, 100);
        assertEq(batch.unit, "bags");
        assertEq(batch.farmer, farmer);
        assertEq(batch.currentOwner, farmer);
        assertEq(uint256(batch.status), uint256(FarmProof.BatchStatus.Registered));
    }

    function test_RevertWhenRegisteringZeroQuantity() public {
        vm.prank(farmer);

        vm.expectRevert(FarmProof.InvalidQuantity.selector);

        farmProof.registerBatch("Rice", 0, "bags");
    }

    function test_MultipleBatchIdsIncrementCorrectly() public {
        vm.startPrank(farmer);

        uint256 firstBatch = farmProof.registerBatch("Rice", 100, "bags");

        uint256 secondBatch = farmProof.registerBatch("Beans", 50, "bags");

        vm.stopPrank();

        assertEq(firstBatch, 1);
        assertEq(secondBatch, 2);
    }

    function test_FarmerBatchesArray() public {
        vm.startPrank(farmer);

        farmProof.registerBatch("Rice", 100, "bags");

        farmProof.registerBatch("Beans", 50, "bags");

        vm.stopPrank();

        uint256[] memory farmerBatchIds = farmProof.getFarmerBatches(farmer);

        assertEq(farmerBatchIds.length, 2);
        assertEq(farmerBatchIds[0], 1);
        assertEq(farmerBatchIds[1], 2);
    }

    function test_TransferBatch() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        farmProof.transferBatch(batchId, aggregator);

        FarmProof.ProduceBatch memory batch = farmProof.getBatch(batchId);

        assertEq(batch.currentOwner, aggregator);

        assertEq(uint256(batch.status), uint256(FarmProof.BatchStatus.InTransit));
    }

    function test_RevertWhenNonOwnerTransfersBatch() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(aggregator);

        vm.expectRevert(FarmProof.NotAuthorized.selector);

        farmProof.transferBatch(batchId, transporter);
    }

    function test_RevertWhenTransferToZeroAddress() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        vm.expectRevert(FarmProof.ZeroAddress.selector);

        farmProof.transferBatch(batchId, address(0));
    }

    function test_StatusLifecycle() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.InTransit);

        FarmProof.ProduceBatch memory batch = farmProof.getBatch(batchId);

        assertEq(uint256(batch.status), uint256(FarmProof.BatchStatus.InTransit));

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.Delivered);

        batch = farmProof.getBatch(batchId);

        assertEq(uint256(batch.status), uint256(FarmProof.BatchStatus.Delivered));

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.Sold);

        batch = farmProof.getBatch(batchId);

        assertEq(uint256(batch.status), uint256(FarmProof.BatchStatus.Sold));
    }

    function test_RevertOnInvalidStatusTransition() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        vm.expectRevert(FarmProof.InvalidStatus.selector);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.Sold);
    }

    function test_BatchHistoryIsRecorded() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        farmProof.transferBatch(batchId, aggregator);

        FarmProof.HistoryRecord[] memory history = farmProof.getBatchHistory(batchId);

        assertEq(history.length, 2);

        assertEq(history[0].actor, farmer);
        assertEq(uint256(history[0].status), uint256(FarmProof.BatchStatus.Registered));

        assertEq(history[1].actor, farmer);
        assertEq(history[1].to, aggregator);
        assertEq(uint256(history[1].status), uint256(FarmProof.BatchStatus.InTransit));
    }

    function test_CountFarmerBatchesByStatus() public {
        vm.startPrank(farmer);

        uint256 firstBatch = farmProof.registerBatch("Rice", 100, "bags");

        farmProof.registerBatch("Beans", 50, "bags");

        uint256 thirdBatch = farmProof.registerBatch("Maize", 75, "bags");

        farmProof.updateStatus(firstBatch, FarmProof.BatchStatus.InTransit);

        farmProof.updateStatus(thirdBatch, FarmProof.BatchStatus.InTransit);

        vm.stopPrank();

        uint256 registered = farmProof.countFarmerBatchesByStatus(farmer, FarmProof.BatchStatus.Registered);

        uint256 inTransit = farmProof.countFarmerBatchesByStatus(farmer, FarmProof.BatchStatus.InTransit);

        assertEq(registered, 1);
        assertEq(inTransit, 2);
    }

    function test_RevertWhenGettingNonexistentBatch() public {
        vm.expectRevert(FarmProof.BatchNotFound.selector);

        farmProof.getBatch(999);
    }

    function test_RevertWhenTransferringSoldBatch() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.InTransit);

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.Delivered);

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.Sold);

        vm.prank(farmer);

        vm.expectRevert(FarmProof.InvalidStatus.selector);

        farmProof.transferBatch(batchId, aggregator);
    }

    function test_RevertWhenTransferringCancelledBatch() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.Cancelled);

        vm.prank(farmer);

        vm.expectRevert(FarmProof.InvalidStatus.selector);

        farmProof.transferBatch(batchId, aggregator);
    }

    function test_RevertWhenUpdatingCancelledBatch() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(farmer);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.Cancelled);

        vm.prank(farmer);

        vm.expectRevert(FarmProof.InvalidStatus.selector);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.InTransit);
    }

    function test_RevertWhenNonOwnerUpdatesStatus() public {
        vm.prank(farmer);

        uint256 batchId = farmProof.registerBatch("Rice", 100, "bags");

        vm.prank(aggregator);

        vm.expectRevert(FarmProof.NotAuthorized.selector);

        farmProof.updateStatus(batchId, FarmProof.BatchStatus.InTransit);
    }
}
