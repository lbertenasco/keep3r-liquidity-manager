// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import './IKeep3rEscrowParameters.sol';
import './IKeep3rEscrowLiquidityHandler.sol';

interface IKeep3rEscrow is IKeep3rEscrowParameters, IKeep3rEscrowLiquidityHandler {}
