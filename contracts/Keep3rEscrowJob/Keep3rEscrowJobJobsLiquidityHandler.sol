// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

interface IKeep3rEscrowJobJobsLiquidityHandler {}

abstract contract Keep3rEscrowJobJobsLiquidityHandler is IKeep3rEscrowJobJobsLiquidityHandler {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // job => lp[]
  mapping(address => address[]) public jobLiquidities;
  // job => lp => uint256
  mapping(address => mapping(address => uint256)) public jobLiquidityIndex;
  // job => lp => amount
  mapping(address => mapping(address => uint256)) public jobLiquidityDesiredAmount;

  // function _setLPAmountForJobAndUser(
  //   address _user,
  //   address _lp,
  //   address _job,
  //   address _amount
  // ) internal {
  //   uint256 _diff;
  //   if (_amount > userJobLiquidityLockedAmount[_user][_job][_liquidity]) {
  //     // get amount of diff to add to job liquidity
  //     _diff = _amount.sub(userJobLiquidityAmount[_user][_job][_liquidity]);
  //     // set liquidity amount on user-job
  //     userJobLiquidityAmount[_user][_job][_liquidity] = _amount;
  //     // increase user-job liquidity locked amount
  //     userJobLiquidityLockedAmount[_user][_job][_liquidity] = userJobLiquidityLockedAmount[_user][_job][_liquidity].add(_diff);
  //     // substract diff from user idle amount
  //     userLiquidityIdleAmount[_user][_liquidity] = userLiquidityIdleAmount[_user][_liquidity].sub(_diff);
  //     // add diff to desired liquidity on job
  //     jobLiquidityDesiredAmount[_job][_liquidity] = jobLiquidityDesiredAmount[_job][_liquidity].add(_diff);
  //   } else {
  //     _diff = userJobLiquidityAmount[_user][_job][_liquidity].sub(_amount);
  //     userJobLiquidityAmount[_user][_job][_liquidity] = _amount;
  //     jobLiquidityDesiredAmount[_job][_liquidity] = jobLiquidityDesiredAmount[_job][_liquidity].sub(_diff);
  //   }
  // }

  // function _setLPAmountToJob(
  //   address _lp,
  //   address _job,
  //   uint256 _amount
  // ) internal {
  //   if (jobLiquidityDesiredAmount[_job][_liquidity] == 0) _addLPToJob(_lp, _job);
  //   jobLiquidityDesiredAmount[_job][_liquidity] = _amount;
  //   if (jobLiquidityDesiredAmount[_job][_liquidity] == 0) _removeLPFromJob(_lp, _job);
  // }

  function _addLPToJob(address _lp, address _job) internal {
    jobLiquidities[_lp].push(_job);
    jobLiquidityIndex[_job][_lp] = jobLiquidities[_job].length;
  }

  function _removeLPFromJob(address _lp, address _job) internal {
    uint256 _index = jobLiquidityIndex[_job][_lp];
    uint256 _lastIndex = jobLiquidities[_job].length.sub(1);
    if (_index < _lastIndex) {
      jobLiquidities[_job][_index] = jobLiquidities[_job][_lastIndex];
      jobLiquidityIndex[_job][jobLiquidities[_job][_index]] = _index;
    }
    delete jobLiquidityIndex[_job][_lp];
    jobLiquidities[_job].pop();
  }
}

// function _addLPAmountFromUserForJob(
//   address _user,
//   address _lp,
//   address _job,
//   address _amount
// ) internal {
//   // set liquidity amount on user-job
//   userJobLiquidityAmount[_user][_job][_liquidity] = userJobLiquidityAmount[_user][_job][_liquidity].add(_amount);
//   // increase user-job liquidity locked amount
//   userJobLiquidityLockedAmount[_user][_job][_liquidity] = userJobLiquidityLockedAmount[_user][_job][_liquidity].add(_diff);
//   // substract diff from user idle amount
//   userLiquidityIdleAmount[_user][_liquidity] = userLiquidityIdleAmount[_user][_liquidity].sub(_diff);
//   // add diff to desired liquidity on job
//   jobLiquidityDesiredAmount[_job][_liquidity] = jobLiquidityDesiredAmount[_job][_liquidity].add(_diff);
// }

// function setJobLiquidityAmount(
//     address _job,
//     address _liquidity,
//     uint256 _amount
//   ) external override returns (bool) {
//     address _user = msg.sender;
//     _amount = _amount.div(2).mul(2); // removes potential decimal dust

//     require(_amount != userJobLiquidityAmount[_user][_job][_liquidity], 'same-liquidity-amount');

//     userJobCycle[_user][_job] = jobCycle[_job];
//     uint256 _diff;
//     // Increase liquidity on job
//     if (_amount > userJobLiquidityLockedAmount[_user][_job][_liquidity]) {
//       // get amount of diff to add to job liquidity
//       _diff = _amount.sub(userJobLiquidityAmount[_user][_job][_liquidity]);
//       // set liquidity amount on user-job
//       userJobLiquidityAmount[_user][_job][_liquidity] = _amount;
//       // increase user-job liquidity locked amount
//       userJobLiquidityLockedAmount[_user][_job][_liquidity] = userJobLiquidityLockedAmount[_user][_job][_liquidity].add(_diff);
//       // substract diff from user idle amount
//       userLiquidityIdleAmount[_user][_liquidity] = userLiquidityIdleAmount[_user][_liquidity].sub(_diff);
//       // add diff to desired liquidity on job
//       jobLiquidityDesiredAmount[_job][_liquidity] = jobLiquidityDesiredAmount[_job][_liquidity].add(_diff);
//     } else {
//       _diff = userJobLiquidityAmount[_user][_job][_liquidity].sub(_amount);
//       userJobLiquidityAmount[_user][_job][_liquidity] = _amount;
//       jobLiquidityDesiredAmount[_job][_liquidity] = jobLiquidityDesiredAmount[_job][_liquidity].sub(_diff);
//     }

//     // TODO Add valid liquidity to job
//     if (!jobLiquidityActive(_job, _liquidity)) {
//       jobLiquidities[_job].push(_liquidity);
//       jobLiquidityId[_job][_liquidity] = jobLiquidities[_job].length;
//     }
//   }
