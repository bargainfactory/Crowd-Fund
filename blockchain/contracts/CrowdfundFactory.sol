// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CrowdfundCampaign.sol";

/**
 * @title CrowdfundFactory
 * @dev Factory contract to deploy and track all CrowdfundCampaign instances
 */
contract CrowdfundFactory {
    // ─── State ──────────────────────────────────────────────────────────────

    address public owner;
    uint256 public platformFeePercent; // in basis points (300 = 3%)
    address payable public feeRecipient;

    address[] public campaigns;
    mapping(address => address[]) public creatorCampaigns;
    mapping(address => bool) public isCampaign;
    mapping(address => CampaignMeta) public campaignMeta;

    struct CampaignMeta {
        address creator;
        uint256 goal;
        uint256 deadline;
        string campaignId; // Off-chain MongoDB campaign ID
        uint256 createdAt;
        bool isActive;
    }

    // ─── Events ─────────────────────────────────────────────────────────────

    event CampaignCreated(
        address indexed campaign,
        address indexed creator,
        uint256 goal,
        uint256 deadline,
        string campaignId
    );

    event PlatformFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address newRecipient);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address payable _feeRecipient, uint256 _feePercent) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        platformFeePercent = _feePercent; // e.g., 300 for 3%
    }

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ─── Campaign Creation ───────────────────────────────────────────────────

    /**
     * @dev Deploy a new campaign contract
     * @param goal Fundraising goal in wei
     * @param deadline Campaign end timestamp
     * @param creator Campaign creator's wallet address
     * @param campaignId Off-chain campaign identifier (MongoDB ObjectId)
     * @param approvers Optional multi-sig approvers
     * @param requiredApprovals Required approval count for multi-sig
     */
    function createCampaign(
        uint256 goal,
        uint256 deadline,
        address payable creator,
        string calldata campaignId,
        address[] calldata approvers,
        uint256 requiredApprovals
    ) external returns (address) {
        require(goal > 0, "Goal must be positive");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(creator != address(0), "Invalid creator");

        CrowdfundCampaign campaign = new CrowdfundCampaign(
            goal,
            deadline,
            creator,
            approvers,
            requiredApprovals
        );

        address campaignAddress = address(campaign);

        campaigns.push(campaignAddress);
        creatorCampaigns[creator].push(campaignAddress);
        isCampaign[campaignAddress] = true;

        campaignMeta[campaignAddress] = CampaignMeta({
            creator: creator,
            goal: goal,
            deadline: deadline,
            campaignId: campaignId,
            createdAt: block.timestamp,
            isActive: true
        });

        emit CampaignCreated(campaignAddress, creator, goal, deadline, campaignId);

        return campaignAddress;
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    function getCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getCreatorCampaigns(address creator) external view returns (address[] memory) {
        return creatorCampaigns[creator];
    }

    function getCampaignsByPage(uint256 offset, uint256 limit)
        external view returns (address[] memory result)
    {
        uint256 total = campaigns.length;
        if (offset >= total) return new address[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = campaigns[i];
        }
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFeePercent = newFee;
        emit PlatformFeeUpdated(newFee);
    }

    function updateFeeRecipient(address payable newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // Prevent accidental ETH sends to factory
    receive() external payable {
        revert("Factory does not accept ETH");
    }
}
