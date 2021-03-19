// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import '@lbertenasco/contract-utils/interfaces/keep3r/IKeep3rV1.sol';

import './IKeep3rEscrowLiquidityHandler.sol';
import './Keep3rEscrowParameters.sol';

abstract contract Keep3rEscrowLiquidityHandler is Keep3rEscrowParameters, IKeep3rEscrowLiquidityHandler {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  mapping(address => uint256) public override liquidityTotalAmount;
  mapping(address => uint256) public override liquidityProvidedAmount;

  // Handler Liquidity Handler
  function _deposit(address _liquidity, uint256 _amount) internal {
    liquidityTotalAmount[_liquidity] = liquidityTotalAmount[_liquidity].add(_amount);
    IERC20(_liquidity).safeTransferFrom(governor, address(this), _amount);
  }

  function _withdraw(address _liquidity, uint256 _amount) internal {
    liquidityTotalAmount[_liquidity] = liquidityTotalAmount[_liquidity].sub(_amount);
    IERC20(_liquidity).safeTransfer(governor, _amount);
  }

  // Job Liquidity Handler
  function _addLiquidityToJob(
    address _liquidity,
    address _job,
    uint256 _amount
  ) internal {
    // Set infinite approval once per liquidity?
    IERC20(_liquidity).approve(keep3r, _amount);
    IKeep3rV1(keep3r).addLiquidityToJob(_liquidity, _job, _amount);
    liquidityProvidedAmount[_liquidity] = liquidityProvidedAmount[_liquidity].add(_amount);
  }

  function _applyCreditToJob(
    address _provider,
    address _liquidity,
    address _job
  ) internal {
    IKeep3rV1(keep3r).applyCreditToJob(_provider, _liquidity, _job);
    emit AppliedCreditToJob(_provider, _liquidity, _job);
  }

  function _unbondLiquidityFromJob(
    address _liquidity,
    address _job,
    uint256 _amount
  ) internal {
    IKeep3rV1(keep3r).unbondLiquidityFromJob(_liquidity, _job, _amount);
  }

  function _removeLiquidityFromJob(address _liquidity, address _job) internal {
    uint256 _before = IERC20(_liquidity).balanceOf(address(this));
    IKeep3rV1(keep3r).removeLiquidityFromJob(_liquidity, _job);
    uint256 _amount = IERC20(_liquidity).balanceOf(address(this)).sub(_before);
    liquidityProvidedAmount[_liquidity] = liquidityProvidedAmount[_liquidity].sub(_amount);
  }

  // Collectable Dust
  function _safeSendDust(
    address _to,
    address _token,
    uint256 _amount
  ) internal {
    if (liquidityTotalAmount[_token] > 0) {
      uint256 _balance = IERC20(_token).balanceOf(address(this));
      uint256 _provided = liquidityProvidedAmount[_token];
      require(_amount <= _balance.add(_provided).sub(liquidityTotalAmount[_token]));
    }
    _sendDust(_to, _token, _amount);
  }
}
