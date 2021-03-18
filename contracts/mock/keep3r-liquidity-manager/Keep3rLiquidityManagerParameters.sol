// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '../../keep3r-liquidity-manager/Keep3rLiquidityManagerParameters.sol';

contract Keep3rLiquidityManagerParametersMock is Keep3rLiquidityManagerParameters {

  constructor(address _keep3rV1) public Keep3rLiquidityManagerParameters(_keep3rV1) { }

  function setKeep3rV1(address _keep3rV1) public {
    _setKeep3rV1(_keep3rV1);
  }

}
