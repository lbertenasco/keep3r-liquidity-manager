// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './Keep3rLiquidityManagerEscrowsHandler.sol';
import './Keep3rLiquidityManagerUserLiquidityHandler.sol';
import './Keep3rLiquidityManagerJobsLiquidityHandler.sol';

interface IKeep3rLiquidityManagerUserJobsLiquidityHandler {
  event LiquidityMinSet(address _liquidity, uint256 _minAmount);

  function liquidityMinAmount(address _liquidity) external view returns (uint256 _minAmount);

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

  function setMinAmount(address _liquidity, uint256 _minAmount) external;

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
  Keep3rLiquidityManagerEscrowsHandler,
  Keep3rLiquidityManagerUserLiquidityHandler,
  Keep3rLiquidityManagerJobsLiquidityHandler,
  IKeep3rLiquidityManagerUserJobsLiquidityHandler
{
  using SafeMath for uint256;

  // lp => minAmount
  mapping(address => uint256) public override liquidityMinAmount;
  // user => job => lp => amount
  mapping(address => mapping(address => mapping(address => uint256))) public override userJobLiquidityAmount;
  // user => job => lp => amount
  mapping(address => mapping(address => mapping(address => uint256))) public override userJobLiquidityLockedAmount;
  // user => job => cycle
  mapping(address => mapping(address => uint256)) public override userJobCycle;
  // job => cycle
  mapping(address => uint256) public override jobCycle;

  constructor(
    address _keep3rV1,
    address _escrow1,
    address _escrow2
  ) public Keep3rLiquidityManagerUserLiquidityHandler(_keep3rV1) Keep3rLiquidityManagerEscrowsHandler(_escrow1, _escrow2) {}

  function _setMinAmount(address _liquidity, uint256 _minAmount) internal {
    liquidityMinAmount[_liquidity] = _minAmount;
    emit LiquidityMinSet(_liquidity, _minAmount);
  }

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
      _subLiquidityOfUserFromJob(_user, _lp, _job, userJobLiquidityAmount[_user][_job][_lp].sub(_amount));
    }
    // TODO: emit event
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

    // withdraw tokens from escrows
    IKeep3rEscrow(escrow1).withdraw(_lp, _amount.div(2));
    IKeep3rEscrow(escrow2).withdraw(_lp, _amount.div(2));
  }

  function _addLiquidityOfUserToJob(
    address _user,
    address _lp,
    address _job,
    uint256 _amount
  ) internal {
    require(liquidityMinAmount[_lp] != 0, 'Keep3rLiquidityManager::liquidity-min-not-set');
    require(
      userJobLiquidityLockedAmount[_user][_job][_lp].add(_amount) >= liquidityMinAmount[_lp],
      'Keep3rLiquidityManager::locked-amount-not-enough'
    );

    require(_amount > 0, 'Keep3rLiquidityManager::zero-amount');
    require(_amount >= userLiquidityIdleAmount[_user][_lp], 'Keep3rLiquidityManager::no-idle-liquidity-available');
    // set liquidity amount on user-job
    userJobLiquidityAmount[_user][_job][_lp] = userJobLiquidityAmount[_user][_job][_lp].add(_amount);
    // increase user-job liquidity locked amount
    userJobLiquidityLockedAmount[_user][_job][_lp] = userJobLiquidityLockedAmount[_user][_job][_lp].add(_amount);
    // substract amount from user idle amount
    userLiquidityIdleAmount[_user][_lp] = userLiquidityIdleAmount[_user][_lp].sub(_amount);
    // add lp to job if that lp was not being used on that job
    if (jobLiquidityDesiredAmount[_job][_lp] == 0) _addLPToJob(_job, _lp);
    // add amount to desired liquidity on job
    jobLiquidityDesiredAmount[_job][_lp] = jobLiquidityDesiredAmount[_job][_lp].add(_amount);
  }

  function _subLiquidityOfUserFromJob(
    address _user,
    address _lp,
    address _job,
    uint256 _amount
  ) internal {
    require(_amount <= userJobLiquidityAmount[_user][_job][_lp], 'Keep3rLiquidityManager::not-enough-lp-in-job');
    // only allow user job liquidity to be reduced to 0 or higher than minumum
    require(
      userJobLiquidityAmount[_user][_job][_lp].sub(_amount) == 0 ||
        userJobLiquidityAmount[_user][_job][_lp].sub(_amount) >= liquidityMinAmount[_lp],
      'Keep3rLiquidityManager::locked-amount-not-enough'
    );

    userJobLiquidityAmount[_user][_job][_lp] = userJobLiquidityAmount[_user][_job][_lp].sub(_amount);
    jobLiquidityDesiredAmount[_job][_lp] = jobLiquidityDesiredAmount[_job][_lp].sub(_amount);
  }
}
