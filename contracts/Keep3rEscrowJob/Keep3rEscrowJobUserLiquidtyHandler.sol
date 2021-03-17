// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import './Keep3rEscrowJobParameters.sol';

interface IKeep3rEscrowJobUserLiquidityHandler {
  event DepositedLiquidity(address indexed _user, address _lp, uint256 _amount);
  event WithdrewLiquidity(address indexed _user, address _lp, uint256 _amount);

  function userLiquidityTotalAmount(address _user, address _job) external view returns (uint256 _amount);

  function userLiquidityIdleAmount(address _user, address _job) external view returns (uint256 _amount);
}

abstract contract Keep3rEscrowJobUserLiquidityHandler is Keep3rEscrowJobParameters, IKeep3rEscrowJobUserLiquidityHandler {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // user => lp => amount
  mapping(address => mapping(address => uint256)) public override userLiquidityTotalAmount;
  // user => lp => amount
  mapping(address => mapping(address => uint256)) public override userLiquidityIdleAmount;

  function _depositLiquidity(address _lp, uint256 _amount) internal {
    IERC20(_lp).safeTransferFrom(msg.sender, address(this), _amount);
    _addLiquidity(msg.sender, _lp, _amount);
    emit DepositedLiquidity(msg.sender, _lp, _amount);
  }

  function _withdrawLiquidity(address _lp, uint256 _amount) internal {
    _subLiquidity(msg.sender, _lp, _amount);
    IERC20(_lp).safeTransfer(address(this), _amount);
    emit WithdrewLiquidity(msg.sender, _lp, _amount);
  }

  function _addLiquidity(
    address _user,
    address _lp,
    uint256 _amount
  ) internal {
    require(_user != address(0), 'Keep3rEscrowJob::zero-user');
    require(_amount > 0, 'Keep3rEscrowJob::amount-bigger-than-zero');
    userLiquidityTotalAmount[_user][_lp] = userLiquidityTotalAmount[_user][_lp].add(_amount);
    userLiquidityIdleAmount[_user][_lp] = userLiquidityIdleAmount[_user][_lp].add(_amount);
  }

  function _subLiquidity(
    address _user,
    address _lp,
    uint256 _amount
  ) internal {
    require(userLiquidityTotalAmount[_user][_lp] >= _amount, 'Keep3rEscrowJob::user-insufficient-balance');
    userLiquidityTotalAmount[_user][_lp] = userLiquidityTotalAmount[_user][_lp].sub(_amount);
    userLiquidityIdleAmount[_user][_lp] = userLiquidityIdleAmount[_user][_lp].sub(_amount);
  }
}
