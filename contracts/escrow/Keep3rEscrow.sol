// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import './Keep3rEscrowParameters.sol';
import './Keep3rEscrowLiquidityHandler.sol';

interface IKeep3rEscrow is IKeep3rEscrowParameters, IKeep3rEscrowLiquidityHandler {}

contract Keep3rEscrow is Keep3rEscrowParameters, Keep3rEscrowLiquidityHandler, IKeep3rEscrow {
  constructor(address _keep3r) public Keep3rEscrowParameters(_keep3r) {}

  // Manager Liquidity Handler
  function transferLiquidityFromGovernor(address _liquidity, uint256 _amount) external override onlyGovernor {
    _transferLiquidityFromGovernor(_liquidity, _amount);
  }

  function approveLiquidityToGovernor(address _liquidity, uint256 _amount) external override onlyGovernor {
    _approveLiquidityToGovernor(_liquidity, _amount);
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
}
