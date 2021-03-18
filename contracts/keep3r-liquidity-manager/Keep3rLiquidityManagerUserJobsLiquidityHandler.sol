// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './Keep3rLiquidityManagerUserLiquidityHandler.sol';
import './Keep3rLiquidityManagerJobsLiquidityHandler.sol';

interface IKeep3rLiquidityManagerUserJobsLiquidityHandler {
  function userJobLiquidityAmount(
    address _user,
    address _job,
    address _lp
  ) external view returns (uint256 _amount);

  function userJobLiquidityLockedAmount(
    address _user,
    address _job,
    address _lp
  ) external view returns (uint256 _amount);

  function userJobCycle(address _user, address _job) external view returns (uint256 _cycle);

  function jobCycle(address _job) external view returns (uint256 _cycle);

  function setJobLiquidityAmount(
    address _job,
    address _lp,
    uint256 _amount
  ) external;

  function removeIdleLiquidityFromJob(
    address _job,
    address _lp,
    uint256 _amount
  ) external;
}

abstract contract Keep3rLiquidityManagerUserJobsLiquidityHandler is
  Keep3rLiquidityManagerUserLiquidityHandler,
  Keep3rLiquidityManagerJobsLiquidityHandler,
  IKeep3rLiquidityManagerUserJobsLiquidityHandler
{
  using SafeMath for uint256;

  // user => job => lp => amount
  mapping(address => mapping(address => mapping(address => uint256))) public override userJobLiquidityAmount;
  // user => job => lp => amount
  mapping(address => mapping(address => mapping(address => uint256))) public override userJobLiquidityLockedAmount;
  // user => job => cycle
  mapping(address => mapping(address => uint256)) public override userJobCycle;
  // job => cycle
  mapping(address => uint256) public override jobCycle;

  constructor() public {}

  function setJobLiquidityAmount(
    address _job,
    address _lp,
    uint256 _amount
  ) external virtual override {
    _setLiquidityToJobOfUser(msg.sender, _job, _lp, _amount);
  }

  function removeIdleLiquidityFromJob(
    address _job,
    address _lp,
    uint256 _amount
  ) external virtual override {
    _removeIdleLiquidityOfUserFromJob(msg.sender, _job, _lp, _amount);
  }

  function _setLiquidityToJobOfUser(
    address _user,
    address _job,
    address _lp,
    uint256 _amount
  ) internal {
    _amount = _amount.div(2).mul(2); // removes potential decimal dust

    require(_amount != userJobLiquidityAmount[_user][_job][_lp], 'Keep3rLiquidityManager::same-liquidity-amount');

    userJobCycle[_user][_job] = jobCycle[_job];

    if (_amount > userJobLiquidityLockedAmount[_user][_job][_lp]) {
      _addLiquidityOfUserToJob(_user, _lp, _job, _amount.sub(userJobLiquidityAmount[_user][_job][_lp]));
    } else {
      _reduceLiquidityOfUserFromJob(_user, _lp, _job, userJobLiquidityAmount[_user][_job][_lp].sub(_amount));
    }
  }

  function _removeIdleLiquidityOfUserFromJob(
    address _user,
    address _job,
    address _lp,
    uint256 _amount
  ) internal {
    _amount = _amount.div(2).mul(2); // removes potential decimal dust
    require(jobCycle[_job] >= userJobCycle[_user][_job].add(2), 'Keep3rLiquidityManager::liquidity-still-locked');

    uint256 _idleAmount = userJobLiquidityLockedAmount[_user][_job][_lp].sub(userJobLiquidityAmount[_user][_job][_lp]);
    require(_amount <= _idleAmount, 'Keep3rLiquidityManager::amount-bigger-than-idle-available');

    userJobLiquidityLockedAmount[_user][_job][_lp] = userJobLiquidityLockedAmount[_user][_job][_lp].sub(_amount);
    userLiquidityIdleAmount[_user][_lp] = userLiquidityIdleAmount[_user][_lp].add(_amount);

    uint256 _jobLiquidityAmount = 0; // TODO Get job liquidity amount from keep3rV1

    if (_jobLiquidityAmount == 0) _removeLPFromJob(_lp, _job);
  }

  function _addLiquidityOfUserToJob(
    address _user,
    address _lp,
    address _job,
    uint256 _amount
  ) internal {
    require(_amount > 0, 'Keep3rLiquidityManager::zero-amount');
    require(_amount >= userLiquidityIdleAmount[_user][_lp], 'Keep3rLiquidityManager::no-idle-liquidity-available');
    // set liquidity amount on user-job
    userJobLiquidityAmount[_user][_job][_lp] = userJobLiquidityAmount[_user][_job][_lp].add(_amount);
    // increase user-job liquidity locked amount
    userJobLiquidityLockedAmount[_user][_job][_lp] = userJobLiquidityLockedAmount[_user][_job][_lp].add(_amount);
    // substract amount from user idle amount
    userLiquidityIdleAmount[_user][_lp] = userLiquidityIdleAmount[_user][_lp].sub(_amount);
    // add lp to job if that lp was not being used on that job
    if (jobLiquidityDesiredAmount[_job][_lp] == 0) _addLPToJob(_lp, _job);
    // add amount to desired liquidity on job
    jobLiquidityDesiredAmount[_job][_lp] = jobLiquidityDesiredAmount[_job][_lp].add(_amount);
  }

  function _reduceLiquidityOfUserFromJob(
    address _user,
    address _lp,
    address _job,
    uint256 _amount
  ) internal {
    require(_amount <= userJobLiquidityAmount[_user][_job][_lp], 'Keep3rLiquidityManager::not-enough-lp-in-job');
    userJobLiquidityAmount[_user][_job][_lp] = userJobLiquidityAmount[_user][_job][_lp].sub(_amount);
    jobLiquidityDesiredAmount[_job][_lp] = jobLiquidityDesiredAmount[_job][_lp].sub(_amount);
  }
}
