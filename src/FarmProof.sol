// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FarmProof {
    // ENUMS

    enum BatchStatus {
        Registered,
        InTransit,
        Delivered,
        Sold,
        Cancelled
    }

    // STRUCTS

    struct ProduceBatch {
        uint256 id;
        string produceType;
        uint256 quantity;
        string unit;
        address farmer;
        address currentOwner;
        uint256 createdAt;
        BatchStatus status;
    }

    struct HistoryRecord {
        address actor;
        address from;
        address to;
        BatchStatus status;
        uint256 timestamp;
    }

    // MAPPINGS

    // Batch ID => Produce Batch
    mapping(uint256 => ProduceBatch) public batches;

    // Farmer address => list of batch IDs
    mapping(address => uint256[]) public farmerBatches;

    // Batch ID => complete history
    mapping(uint256 => HistoryRecord[]) private batchHistory;

    // STATE

    uint256 private nextBatchId = 1;

    // ERRORS

    error InvalidQuantity();
    error BatchNotFound();
    error NotAuthorized();
    error InvalidStatus();
    error ZeroAddress();

    // EVENTS

    event BatchRegistered(
        uint256 indexed batchId, address indexed farmer, string produceType, uint256 quantity, string unit
    );

    event OwnershipTransferred(uint256 indexed batchId, address indexed from, address indexed to);

    event StatusUpdated(uint256 indexed batchId, BatchStatus status);

    // MODIFIERS

    modifier batchExists(uint256 batchId) {
        if (batches[batchId].id == 0) {
            revert BatchNotFound();
        }
        _;
    }

    modifier onlyBatchOwner(uint256 batchId) {
        if (batches[batchId].id == 0) {
            revert BatchNotFound();
        }

        if (batches[batchId].currentOwner != msg.sender) {
            revert NotAuthorized();
        }
        _;
    }

    // REGISTER PRODUCE

    function registerBatch(string calldata produceType, uint256 quantity, string calldata unit)
        external
        returns (uint256 batchId)
    {
        if (quantity == 0) {
            revert InvalidQuantity();
        }

        batchId = nextBatchId++;

        batches[batchId] = ProduceBatch({
            id: batchId,
            produceType: produceType,
            quantity: quantity,
            unit: unit,
            farmer: msg.sender,
            currentOwner: msg.sender,
            createdAt: block.timestamp,
            status: BatchStatus.Registered
        });

        farmerBatches[msg.sender].push(batchId);

        batchHistory[batchId].push(
            HistoryRecord({
                actor: msg.sender,
                from: address(0),
                to: msg.sender,
                status: BatchStatus.Registered,
                timestamp: block.timestamp
            })
        );

        emit BatchRegistered(batchId, msg.sender, produceType, quantity, unit);

        emit StatusUpdated(batchId, BatchStatus.Registered);
    }

    // TRANSFER OWNERSHIP

    function transferBatch(uint256 batchId, address newOwner) external onlyBatchOwner(batchId) {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }

        BatchStatus currentStatus = batches[batchId].status;

        // Only Registered or InTransit batches may be transferred.
        if (currentStatus != BatchStatus.Registered && currentStatus != BatchStatus.InTransit) {
            revert InvalidStatus();
        }

        address previousOwner = batches[batchId].currentOwner;

        batches[batchId].currentOwner = newOwner;
        batches[batchId].status = BatchStatus.InTransit;

        batchHistory[batchId].push(
            HistoryRecord({
                actor: msg.sender,
                from: previousOwner,
                to: newOwner,
                status: BatchStatus.InTransit,
                timestamp: block.timestamp
            })
        );

        emit OwnershipTransferred(batchId, previousOwner, newOwner);

        emit StatusUpdated(batchId, BatchStatus.InTransit);
    }

    // UPDATE STATUS

    function updateStatus(uint256 batchId, BatchStatus newStatus) external onlyBatchOwner(batchId) {
        BatchStatus currentStatus = batches[batchId].status;

        if (!_isValidTransition(currentStatus, newStatus)) {
            revert InvalidStatus();
        }

        batches[batchId].status = newStatus;

        batchHistory[batchId].push(
            HistoryRecord({
                actor: msg.sender, from: msg.sender, to: msg.sender, status: newStatus, timestamp: block.timestamp
            })
        );

        emit StatusUpdated(batchId, newStatus);
    }

    // VALIDATE STATUS FLOW

    function _isValidTransition(BatchStatus currentStatus, BatchStatus newStatus) internal pure returns (bool) {
        if (currentStatus == BatchStatus.Registered) {
            return (newStatus == BatchStatus.InTransit || newStatus == BatchStatus.Cancelled);
        }

        if (currentStatus == BatchStatus.InTransit) {
            return (newStatus == BatchStatus.Delivered || newStatus == BatchStatus.Cancelled);
        }

        if (currentStatus == BatchStatus.Delivered) {
            return newStatus == BatchStatus.Sold;
        }

        // Sold and Cancelled are terminal states.
        return false;
    }

    // GET BATCH

    function getBatch(uint256 batchId) external view batchExists(batchId) returns (ProduceBatch memory) {
        return batches[batchId];
    }

    // GET FARMER BATCHES

    function getFarmerBatches(address farmer) external view returns (uint256[] memory) {
        return farmerBatches[farmer];
    }

    // GET BATCH HISTORY

    function getBatchHistory(uint256 batchId) external view batchExists(batchId) returns (HistoryRecord[] memory) {
        return batchHistory[batchId];
    }

    // COUNT BATCHES BY STATUS

    function countFarmerBatchesByStatus(address farmer, BatchStatus status) external view returns (uint256 count) {
        uint256[] memory batchList = farmerBatches[farmer];

        for (uint256 i = 0; i < batchList.length; i++) {
            if (batches[batchList[i]].status == status) {
                count++;
            }
        }
    }

    // NEXT BATCH ID

    function getNextBatchId() external view returns (uint256) {
        return nextBatchId;
    }
}
