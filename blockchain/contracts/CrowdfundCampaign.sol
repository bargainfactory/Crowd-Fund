// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CrowdfundCampaign
 * @dev Manages a single crowdfunding campaign with escrow and transparent donations
 * @notice Optimized for Polygon for low gas fees, accessible in low-resource regions
 */
contract CrowdfundCampaign {
    // ─── State ──────────────────────────────────────────────────────────────

    enum State { Active, Successful, Failed, Cancelled }

    address payable public creator;
    uint256 public goal;
    uint256 public deadline;
    uint256 public totalRaised;
    uint256 public donorCount;
    State public state;

    // Multi-sig approvers (optional for large campaigns)
    address[] public approvers;
    uint256 public requiredApprovals;
    mapping(address => bool) public isApprover;

    // Donations tracking
    mapping(address => uint256) public donations;
    address[] public donors;

    // Withdrawal approvals
    mapping(bytes32 => uint256) public approvalCount;
    mapping(bytes32 => mapping(address => bool)) public hasApproved;

    // ─── Events ─────────────────────────────────────────────────────────────

    event DonationReceived(address indexed donor, uint256 amount, uint256 totalRaised);
    event GoalReached(uint256 totalAmount, uint256 timestamp);
    event FundsWithdrawn(address indexed creator, uint256 amount);
    event RefundIssued(address indexed donor, uint256 amount);
    event CampaignCancelled(address indexed creator, uint256 timestamp);
    event WithdrawalApproved(address indexed approver, bytes32 indexed withdrawalId);

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    modifier onlyActive() {
        require(state == State.Active, "Campaign not active");
        require(block.timestamp < deadline, "Campaign expired");
        _;
    }

    modifier onlyEnded() {
        require(block.timestamp >= deadline || state == State.Successful || state == State.Cancelled, "Campaign still active");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(
        uint256 _goal,
        uint256 _deadline,
        address payable _creator,
        address[] memory _approvers,
        uint256 _requiredApprovals
    ) {
        require(_goal > 0, "Goal must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_creator != address(0), "Invalid creator address");

        goal = _goal;
        deadline = _deadline;
        creator = _creator;
        state = State.Active;

        if (_approvers.length > 0) {
            require(_requiredApprovals > 0 && _requiredApprovals <= _approvers.length, "Invalid approvals count");
            approvers = _approvers;
            requiredApprovals = _requiredApprovals;
            for (uint i = 0; i < _approvers.length; i++) {
                isApprover[_approvers[i]] = true;
            }
        }
    }

    // ─── Donation ────────────────────────────────────────────────────────────

    /**
     * @dev Accept donations. Emits DonationReceived and GoalReached events.
     */
    function donate() external payable onlyActive {
        require(msg.value > 0, "Donation must be > 0");

        if (donations[msg.sender] == 0) {
            donors.push(msg.sender);
            donorCount++;
        }

        donations[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit DonationReceived(msg.sender, msg.value, totalRaised);

        if (totalRaised >= goal && state == State.Active) {
            state = State.Successful;
            emit GoalReached(totalRaised, block.timestamp);
        }
    }

    // ─── Withdrawal ──────────────────────────────────────────────────────────

    /**
     * @dev Creator withdraws funds after goal is reached
     * @notice If multi-sig is enabled, requires approval from required approvers
     */
    function withdraw() external onlyCreator {
        require(
            state == State.Successful || (block.timestamp >= deadline && totalRaised >= goal),
            "Goal not reached"
        );

        uint256 amount = address(this).balance;
        require(amount > 0, "No funds to withdraw");

        if (approvers.length > 0) {
            bytes32 withdrawalId = keccak256(abi.encodePacked("withdraw", block.timestamp / 86400));
            require(approvalCount[withdrawalId] >= requiredApprovals, "Not enough approvals");
        }

        state = State.Successful;
        creator.transfer(amount);
        emit FundsWithdrawn(creator, amount);
    }

    /**
     * @dev Approver signs off on withdrawal (multi-sig)
     */
    function approveWithdrawal() external {
        require(isApprover[msg.sender], "Not an approver");
        bytes32 withdrawalId = keccak256(abi.encodePacked("withdraw", block.timestamp / 86400));
        require(!hasApproved[withdrawalId][msg.sender], "Already approved");

        hasApproved[withdrawalId][msg.sender] = true;
        approvalCount[withdrawalId]++;

        emit WithdrawalApproved(msg.sender, withdrawalId);
    }

    // ─── Refund ──────────────────────────────────────────────────────────────

    /**
     * @dev Donors can claim refunds if campaign failed or was cancelled
     */
    function refund() external onlyEnded {
        require(
            state == State.Failed || state == State.Cancelled ||
            (block.timestamp >= deadline && totalRaised < goal),
            "Refund not available"
        );

        if (state == State.Active) state = State.Failed;

        uint256 amount = donations[msg.sender];
        require(amount > 0, "No donation to refund");

        donations[msg.sender] = 0;
        totalRaised -= amount;

        payable(msg.sender).transfer(amount);
        emit RefundIssued(msg.sender, amount);
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    /**
     * @dev Creator can cancel campaign before deadline (only if no donations yet)
     */
    function cancelCampaign() external onlyCreator {
        require(state == State.Active, "Cannot cancel");
        require(totalRaised == 0, "Cannot cancel after donations received");

        state = State.Cancelled;
        emit CampaignCancelled(creator, block.timestamp);
    }

    // ─── View functions ──────────────────────────────────────────────────────

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getDonors() external view returns (address[] memory) {
        return donors;
    }

    function getCampaignInfo() external view returns (
        address _creator,
        uint256 _goal,
        uint256 _deadline,
        uint256 _totalRaised,
        uint256 _donorCount,
        State _state,
        uint256 _balance
    ) {
        return (creator, goal, deadline, totalRaised, donorCount, state, address(this).balance);
    }

    function getProgressPercentage() external view returns (uint256) {
        if (goal == 0) return 0;
        return (totalRaised * 100) / goal;
    }

    function isGoalReached() external view returns (bool) {
        return totalRaised >= goal;
    }

    function getTimeLeft() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    // Receive ether
    receive() external payable {
        if (state == State.Active && block.timestamp < deadline) {
            donations[msg.sender] += msg.value;
            totalRaised += msg.value;
            if (donations[msg.sender] == msg.value) {
                donors.push(msg.sender);
                donorCount++;
            }
            emit DonationReceived(msg.sender, msg.value, totalRaised);
        } else {
            revert("Campaign not accepting donations");
        }
    }
}
