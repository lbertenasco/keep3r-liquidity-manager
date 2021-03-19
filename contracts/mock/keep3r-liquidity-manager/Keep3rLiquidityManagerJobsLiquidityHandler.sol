// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerJobsLiquidityHandler.sol';

contract Keep3rLiquidityManagerJobsLiquidityHandlerMock is Keep3rLiquidityManagerJobsLiquidityHandler {

  struct LiquidityIndex {
    address _lp;
    uint256 _index;
  }

  function addLPToJob(address _job, address _lp) public {
    _addLPToJob(_job, _lp);
  }

  function removeLPFromJob(address _job, address _lp) public {
    _removeLPFromJob(_job, _lp);
  }

  function getJobLiquidityIndexes(address _job) public view returns (LiquidityIndex[] memory) {
    LiquidityIndex[] memory _jobLiquidityIndexes = new LiquidityIndex[](jobLiquidities[_job].length);
    for(uint256 i = 0; i < jobLiquidities[_job].length; i++) {
      _jobLiquidityIndexes[i] = LiquidityIndex(
        jobLiquidities[_job][i], 
        jobLiquidityIndex[_job][jobLiquidities[_job][i]]
      );
    }
    return _jobLiquidityIndexes;
  }
}
