// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';

import './Keep3rLiquidityManagerEscrowsHandler.sol';
import './Keep3rLiquidityManagerUserLiquidityHandler.sol';
import './Keep3rLiquidityManagerJobsLiquidityHandler.sol';
import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerUserJobsLiquidityHandler.sol';

contract Keep3rLiquidityManagerUserJobsLiquidityHandlerMock is 
  Keep3rLiquidityManagerEscrowsHandlerMock,
  Keep3rLiquidityManagerJobsLiquidityHandlerMock,
  Keep3rLiquidityManagerUserLiquidityHandlerMock,
  Keep3rLiquidityManagerUserJobsLiquidityHandler {
  using SafeMath for uint256;
  
  constructor(address _keep3rV1, address _escrow1, address _escrow2) public
    Keep3rLiquidityManagerUserLiquidityHandlerMock(_keep3rV1) 
    Keep3rLiquidityManagerJobsLiquidityHandlerMock()
    Keep3rLiquidityManagerEscrowsHandlerMock(_escrow1, _escrow2) { }

  function setMinAmount(address _liquidity, uint256 _minAmount) public override {
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

  function subLiquidityOfUserFromJob(
    address _user,
    address _lp,
    address _job,
    uint256 _amount
  ) internal {
    _subLiquidityOfUserFromJob(_user, _job, _lp, _amount);
  }
}
