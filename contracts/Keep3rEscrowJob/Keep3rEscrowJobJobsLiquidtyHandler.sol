// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import './Keep3rEscrowJobParameters.sol';

interface IKeep3rEscrowJobJobsLiquidityHandler {}

abstract contract Keep3rEscrowJobJobsLiquidityHandler is Keep3rEscrowJobParameters, IKeep3rEscrowJobJobsLiquidityHandler {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  // lp => amount (helps safely collect extra dust)
  mapping(address => uint256) public liquidityTotalAmount;
  // job => lp[]
  mapping(address => address[]) internal _jobLiquidities;
  // job => lp => uint256
  mapping(address => mapping(address => uint256)) public jobLiquidityId;
  // job => lp => amount
  mapping(address => mapping(address => uint256)) public jobLiquidityDesiredAmount;
}
