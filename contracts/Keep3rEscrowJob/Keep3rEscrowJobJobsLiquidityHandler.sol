// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

interface IKeep3rEscrowJobJobsLiquidityHandler {
  function jobLiquidities(address _job, uint256 _index) external view returns (address _liquidity);

  function jobLiquidityIndex(address _job, address _liquidity) external view returns (uint256 _index);

  function jobLiquidityDesiredAmount(address _job, address _liquidity) external view returns (uint256 _amount);
}

abstract contract Keep3rEscrowJobJobsLiquidityHandler is IKeep3rEscrowJobJobsLiquidityHandler {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // job => lp[]
  mapping(address => address[]) public override jobLiquidities;
  // job => lp => uint256
  mapping(address => mapping(address => uint256)) public override jobLiquidityIndex;
  // job => lp => amount
  mapping(address => mapping(address => uint256)) public override jobLiquidityDesiredAmount;

  function _addLPToJob(address _lp, address _job) internal {
    jobLiquidities[_lp].push(_job);
    jobLiquidityIndex[_job][_lp] = jobLiquidities[_job].length;
  }

  function _removeLPFromJob(address _lp, address _job) internal {
    uint256 _index = jobLiquidityIndex[_job][_lp];
    uint256 _lastIndex = jobLiquidities[_job].length.sub(1);
    if (_index < _lastIndex) {
      jobLiquidities[_job][_index] = jobLiquidities[_job][_lastIndex];
      jobLiquidityIndex[_job][jobLiquidities[_job][_index]] = _index;
    }
    delete jobLiquidityIndex[_job][_lp];
    jobLiquidities[_job].pop();
  }
}
