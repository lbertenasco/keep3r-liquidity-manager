// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IKeep3rEscrowLiquidityHandler {
  event LiquidityAddedToJob(address _liquidity, address _job, uint256 _amount);
  event AppliedCreditToJob(address _provider, address _liquidity, address _job);
  event LiquidityUnbondedFromJob(address _liquidity, address _job, uint256 _amount);
  event LiquidityRemovedFromJob(address _liquidity, address _job);

  function liquidityTotalAmount(address _liquidity) external returns (uint256 _amount);

  function addLiquidityToJob(
    address _liquidity,
    address _job,
    uint256 _amount
  ) external;

  function applyCreditToJob(
    address _provider,
    address _liquidity,
    address _job
  ) external;

  function unbondLiquidityFromJob(
    address _liquidity,
    address _job,
    uint256 _amount
  ) external;

  function removeLiquidityFromJob(address _liquidity, address _job) external;

  function transferLiquidityFromGovernor(address _liquidity, uint256 _amount) external;

  function approveLiquidityToGovernor(address _liquidity, uint256 _amount) external;
}
