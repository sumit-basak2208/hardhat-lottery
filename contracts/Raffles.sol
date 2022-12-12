//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

error Raffles__NotEnoughETH();
error Raffles__LotteryNotOpen();
error Raffles__UpkeepNotNeeded(
    uint256 balance,
    uint256 players,
    uint256 rafflesState
);
error RafflesTransferFailed();

contract Raffles is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subId;
    uint16 private constant MIN_CONFIRMATION = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUMWORDS = 1;

    uint256 private immutable i_interval;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_fee;
    address payable[] private s_players;
    address private s_recentWinner;

    event RafflesEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorAddress,
        uint256 interval,
        uint256 fee,
        bytes32 keyHash,
        uint64 subId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorAddress) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorAddress);
        i_keyHash = keyHash;
        i_subId = subId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        i_interval = interval;
        s_lastTimeStamp = block.timestamp;
        i_fee = fee;
    }

    function enterRaffles() public payable {
        if (msg.value < i_fee) revert Raffles__NotEnoughETH();
        if (s_raffleState != RaffleState.OPEN) revert Raffles__LotteryNotOpen();
        s_players.push(payable(msg.sender));
        emit RafflesEnter(msg.sender);
    }

    function checkUpkeep(
        bytes calldata checkData
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        bool isOpen = s_raffleState == RaffleState.OPEN;
        bool hasPlayer = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        bool hasTimePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool upkeep = (isOpen && hasPlayer && hasBalance && hasTimePassed);
        return (upkeep, "0x0");
    }

    function performUpkeep(bytes calldata performData) external override {
        (bool upkeepNeeded, ) = checkUpkeep(performData);
        if (!upkeepNeeded) {
            revert Raffles__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subId,
            MIN_CONFIRMATION,
            i_callbackGasLimit,
            NUMWORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 winnerIndex = randomWords[0] % s_players.length;
        address payable winnerAddress = s_players[winnerIndex];
        s_recentWinner = winnerAddress;
        s_players = new address payable[](0);
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = winnerAddress.call{value: address(this).balance}("");

        if (!success) revert RafflesTransferFailed();
        emit WinnerPicked(winnerAddress);
    }

    function getKeyHash() public view returns (bytes32) {
        return i_keyHash;
    }

    function getCallBackGasLimit() public view returns (uint32) {
        return i_callbackGasLimit;
    }

    function getFee() public view returns (uint256) {
        return i_fee;
    }

    function getWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getTotalPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }
}
