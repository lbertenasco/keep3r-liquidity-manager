// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../escrow/Keep3rEscrowParameters.sol";

contract Keep3rEscrowParametersMock is Keep3rEscrowParameters {
    constructor(
        address _keep3r
    ) public Keep3rEscrowParameters(_keep3r) { }

   
}
