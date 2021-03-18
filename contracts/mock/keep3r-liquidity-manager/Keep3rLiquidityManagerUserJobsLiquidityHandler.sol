// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';

import './Keep3rLiquidityManagerParameters.sol';
import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerUserJobsLiquidityHandler.sol';

contract Keep3rLiquidityManagerUserJobsLiquidityHandlerMock is Keep3rLiquidityManagerUserJobsLiquidityHandler, Keep3rLiquidityManagerParametersMock
{
  using SafeMath for uint256;
  
  constructor(address _keep3rV1) public Keep3rLiquidityManagerParametersMock(_keep3rV1) { }

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
}
