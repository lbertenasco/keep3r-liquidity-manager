// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "../../escrow/Keep3rEscrowParameters.sol";

contract Keep3rEscrowParametersMock is Keep3rEscrowParameters {
    constructor(
        address _governance,
        IKeep3rV1 _keep3r
    ) public Keep3rEscrowParameters(_governance, _keep3r) { }

    function setGovernance(address _governance) public override {
        _setGovernance(_governance);
    }

    function setKeep3rV1(IKeep3rV1 _keep3rV1) public override {
        _setKeep3rV1(_keep3rV1);
    }
}
