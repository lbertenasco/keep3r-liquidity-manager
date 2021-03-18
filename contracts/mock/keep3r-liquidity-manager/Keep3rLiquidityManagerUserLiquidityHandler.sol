// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerUserLiquidityHandler.sol';
import './Keep3rLiquidityManagerParameters.sol';


contract Keep3rLiquidityManagerUserLiquidityHandlerMock is 
  Keep3rLiquidityManagerUserLiquidityHandler, 
  Keep3rLiquidityManagerParametersMock {

  constructor(address _keep3rV1) public Keep3rLiquidityManagerParametersMock(_keep3rV1) { }

  function internalDepositLiquidity(
    address _liquidityDepositor,
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) public {
    _depositLiquidity(_liquidityDepositor, _liquidityRecipient, _lp, _amount);
  }

  function internalWithdrawLiquidity(
    address _liquidityWithdrawer,
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) public {
    _withdrawLiquidity(_liquidityWithdrawer, _liquidityRecipient, _lp, _amount);
  }

  function addLiquidity(
    address _user,
    address _lp,
    uint256 _amount
  ) public {
    _addLiquidity(_user, _lp, _amount); 
  }

  function subLiquidity(
    address _user,
    address _lp,
    uint256 _amount
  ) public {
    _subLiquidity(_user, _lp, _amount);
  }
}
