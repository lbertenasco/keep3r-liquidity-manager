// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import './Keep3rLiquidityManagerParameters.sol';

interface IKeep3rLiquidityManagerUserLiquidityHandler {
  event DepositedLiquidity(address indexed _depositor, address _recipient, address _lp, uint256 _amount);

  event WithdrewLiquidity(address indexed _withdrawer, address _recipient, address _lp, uint256 _amount);

  function liquidityTotalAmount(address _liquidity) external view returns (uint256 _amount);

  function userLiquidityTotalAmount(address _user, address _job) external view returns (uint256 _amount);

  function userLiquidityIdleAmount(address _user, address _job) external view returns (uint256 _amount);

  function depositLiquidity(address _lp, uint256 _amount) external;

  function depositLiquidityTo(
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) external;

  function withdrawLiquidity(address _lp, uint256 _amount) external;

  function withdrawLiquidityTo(
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) external;
}

abstract contract Keep3rLiquidityManagerUserLiquidityHandler is Keep3rLiquidityManagerParameters, IKeep3rLiquidityManagerUserLiquidityHandler {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // lp => amount (helps safely collect extra dust)
  mapping(address => uint256) public override liquidityTotalAmount;
  // user => lp => amount
  mapping(address => mapping(address => uint256)) public override userLiquidityTotalAmount;
  // user => lp => amount
  mapping(address => mapping(address => uint256)) public override userLiquidityIdleAmount;

  function _depositLiquidity(
    address _liquidityDepositor,
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) internal {
    IERC20(_lp).safeTransferFrom(_liquidityDepositor, address(this), _amount);
    _addLiquidity(_liquidityRecipient, _lp, _amount);
    emit DepositedLiquidity(_liquidityDepositor, _liquidityRecipient, _lp, _amount);
  }

  function _withdrawLiquidity(
    address _liquidityWithdrawer,
    address _liquidityRecipient,
    address _lp,
    uint256 _amount
  ) internal {
    require(userLiquidityIdleAmount[_liquidityWithdrawer][_lp] >= _amount, 'Keep3rLiquidityManager::user-insufficient-idle-balance');
    _subLiquidity(_liquidityWithdrawer, _lp, _amount);
    IERC20(_lp).safeTransfer(_liquidityRecipient, _amount);
    emit WithdrewLiquidity(_liquidityWithdrawer, _liquidityRecipient, _lp, _amount);
  }

  function _addLiquidity(
    address _user,
    address _lp,
    uint256 _amount
  ) internal {
    require(_user != address(0), 'Keep3rLiquidityManager::zero-user');
    require(_amount > 0, 'Keep3rLiquidityManager::amount-bigger-than-zero');
    liquidityTotalAmount[_lp] = liquidityTotalAmount[_lp].add(_amount);
    userLiquidityTotalAmount[_user][_lp] = userLiquidityTotalAmount[_user][_lp].add(_amount);
    userLiquidityIdleAmount[_user][_lp] = userLiquidityIdleAmount[_user][_lp].add(_amount);
  }

  function _subLiquidity(
    address _user,
    address _lp,
    uint256 _amount
  ) internal {
    require(userLiquidityTotalAmount[_user][_lp] >= _amount, 'Keep3rLiquidityManager::amount-bigger-than-total');
    liquidityTotalAmount[_lp] = liquidityTotalAmount[_lp].sub(_amount);
    userLiquidityTotalAmount[_user][_lp] = userLiquidityTotalAmount[_user][_lp].sub(_amount);
    userLiquidityIdleAmount[_user][_lp] = userLiquidityIdleAmount[_user][_lp].sub(_amount);
  }
}
