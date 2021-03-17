// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './Keep3rEscrowJobWork.sol';

abstract contract Keep3rEscrowJob is Keep3rEscrowJobWork {
  constructor(
    address _keep3rV1,
    address _escrow1,
    address _escrow2
  ) public Keep3rEscrowJobParameters(_keep3rV1) Keep3rEscrowJobEscrowsHandler(_escrow1, _escrow2) {}

  // Keep3rEscrowJobUserLiquidityHandler
  function depositLiquidity(address _lp, uint256 _amount) public override {
    depositLiquidityTo(msg.sender, _lp, _amount);
  }

  function depositLiquidityTo(
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) public override {
    _depositLiquidity(msg.sender, _liquidityRecipient, _lp, _amount);
  }

  function withdrawLiquidity(address _lp, uint256 _amount) public override {
    withdrawLiquidityTo(msg.sender, _lp, _amount);
  }

  function withdrawLiquidityTo(
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) public override {
    _withdrawLiquidity(msg.sender, _liquidityRecipient, _lp, _amount);
  }

  // Keep3rEscrowJobWork

  function work(address _job) external override {
    // TODO: Logic
  }

  function forceWork(address _job) external override {
    // TODO: Only governance
    // TODO: Logic
  }
}
