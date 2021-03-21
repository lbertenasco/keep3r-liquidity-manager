// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';

import './Keep3rLiquidityManagerParameters.sol';
import './Keep3rLiquidityManagerEscrowsHandler.sol';
import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerUserJobsLiquidityHandler.sol';
import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerWork.sol';

contract Keep3rLiquidityManagerWorkMock is Keep3rLiquidityManagerWork {
  using SafeMath for uint256;
  
  constructor(
    address _keep3rV1,
    address _escrow1,
    address _escrow2
  ) public Keep3rLiquidityManagerWork(_keep3rV1, _escrow1, _escrow2) {}

  // UserLiquidityHandler
  function setLiquidityFee(uint256 _liquidityFee) external override {
    _setLiquidityFee(_liquidityFee);
  }
  function setFeeReceiver(address _feeReceiver) external override {
    _setFeeReceiver(_feeReceiver);
  }
  function setMinAmount(address _liquidity, uint256 _minAmount) external override {
    _setMinAmount(_liquidity, _minAmount);
  }

  function setLiquidityToJobOfUser(
    address _user,
    address _job,
    address _lp,
    uint256 _amount
  ) public {
    _setLiquidityToJobOfUser(_user, _job, _lp, _amount);
  }

  function removeIdleLiquidityOfUserFromJob(
    address _user,
    address _job,
    address _lp,
    uint256 _amount
  ) public {
    _removeIdleLiquidityOfUserFromJob(_user, _job, _lp, _amount);
  }

  function addLiquidityOfUserToJob(
    address _user,
    address _lp,
    address _job,
    uint256 _amount
  ) internal {
    _addLiquidityOfUserToJob(_user, _job, _lp, _amount);
  }

  function reduceLiquidityOfUserFromJob(
    address _user,
    address _lp,
    address _job,
    uint256 _amount
  ) internal {
    _reduceLiquidityOfUserFromJob(_user, _job, _lp, _amount);
  }

  // Keep3rLiquidityManagerWork
  function work(address _job) external override {
    (address _escrow, Actions _action) = getNextAction(_job);
    require(_workable(_action), 'Keep3rLiquidityManager::work:not-workable');

    _work(_escrow, _action, _job);

    emit Worked(_job);
  }

  function forceWork(address _job) external override {
    (address _escrow, Actions _action) = getNextAction(_job);
    _work(_escrow, _action, _job);
    emit ForceWorked(_job);
  }


  // Escrow Liquidity
  function addLiquidityToJob(
    address _escrow,
    address _liquidity,
    address _job,
    uint256 _amount
  ) external override {
    _addLiquidityToJob(_escrow, _liquidity, _job, _amount);
  }

  function applyCreditToJob(
    address _escrow,
    address _liquidity,
    address _job
  ) external override {
    _applyCreditToJob(_escrow, _liquidity, _job);
  }

  function unbondLiquidityFromJob(
    address _escrow,
    address _liquidity,
    address _job,
    uint256 _amount
  ) external override {
    _unbondLiquidityFromJob(_escrow, _liquidity, _job, _amount);
  }

  function removeLiquidityFromJob(
    address _escrow,
    address _liquidity,
    address _job
  ) external override returns (uint256 _amount)  {
    return _removeLiquidityFromJob(_escrow, _liquidity, _job);
  }

  // Escrow Governor
  function setPendingGovernorOnEscrow(address _escrow, address _pendingGovernor) external override {
    _setPendingGovernorOnEscrow(_escrow, _pendingGovernor);
  }

  function acceptGovernorOnEscrow(address _escrow) external override {
    _acceptGovernorOnEscrow(_escrow);
  }

  function sendDustOnEscrow(
    address _escrow,
    address _to,
    address _token,
    uint256 _amount
  ) external override {
    _sendDustOnEscrow(_escrow, _to, _token, _amount);
  }

}
