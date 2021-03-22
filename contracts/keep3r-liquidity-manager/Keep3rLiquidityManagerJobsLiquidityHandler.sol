// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';

interface IKeep3rLiquidityManagerJobsLiquidityHandler {
  function jobLiquidities(address _job, uint256 _index) external view returns (address _liquidity);

  function jobLiquidityIndex(address _job, address _liquidity) external view returns (uint256 _index);

  function jobLiquidityDesiredAmount(address _job, address _liquidity) external view returns (uint256 _amount);

  function jobLiquidityEscrowAmount(
    address _job,
    address _liquidity,
    address _escrow
  ) external view returns (uint256 _amount);

  function getJobLiquidities(address _job) external view returns (address[] memory);

  function jobHasLiquidity(address _job, address _liquidity) external view returns (bool);
}

abstract contract Keep3rLiquidityManagerJobsLiquidityHandler is IKeep3rLiquidityManagerJobsLiquidityHandler {
  using SafeMath for uint256;

  // job => lp[]
  mapping(address => address[]) public override jobLiquidities;
  // job => lp => index
  mapping(address => mapping(address => uint256)) public override jobLiquidityIndex;
  // job => lp => amount
  mapping(address => mapping(address => uint256)) public override jobLiquidityDesiredAmount;
  // job => lp => escrow => amount
  mapping(address => mapping(address => mapping(address => uint256))) public override jobLiquidityEscrowAmount;

  function getJobLiquidities(address _job) public view override returns (address[] memory) {
    return jobLiquidities[_job];
  }

  function jobHasLiquidity(address _job, address _liquidity) public view override returns (bool) {
    return
      jobLiquidityIndex[_job][_liquidity] != 0 ||
      // TODO Rework?: This complex check can be avoided by using index as length.
      (jobLiquidityIndex[_job][_liquidity] == 0 && jobLiquidities[_job].length > 0 && jobLiquidities[_job][0] == _liquidity);
  }

  function _addLPToJob(address _job, address _liquidity) internal {
    if (jobHasLiquidity(_job, _liquidity)) return;
    jobLiquidities[_job].push(_liquidity);
    jobLiquidityIndex[_job][_liquidity] = jobLiquidities[_job].length.sub(1);
  }

  function _removeLPFromJob(address _job, address _liquidity) internal {
    if (!jobHasLiquidity(_job, _liquidity)) return;
    uint256 _index = jobLiquidityIndex[_job][_liquidity];
    uint256 _lastIndex = jobLiquidities[_job].length.sub(1);
    if (_index < _lastIndex) {
      jobLiquidities[_job][_index] = jobLiquidities[_job][_lastIndex];
      jobLiquidityIndex[_job][jobLiquidities[_job][_index]] = _index;
    }
    delete jobLiquidityIndex[_job][_liquidity];
    jobLiquidities[_job].pop();
  }
}
