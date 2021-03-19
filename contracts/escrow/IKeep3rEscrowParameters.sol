// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@lbertenasco/contract-utils/interfaces/abstract/IUtilsReady.sol';

interface IKeep3rEscrowParameters is IUtilsReady {
  function keep3r() external returns (address);
}
