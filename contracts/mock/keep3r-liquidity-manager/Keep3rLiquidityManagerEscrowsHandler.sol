// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerEscrowsHandler.sol';

contract Keep3rLiquidityManagerEscrowsHandlerMock is Keep3rLiquidityManagerEscrowsHandler {

  constructor(address _escrow1, address _escrow2) 
    public 
    Keep3rLiquidityManagerEscrowsHandler(_escrow1, _escrow2) { }

  function assertIsValidEscrow(address _escrow) public _assertIsValidEscrow(_escrow) { }

  function setEscrow1(address _escrow1) public {
    _setEscrow1(_escrow1);
  }

  function setEscrow2(address _escrow2) public {
    _setEscrow2(_escrow2);
  }

  function addLiquidityToJob(
    address _escrow,
    address _liquidity,
    address _job,
    uint256 _amount
  ) public override {
    IKeep3rEscrow(_escrow).addLiquidityToJob(_liquidity, _job, _amount);
  }

  function applyCreditToJob(
    address _escrow,
    address _liquidity,
    address _job
  ) public override {
    IKeep3rEscrow(_escrow).applyCreditToJob(address(_escrow), _liquidity, _job);
  }

  function unbondLiquidityFromJob(
    address _escrow,
    address _liquidity,
    address _job,
    uint256 _amount
  ) public override {
    IKeep3rEscrow(_escrow).unbondLiquidityFromJob(_liquidity, _job, _amount);
  }

  function removeLiquidityFromJob(
    address _escrow,
    address _liquidity,
    address _job
  ) public override {
    IKeep3rEscrow(_escrow).removeLiquidityFromJob(_liquidity, _job);
  }

  function returnLPsToGovernance(address _escrow) public override {
    IKeep3rEscrow(_escrow).returnLPsToGovernance();
  }

  function setPendingGovernorOnEscrow(address _escrow, address _pendingGovernor) public override {
    IKeep3rEscrow(_escrow).setPendingGovernor(_pendingGovernor);
  }

  function acceptGovernorOnEscrow(address _escrow) public override {
    IKeep3rEscrow(_escrow).acceptGovernor();
  }

  function sendDustOnEscrow(
    address _escrow,
    address _to,
    address _token,
    uint256 _amount
  ) public override {
    IKeep3rEscrow(_escrow).sendDust(_to, _token, _amount);
  }
}
