// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './Keep3rEscrowJobUserLiquidityHandler.sol';
import './Keep3rEscrowJobJobsLiquidityHandler.sol';

interface IKeep3rEscrowJobLiquidityHandler {
  function jobLiquidityActive(address _job, address _liquidity) external view returns (bool _active);

  function userJobLiquidityAmount(
    address _user,
    address _job,
    address _liquidity
  ) external view returns (uint256 _amount);

  function userJobLiquidityLockedAmount(
    address _user,
    address _job,
    address _liquidity
  ) external view returns (uint256 _amount);

  function userJobCycle(address _user, address _job) external view returns (uint256 _cycle);

  function jobCycle(address _job) external view returns (uint256 _cycle);

  function validLiquidity(address _liquidity) external view returns (bool);

  function addLiquidity(address _liquidity, uint256 _amount) external returns (bool);

  function removeLiquidity(address _liquidity, uint256 _amount) external returns (bool);

  function setJobLiquidityAmount(
    address _job,
    address _liquidity,
    uint256 _amount
  ) external returns (bool);

  function removeLiquidityFromJob(
    address _job,
    address _liquidity,
    uint256 _amount
  ) external returns (bool);

  function removeIdleLiquidityFromJob(
    address _job,
    address _liquidity,
    uint256 _amount
  ) external returns (bool);
}

abstract contract Keep3rEscrowJobLiquidityHandler is
  Keep3rEscrowJobUserLiquidityHandler,
  Keep3rEscrowJobJobsLiquidityHandler,
  IKeep3rEscrowJobLiquidityHandler
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

  function validLiquidity(address _liquidity) public view override returns (bool) {
    return false;
  }

  function jobLiquidityActive(address _job, address _liquidity) public view override returns (bool) {
    return jobLiquidityIndex[_job][_liquidity] > 0;
  }

  function setJobLiquidityAmount(
    address _job,
    address _liquidity,
    uint256 _amount
  ) external override returns (bool) {
    address _user = msg.sender;
    _amount = _amount.div(2).mul(2); // removes potential decimal dust

    require(_amount != userJobLiquidityAmount[_user][_job][_liquidity], 'same-liquidity-amount');

    userJobCycle[_user][_job] = jobCycle[_job];
    uint256 _diff;
    // Increase liquidity on job
    if (_amount > userJobLiquidityLockedAmount[_user][_job][_liquidity]) {
      // get amount of diff to add to job liquidity
      _diff = _amount.sub(userJobLiquidityAmount[_user][_job][_liquidity]);
      // set liquidity amount on user-job
      userJobLiquidityAmount[_user][_job][_liquidity] = _amount;
      // increase user-job liquidity locked amount
      userJobLiquidityLockedAmount[_user][_job][_liquidity] = userJobLiquidityLockedAmount[_user][_job][_liquidity].add(_diff);
      // substract diff from user idle amount
      userLiquidityIdleAmount[_user][_liquidity] = userLiquidityIdleAmount[_user][_liquidity].sub(_diff);
      // add diff to desired liquidity on job
      jobLiquidityDesiredAmount[_job][_liquidity] = jobLiquidityDesiredAmount[_job][_liquidity].add(_diff);
    } else {
      _diff = userJobLiquidityAmount[_user][_job][_liquidity].sub(_amount);
      userJobLiquidityAmount[_user][_job][_liquidity] = _amount;
      jobLiquidityDesiredAmount[_job][_liquidity] = jobLiquidityDesiredAmount[_job][_liquidity].sub(_diff);
    }

    // TODO Add valid liquidity to job
    if (!jobLiquidityActive(_job, _liquidity)) _addLPToJob(_liquidity, _job);
  }

  function removeLiquidityFromJob(
    address _job,
    address _liquidity,
    uint256 _amount
  ) external override returns (bool) {
    address _user = msg.sender;
    _amount = _amount.div(2).mul(2); // removes potential decimal dust

    require(jobCycle[_job] >= userJobCycle[_user][_job].add(2), '');

    uint256 _idleAmount = userJobLiquidityLockedAmount[_user][_job][_liquidity].sub(userJobLiquidityAmount[_user][_job][_liquidity]);
    require(_amount <= _idleAmount, '');

    userJobLiquidityLockedAmount[_user][_job][_liquidity] = userJobLiquidityLockedAmount[_user][_job][_liquidity].sub(_amount);
    userLiquidityIdleAmount[_user][_liquidity] = userLiquidityIdleAmount[_user][_liquidity].add(_amount);

    uint256 _jobLiquidityAmount = 0; // TODO Get job liquidity amount from keep3rV1

    // TODO remove valid liquidity from job
    if (_jobLiquidityAmount == 0) _removeLPFromJob(_liquidity, _job);
  }
}
