// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/utils/EnumerableSet.sol';

contract FakeKeep3rV1 {
  using EnumerableSet for EnumerableSet.AddressSet;
  EnumerableSet.AddressSet internal _jobs;
  EnumerableSet.AddressSet internal _liquidities;

  function addJob(address _job) public {
    _jobs.add(_job);
  }

  function addLiquidity(address _liquidity) public {
    _liquidities.add(_liquidity);
  }

  function jobs(address _job) public returns (bool) {
    return _jobs.contains(_job);
  }

  function liquidityAccepted(address _liquidity) public returns (bool) {
    return _liquidities.contains(_liquidity);
  }
}