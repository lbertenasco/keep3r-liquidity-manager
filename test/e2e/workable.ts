import moment from 'moment';
import { ethers, network } from 'hardhat';
import config from '../../.config.json';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { expect } from 'chai';
import { JsonRpcSigner } from '@ethersproject/providers';
import { evm, wallet } from '../utils';
import { e18, ZERO_ADDRESS } from '../../utils/web3-utils';

const actions = ['None', 'AddLiquidityToJob', 'ApplyCreditToJob', 'UnbondLiquidityFromJob', 'RemoveLiquidityFromJob'];
const steps = ['NotStarted', 'LiquidityAdded', 'CreditApplied', 'UnbondingLiquidity'];

const DAY = 60 * 60 * 24;

const keep3rAddress = '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44';
const keep3rLiquidityManagerAddress = '0xf14cb1feb6c40f26d9ca0ea39a9a613428cdc9ca';
const keep3rLiquidityManagerJobAddress = '0x7e0cc5edf2dd01fc543d698b7e00ff54c6c39085';
const escrow1Address = '0xc3c272d18e31086ea7ff0e51474ade320ef5b3e1';
const escrow2Address = '0x39392ae1b305161ecb500be8da88444c5b5a8ed5';

const keep3rLiquidityManagerGovernanceAddress = '0x37fc68835dd1ef6d7660fa47e87774d4678e7bcb';
const keep3rLiquidityManagerJobGovernanceAddress = '0x37fc68835dd1ef6d7660fa47e87774d4678e7bcb';
const slpETHKP3R = '0xaf988afF99d3d0cb870812C325C588D8D8CB7De8';
const slpWhaleAddress = '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd';

describe('workable', () => {
  let keep3r: Contract;
  let keep3rGovernance: JsonRpcSigner;
  let keep3rLiquidityManagerGovernance: JsonRpcSigner;
  let keep3rLiquidityManagerJobGovernance: JsonRpcSigner;
  let slpWhale: JsonRpcSigner;

  let slp: Contract;

  let escrow1: Contract;
  let escrow2: Contract;
  let keep3rLiquidityManager: Contract;
  let keep3rLiquidityManagerJob: Contract;
  let startingTimestamp: number;
  let currentTimestamp: number;

  let logs: { log: string; timestamp: number }[] = [];

  before('Setup accounts and contracts', async () => {});

  beforeEach(async () => {
    keep3rGovernance = await wallet.impersonate(config.accounts.mainnet.keep3rGovernance);
    keep3rLiquidityManagerGovernance = await wallet.impersonate(keep3rLiquidityManagerGovernanceAddress);
    keep3rLiquidityManagerJobGovernance = await wallet.impersonate(keep3rLiquidityManagerJobGovernanceAddress);
    slpWhale = await wallet.impersonate(slpWhaleAddress);

    keep3r = await ethers.getContractAt('IKeep3rV1', keep3rAddress, keep3rGovernance);

    slp = await ethers.getContractAt('IERC20', slpETHKP3R);

    // Get contracts
    escrow1 = await ethers.getContractAt('Keep3rEscrow', escrow1Address);
    escrow2 = await ethers.getContractAt('Keep3rEscrow', escrow2Address);
    keep3rLiquidityManager = await ethers.getContractAt('Keep3rLiquidityManager', keep3rLiquidityManagerAddress);
    keep3rLiquidityManagerJob = await ethers.getContractAt('Keep3rLiquidityManagerJob', keep3rLiquidityManagerJobAddress);
  });

  describe('go though jobs and check if workable', () => {
    it('log', async () => {
      await keep3rLiquidityManagerJob.connect(keep3rLiquidityManagerJobGovernance).pause(false);
      const jobs = await keep3rLiquidityManagerJob.callStatic.jobs();
      for (const job of jobs) {
        console.log(job, 'workable:', await keep3rLiquidityManagerJob.callStatic.workable(job));
      }
    });
  });
});
