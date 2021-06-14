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

const userAddress = '0x5f0845101857d2A91627478e302357860b1598a1';

const keep3rAddress = '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44';
const keep3rV1JobRegistryAddress = '0x7396899638410094B3690F8bd2b56f07fdAb620c';
const keep3rLiquidityManagerAddress = '0xf14cb1feb6c40f26d9ca0ea39a9a613428cdc9ca';
const keep3rLiquidityManagerJobAddress = '0x7e0cc5edf2dd01fc543d698b7e00ff54c6c39085';
const escrow1Address = '0xc3c272d18e31086ea7ff0e51474ade320ef5b3e1';
const escrow2Address = '0x39392ae1b305161ecb500be8da88444c5b5a8ed5';

const keep3rLiquidityManagerGovernanceAddress = '0x37fc68835dd1ef6d7660fa47e87774d4678e7bcb';
const keep3rLiquidityManagerJobGovernanceAddress = '0x37fc68835dd1ef6d7660fa47e87774d4678e7bcb';
const slpETHKP3R = '0xaf988afF99d3d0cb870812C325C588D8D8CB7De8';

describe('liquidity-status:', () => {
  let keep3r: Contract;
  let keep3rV1JobRegistry: Contract;
  let user: JsonRpcSigner;
  let keep3rGovernance: JsonRpcSigner;
  let keep3rLiquidityManagerGovernance: JsonRpcSigner;
  let keep3rLiquidityManagerJobGovernance: JsonRpcSigner;

  let slp: Contract;

  let escrow1: Contract;
  let escrow2: Contract;
  let keep3rLiquidityManager: Contract;
  let keep3rLiquidityManagerJob: Contract;
  let startingTimestamp: number;
  let currentTimestamp: number;

  let logs: { log: string; timestamp: number }[] = [];

  before('Setup accounts and contracts', async () => {
    keep3rGovernance = await wallet.impersonate(config.accounts.mainnet.keep3rGovernance);

    // user = await wallet.impersonate(userAddress);
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [userAddress],
    });
    user = ethers.provider.getSigner(userAddress);

    keep3rLiquidityManagerGovernance = await wallet.impersonate(keep3rLiquidityManagerGovernanceAddress);
    keep3rLiquidityManagerJobGovernance = await wallet.impersonate(keep3rLiquidityManagerJobGovernanceAddress);

    keep3r = await ethers.getContractAt('IKeep3rV1', keep3rAddress, keep3rGovernance);
    keep3rV1JobRegistry = await ethers.getContractAt('IKeep3rV1JobRegistry', keep3rV1JobRegistryAddress, keep3rGovernance);

    slp = await ethers.getContractAt('IERC20', slpETHKP3R);
    slp = slp.connect(user);

    // Get contracts
    escrow1 = await ethers.getContractAt('Keep3rEscrow', escrow1Address);
    escrow2 = await ethers.getContractAt('Keep3rEscrow', escrow2Address);
    keep3rLiquidityManager = await ethers.getContractAt('Keep3rLiquidityManager', keep3rLiquidityManagerAddress);
    keep3rLiquidityManagerJob = await ethers.getContractAt('Keep3rLiquidityManagerJob', keep3rLiquidityManagerJobAddress);
  });

  describe('get user liquidity information', () => {
    it('log', async () => {
      const liquidityBalance = await slp.callStatic.balanceOf(user._address);
      console.log('user:', user._address);
      console.log('SLP balance:', liquidityBalance.div(e18).toNumber(), `(${liquidityBalance.toString()})`);
      const liquidityIdleAmount = await keep3rLiquidityManager.callStatic.userLiquidityIdleAmount(user._address, slp.address);
      const liquidityTotalAmount = await keep3rLiquidityManager.callStatic.userLiquidityTotalAmount(user._address, slp.address);
      console.log('Liq-manager idle:', liquidityIdleAmount.div(e18).toNumber(), `(${liquidityIdleAmount.toString()})`);
      console.log('Liq-manager total:', liquidityTotalAmount.div(e18).toNumber(), `(${liquidityTotalAmount.toString()})`);
    });
  });
  describe('go though liq-manager jobs and check what the liquidity is', () => {
    it('log', async () => {
      const jobs = await keep3rLiquidityManagerJob.callStatic.jobs();
      for (const job of jobs) {
        const jobData = await keep3rV1JobRegistry.callStatic.jobData(job);
        const userJobLiquidityAmount = await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(user._address, job, slp.address);
        const userJobLiquidityLockedAmount = await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          user._address,
          job,
          slp.address
        );
        const jobLiquidityDesiredAmount = await keep3rLiquidityManager.callStatic.jobLiquidityDesiredAmount(job, slp.address);

        console.log('-');
        console.log(`job: ${jobData._name} (${job})`);
        console.log('user job liq:', userJobLiquidityAmount.div(e18).toNumber(), `(${userJobLiquidityAmount.toString()})`);
        console.log('user job liq locked:', userJobLiquidityLockedAmount.div(e18).toNumber(), `(${userJobLiquidityLockedAmount.toString()})`);
        console.log('job liq desired:', jobLiquidityDesiredAmount.div(e18).toNumber(), `(${jobLiquidityDesiredAmount.toString()})`);
        if (userJobLiquidityAmount.lt(userJobLiquidityLockedAmount) && userJobLiquidityLockedAmount.gt(0)) {
          const jobCycle = (await keep3rLiquidityManager.callStatic.jobCycle(job)).toNumber();
          const userJobCycle = (await keep3rLiquidityManager.callStatic.userJobCycle(user._address, job)).toNumber();
          console.log('job cycle:', jobCycle, '- user cycle:', userJobCycle);
          if (jobCycle >= userJobCycle + 2) console.log('UNLOCKED!');
        }
      }
    });
  });
});
