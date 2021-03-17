// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@lbertenasco/contract-utils/interfaces/keep3r/IKeep3rV1.sol';

interface IKeep3rEscrowParameters {
  event GovernanceSet(address _governance);
  event Keep3rV1Set(IKeep3rV1 _keep3rV1);
  event LPsReturnedToGovernance(address _governance, uint256 _amount);

  function governance() external returns (address);

  function keep3rV1() external returns (IKeep3rV1);

  function setGovernance(address _governance) external;

  function setKeep3rV1(IKeep3rV1 _keep3rV1) external;
}

abstract contract Keep3rEscrowParameters is IKeep3rEscrowParameters {
  using SafeMath for uint256;

  address public override governance;
  IKeep3rV1 public override keep3rV1;

  constructor(address _governance, IKeep3rV1 _keep3r) public {
    _setGovernance(_governance);
    _setKeep3rV1(_keep3r);
  }

  function _setGovernance(address _governance) internal {
    require(_governance != address(0), 'Keep3rEscrowParameters::_setGovernance::zero-address');
    governance = _governance;
    emit GovernanceSet(_governance);
  }

  function _setKeep3rV1(IKeep3rV1 _keep3rV1) internal {
    require(address(_keep3rV1) != address(0), 'Keep3rEscrowParameters::_setKeep3rV1::zero-address');
    keep3rV1 = _keep3rV1;
    emit Keep3rV1Set(_keep3rV1);
  }
}
