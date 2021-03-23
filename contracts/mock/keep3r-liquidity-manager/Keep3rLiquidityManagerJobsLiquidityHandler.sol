// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerJobsLiquidityHandler.sol';

contract Keep3rLiquidityManagerJobsLiquidityHandlerMock is Keep3rLiquidityManagerJobsLiquidityHandler {

  struct LiquidityIndex {
    address _lp;
    uint256 _index;
  }

  function addJob(address _job) public {
    _addJob(_job);
  }
  
  function removeJob(address _job) public {
    _removeJob(_job);
  }

  function addLPToJob(address _job, address _lp) public {
    _addLPToJob(_job, _lp);
  }

  function removeLPFromJob(address _job, address _lp) public {
    _removeLPFromJob(_job, _lp);
  }
}
