// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';

interface IKeep3rLiquidityManagerJobsLiquidityHandler {
  function jobLiquidities(address _job, uint256 _index) external view returns (address _lp);

  function jobLiquidityIndex(address _job, address _lp) external view returns (uint256 _index);

  function jobLiquidityDesiredAmount(address _job, address _lp) external view returns (uint256 _amount);

  function getJobLiquidities(address _job) external view returns (address[] memory);

  function jobHasLP(address _job, address _lp) external view returns (bool);
}

abstract contract Keep3rLiquidityManagerJobsLiquidityHandler is IKeep3rLiquidityManagerJobsLiquidityHandler {
  using SafeMath for uint256;

  // job => lp[]
  mapping(address => address[]) public override jobLiquidities;
  // job => lp => uint256
  mapping(address => mapping(address => uint256)) public override jobLiquidityIndex;
  // job => lp => amount
  mapping(address => mapping(address => uint256)) public override jobLiquidityDesiredAmount;

  function getJobLiquidities(address _job) public view override returns (address[] memory) {
    return jobLiquidities[_job];
  }

  function jobHasLP(address _job, address _lp) public view override returns (bool) {
    return
      jobLiquidityIndex[_job][_lp] != 0 ||
      (jobLiquidityIndex[_job][_lp] == 0 && jobLiquidities[_job].length > 0 && jobLiquidities[_job][0] == _lp);
  }

  function _addLPToJob(address _job, address _lp) internal {
    if (jobHasLP(_job, _lp)) return;
    jobLiquidities[_job].push(_lp);
    jobLiquidityIndex[_job][_lp] = jobLiquidities[_job].length.sub(1);
  }

  function _removeLPFromJob(address _job, address _lp) internal {
    if (!jobHasLP(_job, _lp)) return;
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
