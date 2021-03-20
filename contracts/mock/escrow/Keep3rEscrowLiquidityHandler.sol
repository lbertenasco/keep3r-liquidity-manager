// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '../../escrow/Keep3rEscrowLiquidityHandler.sol';
import './Keep3rEscrowParameters.sol';

contract Keep3rEscrowLiquidityHandlerMock is Keep3rEscrowLiquidityHandler, Keep3rEscrowParametersMock {

    constructor(
        address _keep3r
    ) public Keep3rEscrowParametersMock(_keep3r) { }

    function deposit(address _liquidity, uint256 _amount) external override {
        _deposit(_liquidity, _amount);
    }

    function withdraw(address _liquidity, uint256 _amount) external override {
        _withdraw(_liquidity, _amount);
    }

    function addLiquidityToJob(
        address _liquidity,
        address _job,
        uint256 _amount
    ) public override {
        _addLiquidityToJob(_liquidity, _job, _amount);
    }

    function applyCreditToJob(
        address _provider,
        address _liquidity,
        address _job
    ) public override {
        _applyCreditToJob(_provider, _liquidity, _job);
    }

    function removeLiquidityFromJob(address _liquidity, address _job) public override returns (uint256 _amount) {
        return _removeLiquidityFromJob(_liquidity, _job);
    }

    function unbondLiquidityFromJob(
        address _liquidity,
        address _job,
        uint256 _amount
    ) public override {
        _unbondLiquidityFromJob(_liquidity, _job, _amount);
    }
}
