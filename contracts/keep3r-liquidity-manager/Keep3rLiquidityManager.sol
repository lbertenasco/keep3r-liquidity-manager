// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@lbertenasco/contract-utils/contracts/abstract/UtilsReady.sol';

import './Keep3rLiquidityManagerWork.sol';
import './Keep3rLiquidityManagerJobHandler.sol';

// TODO: Should not be abstract
abstract contract Keep3rLiquidityManager is UtilsReady, Keep3rLiquidityManagerWork, Keep3rLiquidityManagerJobHandler {
  constructor(
    address _keep3rV1,
    address _escrow1,
    address _escrow2
  ) public UtilsReady() Keep3rLiquidityManagerParameters(_keep3rV1) Keep3rLiquidityManagerEscrowsHandler(_escrow1, _escrow2) {}

  // Keep3rLiquidityManagerWork
  function work(address _job) external override onlyJob {
    (address _escrow, Actions _action) = getNextAction(_job);
    require(_workable(_action), 'Keep3rLiquidityManager::work:not-workable');

    _work(_escrow, _action, _job);

    emit Worked(_job);
  }

  function forceWork(address _job) external override onlyGovernor {
    (address _escrow, Actions _action) = getNextAction(_job);
    _work(_escrow, _action, _job);
    emit ForceWorked(_job);
  }

  function setJob(address _job) external override onlyGovernor {
    _setJob(_job);
  }

  // Collectable Dust
  function sendDust(
    address _to,
    address _token,
    uint256 _amount
  ) external override onlyGovernor {
    // TODO Protect _liquidity tokens with liquidityTotalAmount[_liquidity]
    // TODO Add liquidityIdleTotalAmount[_liquidity]
    /*
      uinst256 _idleBalance = IERC20(_token).balanceOf(address(this));
      require(amount <= liquidityIdleTotalAmount[_liquidity].sub(_idleBalance), 'amount-greater-than-extra-idle-liquidity');
      _sendDust(_to, _token, _amount);
       */
  }

  function sendDustOnEscrow(
    address _escrow,
    address _to,
    address _token,
    uint256 _amount
  ) external override onlyGovernor {
    _sendDustOnEscrow(_escrow, _to, _token, _amount);
  }
}
