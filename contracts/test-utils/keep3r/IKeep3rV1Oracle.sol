// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

interface IKeep3rV1Oracle {
  function updatePair(address pair) external returns (bool);
}
