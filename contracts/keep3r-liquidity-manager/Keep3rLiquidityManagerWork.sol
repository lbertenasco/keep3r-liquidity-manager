// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './Keep3rLiquidityManagerUserJobsLiquidityHandler.sol';

interface IKeep3rLiquidityManagerWork {
  enum Actions { None, AddLiquidityToJob, ApplyCreditToJob, RemoveLiquidityFromJob }
  enum Steps { NotStarted, LiquidityAdded, CreditApplied, UnbondingLiquidity }

  // Actions by Keeper
  event Worked(address indexed _job);
  // Actions forced by governor
  event ForceWorked(address indexed _job);

  function getNextAction(address _job) external view returns (address _escrow, Actions _action);

  function workable(address _job) external view returns (bool);

  function jobEscrowStep(address _job, address _escrow) external view returns (Steps _step);

  function jobEscrowTimestamp(address _job, address _escrow) external view returns (uint256 _timestamp);

  function work(address _job) external;

  function forceWork(address _job) external;
}

// IMPORTANT!
// TODO SIMPLIFY WITH STEPS AND COOLDOWNS!
abstract contract Keep3rLiquidityManagerWork is Keep3rLiquidityManagerUserJobsLiquidityHandler, IKeep3rLiquidityManagerWork {
  // job => escrow => Steps
  mapping(address => mapping(address => Steps)) public override jobEscrowStep;
  // job => escrow => timestamp
  mapping(address => mapping(address => uint256)) public override jobEscrowTimestamp;

  // Since all liquidity behaves the same, we just need to check one of them
  function getNextAction(address _job) public view override returns (address _escrow, Actions _action) {
    // TODO Not sure this requirement is ok....
    require(jobLiquidities[_job].length > 0, 'Keep3rLiquidityManager::getNextAction:job-has-no-liquidity');
    address _liquidity = jobLiquidities[_job][0];

    Steps _escrow1Step = jobEscrowStep[_job][escrow1];
    Steps _escrow2Step = jobEscrowStep[_job][escrow2];

    // Init
    if (_escrow1Step == Steps.NotStarted && _escrow2Step == Steps.NotStarted) {
      // ADD LIQUIDITY TO escrow1
      return (escrow1, Actions.AddLiquidityToJob);
    }

    // can return None, ApplyCreditToJob and RemoveLiquidityFromJob.
    (_escrow, _action) = _getNextActionOnStep(escrow1, _liquidity, _job);
    if (_action != Actions.None) return (_escrow, _action);

    // if escrow1 next actions is None we need to check escrow2

    // if escrow2 has not yet started
    if (_escrow2Step == Steps.NotStarted) {
      // expect escrow1 CreditApplied
      if (_escrow1Step != Steps.CreditApplied) return (address(0), Actions.None);
      // make sure to wait 14 days
      if (block.timestamp <= jobEscrowTimestamp[_job][escrow1].add(14 days)) return (address(0), Actions.None);
      // add liquidity as escrow2
      return (escrow2, Actions.AddLiquidityToJob);
    }

    (_escrow, _action) = _getNextActionOnStep(escrow2, _liquidity, _job);
  }

  function _getNextActionOnStep(
    address _escrow,
    address _liquidity,
    address _job
  ) internal view returns (address, Actions) {
    Steps _escrowStep = jobEscrowStep[_job][_escrow];

    if (_escrowStep == Steps.LiquidityAdded) {
      // The escrow with liquidityAmount is the one to call applyCreditToJob, the other should call unbondLiquidityFromJob
      if (IKeep3rV1(keep3rV1).liquidityApplied(_escrow, _liquidity, _job) < block.timestamp) {
        return (_escrow, Actions.ApplyCreditToJob);
      }
      return (address(0), Actions.None);
    }

    if (_escrowStep == Steps.CreditApplied) {
      // Check if we can _removeLiquidityFromJob & instantly _addLiquidityToJob
      uint256 liquidityAmountsUnbonding1 = IKeep3rV1(keep3rV1).liquidityAmountsUnbonding(_escrow, _liquidity, _job);
      uint256 liquidityUnbonding1 = IKeep3rV1(keep3rV1).liquidityUnbonding(_escrow, _liquidity, _job);
      if (liquidityAmountsUnbonding1 > 0 && liquidityUnbonding1 < block.timestamp) {
        return (_escrow, Actions.RemoveLiquidityFromJob);
      }
    }

    return (address(0), Actions.None);
  }

  // TODO IMPORTANT add steps and timestamps on actions
  // Keep3r actions
  function workable(address _job) public view override returns (bool) {
    (, Actions _action) = getNextAction(_job);
    return _workable(_action);
  }

  function _workable(Actions _action) internal pure returns (bool) {
    return (_action != Actions.None);
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
        _addLiquidityToJob(_escrow, jobLiquidities[_job][i], _job, jobLiquidityDesiredAmount[_job][_liquidity].div(2));
      }

      // ApplyCreditToJob (_unbondLiquidityFromJob, _removeLiquidityFromJob, _addLiquidityToJob)
    } else if (_action == Actions.ApplyCreditToJob) {
      address _otherEscrow = _escrow == address(escrow1) ? address(escrow2) : address(escrow1);

      // ALWAYS FIRST: Should try to unbondLiquidityFromJob from _otherEscrow
      for (uint256 i = 0; i < jobLiquidities[_job].length; i++) {
        uint256 _liquidityProvided = IKeep3rV1(keep3rV1).liquidityProvided(_otherEscrow, _liquidity, _job);
        uint256 _liquidityAmount = IKeep3rV1(keep3rV1).liquidityAmount(_otherEscrow, _liquidity, _job);
        if (_liquidityProvided > 0 && _liquidityAmount == 0) {
          _unbondLiquidityFromJob(_otherEscrow, jobLiquidities[_job][i], _job, _liquidityProvided);
        } else {
          //  - if no liquidity to add and liquidityAmountsUnbonding then _removeLiquidityFromJob + _addLiquidityToJob
          uint256 _liquidityAmountsUnbonding = IKeep3rV1(keep3rV1).liquidityAmountsUnbonding(_otherEscrow, _liquidity, _job);
          uint256 _liquidityUnbonding = IKeep3rV1(keep3rV1).liquidityUnbonding(_otherEscrow, _liquidity, _job);
          if (_liquidityAmountsUnbonding > 0 && _liquidityUnbonding < block.timestamp) {
            uint256 _amount = _removeLiquidityFromJob(_otherEscrow, jobLiquidities[_job][i], _job);
            _addLiquidityToJob(_otherEscrow, jobLiquidities[_job][i], _job, jobLiquidityDesiredAmount[_job][_liquidity].div(2));
            if (_amount > jobLiquidityDesiredAmount[_job][_liquidity].div(2)) {
              IKeep3rEscrow(_otherEscrow).withdraw(jobLiquidities[_job][i], _amount.sub(jobLiquidityDesiredAmount[_job][_liquidity].div(2)));
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
        uint256 _amount = _removeLiquidityFromJob(_escrow, jobLiquidities[_job][i], _job);
        _addLiquidityToJob(_escrow, jobLiquidities[_job][i], _job, jobLiquidityDesiredAmount[_job][_liquidity].div(2));
        if (_amount > jobLiquidityDesiredAmount[_job][_liquidity].div(2)) {
          IKeep3rEscrow(_escrow).withdraw(jobLiquidities[_job][i], _amount.sub(jobLiquidityDesiredAmount[_job][_liquidity].div(2)));
        }
      }
    }

    // Try to clean LP after execution
    for (uint256 i = 0; i < jobLiquidities[_job].length; i++) {
      uint256 _liquidityInUse =
        IKeep3rEscrow(escrow1).liquidityTotalAmount(jobLiquidities[_job][i]).add(
          IKeep3rEscrow(escrow2).liquidityTotalAmount(jobLiquidities[_job][i])
        );
      if (_liquidityInUse == 0) _removeLPFromJob(jobLiquidities[_job][i], _job);
    }
  }
}
