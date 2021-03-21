// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './Keep3rLiquidityManagerUserJobsLiquidityHandler.sol';

interface IKeep3rLiquidityManagerWork {
  enum Actions { None, AddLiquidityToJob, ApplyCreditToJob, UnbondLiquidityFromJob, RemoveLiquidityFromJob }
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

    Steps _escrow1Step = jobEscrowStep[_job][escrow1];
    Steps _escrow2Step = jobEscrowStep[_job][escrow2];

    // Init (add liquidity to escrow1)
    if (_escrow1Step == Steps.NotStarted && _escrow2Step == Steps.NotStarted) {
      return (escrow1, Actions.AddLiquidityToJob);
    }

    // Init (add liquidity to NotStarted escrow)
    if ((_escrow1Step == Steps.NotStarted || _escrow2Step == Steps.NotStarted) && _jobHasDesiredLiquidity(_job)) {
      _escrow = _escrow1Step == Steps.NotStarted ? escrow1 : escrow2;
      address _otherEscrow = _escrow == escrow1 ? escrow2 : escrow1;

      // on _otherEscrow step CreditApplied
      if (jobEscrowStep[_job][_otherEscrow] == Steps.CreditApplied) {
        // make sure to wait 14 days
        if (block.timestamp > jobEscrowTimestamp[_job][_otherEscrow].add(14 days)) {
          // add liquidity to NotStarted _escrow
          return (_escrow, Actions.AddLiquidityToJob);
        }
      }

      // on _otherEscrow step UnbondingLiquidity add liquidity
      if (jobEscrowStep[_job][_otherEscrow] == Steps.UnbondingLiquidity) {
        // add liquidity to NotStarted _escrow
        return (_escrow, Actions.AddLiquidityToJob);
      }
    }

    // can return None, ApplyCreditToJob and RemoveLiquidityFromJob.
    _action = _getNextActionOnStep(escrow1, _escrow1Step, _escrow2Step, _job);
    if (_action != Actions.None) return (escrow1, _action);

    // if escrow1 next actions is None we need to check escrow2

    _action = _getNextActionOnStep(escrow2, _escrow2Step, _escrow1Step, _job);
    if (_action != Actions.None) return (escrow2, _action);

    return (address(0), Actions.None);
  }

  function _jobHasDesiredLiquidity(address _job) internal view returns (bool) {
    // search for desired liquidity > 0 on all job liquidities
    for (uint256 i = 0; i < jobLiquidities[_job].length; i++) {
      if (jobLiquidityDesiredAmount[_job][jobLiquidities[_job][i]] > 0) {
        return true;
      }
    }
    return false;
  }

  function _getNextActionOnStep(
    address _escrow,
    Steps _escrowStep,
    Steps _otherEscrowStep,
    address _job
  ) internal view returns (Actions) {
    // after adding liquidity wait 3 days to apply
    if (_escrowStep == Steps.LiquidityAdded) {
      // The escrow with liquidityAmount is the one to call applyCreditToJob, the other should call unbondLiquidityFromJob
      if (block.timestamp > jobEscrowTimestamp[_job][_escrow].add(3 days)) {
        return Actions.ApplyCreditToJob;
      }
      return Actions.None;
    }

    // after applying credits wait 17 days to unbond (only happens when other escrow is on NotStarted [desired liquidity = 0])
    // makes sure otherEscrowStep is still notStarted (it can be liquidityAdded)
    if (_escrowStep == Steps.CreditApplied) {
      if (_otherEscrowStep == Steps.NotStarted && block.timestamp > jobEscrowTimestamp[_job][_escrow].add(17 days)) {
        return Actions.UnbondLiquidityFromJob;
      }
      return Actions.None;
    }

    // after unbonding liquidity wait 14 days to remove
    if (_escrowStep == Steps.UnbondingLiquidity) {
      if (block.timestamp > jobEscrowTimestamp[_job][_escrow].add(14 days)) {
        return Actions.RemoveLiquidityFromJob;
      }
      return Actions.None;
    }

    // for steps: NotStarted. return Actions.None
    return Actions.None;
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
