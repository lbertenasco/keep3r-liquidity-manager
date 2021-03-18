// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerJobsLiquidityHandler.sol';

contract Keep3rLiquidityManagerJobsLiquidityHandlerMock is Keep3rLiquidityManagerJobsLiquidityHandler {
  function addLPToJob(address _lp, address _job) public {
    _addLPToJob(_lp, _job);
  }

  function removeLPFromJob(address _lp, address _job) public {
    _removeLPFromJob(_lp, _job);
  }
}
