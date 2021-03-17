// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import './Keep3rEscrowJobParameters.sol';

interface IKeep3rEscrowJobUserJobsHandler {
  event JobAdded(address indexed _job, uint256 _keep3rs);
  event JobModified(address indexed _job, uint256 _newKeep3rs);
  event JobRemoved(address indexed _job);

  function jobsLPs(address _job, uint256 _index) external view returns (IERC20);

  function jobsLPsAssigned(address _job, IERC20 _lp) external view returns (bool);

  function jobsLPAmountAssigned(address _job, IERC20 _lp) external view returns (uint256);

  function userJobsLPsAmountAssigned(
    address _user,
    address _job,
    IERC20 _lp
  ) external returns (uint256);

  function isValidUserJobLP(
    address _user,
    address _job,
    IERC20 _lp
  ) external view returns (bool);

  function fundLPsForJob(
    address _job,
    IERC20 _lp,
    uint256 _amount
  ) external;

  function modifyFundedLPsForJob(
    address _job,
    IERC20 _lp,
    uint256 _amount
  ) external;

  function removeFundedLPsForJob(address _job, IERC20 _lp) external;
}

abstract contract Keep3rEscrowJobUserJobsHandler is Keep3rEscrowJobParameters, IKeep3rEscrowJobUserJobsHandler {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  mapping(address => IERC20[]) public override jobsLPs;
  mapping(address => mapping(IERC20 => bool)) public override jobsLPsAssigned; // may not be needed
  mapping(address => mapping(IERC20 => uint256)) public override jobsLPAmountAssigned; // mapping job => lp => total assigned
  mapping(address => mapping(address => mapping(IERC20 => uint256))) public override userJobsLPsAmountAssigned; // mapping user => job => lp => assigned

  constructor() public {}

  modifier _assertIsValidJob(
    address _user,
    address _job,
    IERC20 _lp
  ) {
    require(!isValidUserJobLP(_user, _job, _lp), 'Keep3rEscrowJob::invalid-job');
    _;
  }

  function isValidUserJobLP(
    address _user,
    address _job,
    IERC20 _lp
  ) public view override returns (bool) {
    return userJobsLPsAmountAssigned[_user][_job][_lp] != 0;
  }

  function _fundLPsForJob(
    address _job,
    IERC20 _lp,
    uint256 _amount
  ) internal {
    // require() check LP its allowed in keep3rv1
    // _lp.safeTransferForm(msg.sender, address(this), _amount);
    _addLPsAmountToJob(msg.sender, _job, _lp, _amount);
    // emit event
  }

  function _modifyFundedLPsForJob(
    address _job,
    IERC20 _lp,
    uint256 _amount
  ) internal {
    // require() check LP its allowed in keep3rv1
    if (userJobsLPsAmountAssigned[msg.sender][_job][_lp] < _amount) {
      // _lp.safeTransferForm(msg.sender, address(this), _amount);
      // send lp to escrow
      // apply credit ?
      _addLPsAmountToJob(msg.sender, _job, _lp, _amount);
    } else {
      _subLPsAmountOfJob(msg.sender, _job, _lp, _amount);
      // take out lps from job
      // take lp from escrow ?
      _lp.safeTransfer(msg.sender, _amount);
    }
    // emit event
  }

  function _removeFundedLPsForJob(address _job, IERC20 _lp) internal {
    // require() check LP its allowed in keep3rv1
    uint256 _currentLPFunded = userJobsLPsAmountAssigned[msg.sender][_job][_lp];
    _removeFundedLPsForJob(_job, _lp);
    // take out lps from job
    // take lp from escrow ?
    _lp.safeTransfer(msg.sender, _currentLPFunded);
    // emit event
  }

  function _addLPsAmountToJob(
    address _user,
    address _job,
    IERC20 _lp,
    uint256 _amount
  ) internal {
    require(userJobsLPsAmountAssigned[_user][_job][_lp] == 0, 'Keep3rEscrowJob::job-already-added');
    require(_amount > 0, 'Keep3rEscrowJob::cant-assign-zero');
    jobsLPAmountAssigned[_job][_lp] = jobsLPAmountAssigned[_job][_lp].add(_amount);
    userJobsLPsAmountAssigned[_user][_job][_lp] = _amount;
    if (!jobsLPsAssigned[_job][_lp]) _addLPToJob(_job, _lp);
  }

  function _subLPsAmountOfJob(
    address _user,
    address _job,
    IERC20 _lp,
    uint256 _amount
  ) internal _assertIsValidJob(_user, _job, _lp) {
    require(_amount < userJobsLPsAmountAssigned[_user][_job][_lp], 'Keep3rEscrowJob::cant-sub-more-than-assigned');
    jobsLPAmountAssigned[_job][_lp] = jobsLPAmountAssigned[_job][_lp].sub(userJobsLPsAmountAssigned[_user][_job][_lp]).add(_amount);
    userJobsLPsAmountAssigned[_user][_job][_lp] = _amount;
  }

  function _removeLPsFromJob(
    address _user,
    address _job,
    IERC20 _lp
  ) internal _assertIsValidJob(_user, _job, _lp) {
    jobsLPAmountAssigned[_job][_lp] = jobsLPAmountAssigned[_job][_lp].sub(userJobsLPsAmountAssigned[_user][_job][_lp]);
    delete userJobsLPsAmountAssigned[_user][_job][_lp];
    if (jobsLPAmountAssigned[_job][_lp] == 0) _removeLPFromJob(_job, _lp);
  }

  function _addLPToJob(address _job, IERC20 _lp) internal {
    jobsLPsAssigned[_job][_lp] = true;
    jobsLPs[_job].push(_lp);
  }

  function _removeLPFromJob(address _job, IERC20 _lp) internal {
    delete jobsLPsAssigned[_job][_lp];
    delete jobsLPAmountAssigned[_job][_lp];
    // remove LP from array
  }
}
