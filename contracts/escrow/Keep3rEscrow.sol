// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import './Keep3rEscrowParameters.sol';
import './Keep3rEscrowLiquidityHandler.sol';
import './IKeep3rEscrow.sol';

contract Keep3rEscrow is Keep3rEscrowParameters, Keep3rEscrowLiquidityHandler, IKeep3rEscrow {
  constructor(address _keep3r) public Keep3rEscrowParameters(_keep3r) {}

  // Manager Liquidity Handler
  function deposit(address _liquidity, uint256 _amount) external override onlyGovernor {
    _deposit(_liquidity, _amount);
  }

  function withdraw(address _liquidity, uint256 _amount) external override onlyGovernor {
    _withdraw(_liquidity, _amount);
  }

  // Job Liquidity Handler
  function addLiquidityToJob(
    address _liquidity,
    address _job,
    uint256 _amount
  ) external override onlyGovernor {
    _addLiquidityToJob(_liquidity, _job, _amount);
  }

  function applyCreditToJob(
    address _provider,
    address _liquidity,
    address _job
  ) external override onlyGovernor {
    _applyCreditToJob(_provider, _liquidity, _job);
  }

  function unbondLiquidityFromJob(
    address _liquidity,
    address _job,
    uint256 _amount
  ) external override onlyGovernor {
    _unbondLiquidityFromJob(_liquidity, _job, _amount);
  }

  function removeLiquidityFromJob(address _liquidity, address _job) external override onlyGovernor {
    _removeLiquidityFromJob(_liquidity, _job);
  }

  function sendDust(
    address _to,
    address _token,
    uint256 _amount
  ) external override onlyGovernor {
    _safeSendDust(_to, _token, _amount);
  }
}
