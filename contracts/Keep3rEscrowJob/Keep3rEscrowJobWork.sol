// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../interfaces/IKeep3rEscrow.sol';

import './Keep3rEscrowJobEscrowsHandler.sol';
import './Keep3rEscrowJobUserJobsHandler.sol';
import './Keep3rEscrowJobLiquidityHandler.sol';

interface IKeep3rEscrowJobWork {
  enum Actions { None, AddLiquidityToJob, ApplyCreditToJob, RemoveLiquidityFromJob }

  // Actions by Keeper
  event Worked(address indexed _job);
  // Actions forced by governor
  event ForceWorked(address indexed _job);

  function getNextAction(address _job) external view returns (address _escrow, Actions _action);

  function workable(address _job) external view returns (bool);

  function work(address _job) external;

  function forceWork(address _job) external;
}

abstract contract Keep3rEscrowJobWork is
  Keep3rEscrowJobEscrowsHandler,
  Keep3rEscrowJobUserJobsHandler,
  Keep3rEscrowJobLiquidityHandler,
  IKeep3rEscrowJobWork
{
  // Since all liquidity behaves the same, we just need to check one of them
  function getNextAction(address _job) public view override returns (address _escrow, Actions _action) {
    require(jobLiquidities[_job].length > 0, 'Keep3rEscrowJob::getNextAction:job-has-no-liquidity');
    address _liquidity = jobLiquidities[_job][0];

    uint256 liquidityProvided1 = keep3rV1.liquidityProvided(address(escrow1), _liquidity, _job);
    uint256 liquidityProvided2 = keep3rV1.liquidityProvided(address(escrow2), _liquidity, _job);
    if (liquidityProvided1 == 0 && liquidityProvided2 == 0) {
      // Only start if both escrow have liquidity
      require(IERC20(_liquidity).balanceOf(address(escrow1)) > 0, 'Keep3rEscrowJob::getNextAction:escrow1-liquidity-is-0');
      require(IERC20(_liquidity).balanceOf(address(escrow2)) > 0, 'Keep3rEscrowJob::getNextAction:escrow2-liquidity-is-0');

      // Start by _addLiquidityToJob liquidity with escrow1 as default
      return (escrow1, Actions.AddLiquidityToJob);
    }

    // The escrow with liquidityAmount is the one to call applyCreditToJob, the other should call unbondLiquidityFromJob
    if (
      keep3rV1.liquidityAmount(address(escrow1), _liquidity, _job) > 0 &&
      keep3rV1.liquidityApplied(address(escrow1), _liquidity, _job) < block.timestamp
    ) {
      return (escrow1, Actions.ApplyCreditToJob);
    }

    if (
      keep3rV1.liquidityAmount(address(escrow2), _liquidity, _job) > 0 &&
      keep3rV1.liquidityApplied(address(escrow2), _liquidity, _job) < block.timestamp
    ) {
      return (escrow2, Actions.ApplyCreditToJob);
    }

    // Check if we can _removeLiquidityFromJob & instantly _addLiquidityToJob
    uint256 liquidityAmountsUnbonding1 = keep3rV1.liquidityAmountsUnbonding(address(escrow1), _liquidity, _job);
    uint256 liquidityUnbonding1 = keep3rV1.liquidityUnbonding(address(escrow1), _liquidity, _job);
    if (liquidityAmountsUnbonding1 > 0 && liquidityUnbonding1 < block.timestamp) {
      return (escrow1, Actions.RemoveLiquidityFromJob);
    }

    uint256 liquidityAmountsUnbonding2 = keep3rV1.liquidityAmountsUnbonding(address(escrow2), _liquidity, _job);
    uint256 liquidityUnbonding2 = keep3rV1.liquidityUnbonding(address(escrow2), _liquidity, _job);
    if (liquidityAmountsUnbonding2 > 0 && liquidityUnbonding2 < block.timestamp) {
      return (escrow2, Actions.RemoveLiquidityFromJob);
    }

    return (address(0), Actions.None);
  }

  // Keep3r actions
  function workable(address _job) public view override returns (bool) {
    (, Actions _action) = getNextAction(_job);
    return _action != Actions.None;
  }

  function _work(
    address _escrow,
    Actions _action,
    address _job
  ) internal {
    address _liquidity = jobLiquidities[_job][0];

    // AddLiquidityToJob
    if (_action == Actions.AddLiquidityToJob) {
      for (uint256 i = 0; i < jobLiquidities[_job].length; i++) {
        _addLiquidityToJob(_escrow, jobLiquidities[_job][i], _job, IERC20(_liquidity).balanceOf(_escrow));
      }

      // ApplyCreditToJob (_unbondLiquidityFromJob, _removeLiquidityFromJob, _addLiquidityToJob)
    } else if (_action == Actions.ApplyCreditToJob) {
      address _otherEscrow = _escrow == address(escrow1) ? address(escrow2) : address(escrow1);

      // ALWAYS FIRST: Should try to unbondLiquidityFromJob from _otherEscrow
      for (uint256 i = 0; i < jobLiquidities[_job].length; i++) {
        uint256 _liquidityProvided = keep3rV1.liquidityProvided(_otherEscrow, _liquidity, _job);
        uint256 _liquidityAmount = keep3rV1.liquidityAmount(_otherEscrow, _liquidity, _job);
        if (_liquidityProvided > 0 && _liquidityAmount == 0) {
          _unbondLiquidityFromJob(_otherEscrow, jobLiquidities[_job][i], _job, _liquidityProvided);
        } else {
          //  - if can't unbound then addLiquidity
          uint256 _amount = IERC20(_liquidity).balanceOf(_otherEscrow);
          if (_amount > 0) {
            _addLiquidityToJob(_otherEscrow, jobLiquidities[_job][i], _job, _amount);
          } else {
            //      - if no liquidity to add and liquidityAmountsUnbonding then _removeLiquidityFromJob + _addLiquidityToJob
            uint256 _liquidityAmountsUnbonding = keep3rV1.liquidityAmountsUnbonding(_otherEscrow, _liquidity, _job);
            uint256 _liquidityUnbonding = keep3rV1.liquidityUnbonding(_otherEscrow, _liquidity, _job);
            if (_liquidityAmountsUnbonding > 0 && _liquidityUnbonding < block.timestamp) {
              _removeLiquidityFromJob(_otherEscrow, jobLiquidities[_job][i], _job);
              // TODO: is adding liquiditiy to this job again correct?
              _addLiquidityToJob(_otherEscrow, jobLiquidities[_job][i], _job, IERC20(_liquidity).balanceOf(_otherEscrow));
            }
          }
        }
      }
      // Run applyCreditToJob
      for (uint256 i = 0; i < jobLiquidities[_job].length; i++) {
        _applyCreditToJob(_escrow, jobLiquidities[_job][i], _job);
      }

      // RemoveLiquidityFromJob
    } else if (_action == Actions.RemoveLiquidityFromJob) {
      for (uint256 i = 0; i < jobLiquidities[_job].length; i++) {
        _removeLiquidityFromJob(_escrow, jobLiquidities[_job][i], _job);
        _addLiquidityToJob(_escrow, jobLiquidities[_job][i], _job, IERC20(_liquidity).balanceOf(_escrow));
      }
    }
  }
}
