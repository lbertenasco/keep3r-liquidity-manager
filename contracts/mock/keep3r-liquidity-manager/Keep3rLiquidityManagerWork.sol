// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';

import './Keep3rLiquidityManagerUserJobsLiquidityHandler.sol';
import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerWork.sol';

contract Keep3rLiquidityManagerWorkMock is Keep3rLiquidityManagerUserJobsLiquidityHandlerMock, Keep3rLiquidityManagerWork {
  using SafeMath for uint256;
  
  constructor(
    address _keep3rV1,
    address _escrow1,
    address _escrow2
  ) public 
    Keep3rLiquidityManagerUserJobsLiquidityHandlerMock(_keep3rV1, _escrow1, _escrow2) {}

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
}
