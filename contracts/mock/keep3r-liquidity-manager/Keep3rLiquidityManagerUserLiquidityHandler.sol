// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerUserLiquidityHandler.sol';
import './Keep3rLiquidityManagerParameters.sol';


contract Keep3rLiquidityManagerUserLiquidityHandlerMock is 
  Keep3rLiquidityManagerParameters, 
  Keep3rLiquidityManagerUserLiquidityHandler {

  constructor(address _keep3rV1) public Keep3rLiquidityManagerParameters(_keep3rV1) { }

  function internalDepositLiquidity(
    address _liquidityDepositor,
    address _liquidityRecipient,
    address _liquidity,
    uint256 _amount
  ) public {
    _depositLiquidity(_liquidityDepositor, _liquidityRecipient, _liquidity, _amount);
  }

  function internalWithdrawLiquidity(
    address _liquidityWithdrawer,
    address _liquidityRecipient,
    address _liquidity,
    uint256 _amount
  ) public {
    _withdrawLiquidity(_liquidityWithdrawer, _liquidityRecipient, _liquidity, _amount);
  }

  function addLiquidity(
    address _user,
    address _liquidity,
    uint256 _amount
  ) public {
    _addLiquidity(_user, _liquidity, _amount); 
  }

  function subLiquidity(
    address _user,
    address _liquidity,
    uint256 _amount
  ) public {
    _subLiquidity(_user, _liquidity, _amount);
  }

  function setLiquidityTotalAmount(
    address _liquidity,
    uint256 _amount
  ) public {
    liquidityTotalAmount[_liquidity] = _amount;
  }

  function setUserLiquidityTotalAmount(
    address _user,
    address _liquidity,
    uint256 _amount
  ) public {
    userLiquidityTotalAmount[_user][_liquidity] = _amount;
  }

  function setUserLiquidityIdleAmount(
    address _user,
    address _liquidity,
    uint256 _amount
  ) public {
    userLiquidityIdleAmount[_user][_liquidity] = _amount;
  }

  function setLiquidityFee(uint256 _liquidityFee) external override {
    _setLiquidityFee(_liquidityFee);
  }
  
  function setFeeReceiver(address _feeReceiver) external override {
    _setFeeReceiver(_feeReceiver);
  }
}
