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
const forkBlockNumber = 12498164;

const keep3rAddress = '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44';
const keep3rLiquidityManagerAddress = '0xf14cb1feb6c40f26d9ca0ea39a9a613428cdc9ca';
const keep3rLiquidityManagerJobAddress = '0x7e0cc5edf2dd01fc543d698b7e00ff54c6c39085';
const escrow1Address = '0xc3c272d18e31086ea7ff0e51474ade320ef5b3e1';
const escrow2Address = '0x39392ae1b305161ecb500be8da88444c5b5a8ed5';

const yKeeperAddress = '0x1ea056C13F8ccC981E51c5f1CDF87476666D0A74';
const keep3rLiquidityManagerJobGovernanceAddress = '0x37fc68835dd1ef6d7660fa47e87774d4678e7bcb';
const slpETHKP3R = '0xaf988afF99d3d0cb870812C325C588D8D8CB7De8';

type JobAndOwner = { job: string; owner: string };

const passUnwindeJobs: JobAndOwner[] = [
  {
    job: '0x5efD850044Ba76b8ffE49437CB301be3568bA696',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
];

describe('Keep3rLiquidityManager', () => {
  let keep3r: Contract;
  let keep3rGovernance: JsonRpcSigner;
  let keep3rLiquidityManagerJobGovernance: JsonRpcSigner;
  let yKeeper: JsonRpcSigner;

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
    await evm.reset({
      jsonRpcUrl: process.env.MAINNET_HTTPS_URL,
      blockNumber: forkBlockNumber,
    });

    startingTimestamp = (await ethers.provider.getBlock(forkBlockNumber)).timestamp;

    keep3rGovernance = await wallet.impersonate(config.accounts.mainnet.keep3rGovernance);
    keep3rLiquidityManagerJobGovernance = await wallet.impersonate(keep3rLiquidityManagerJobGovernanceAddress);
    yKeeper = await wallet.impersonate(yKeeperAddress);

    keep3r = await ethers.getContractAt('IKeep3rV1', keep3rAddress, keep3rGovernance);

    slp = await ethers.getContractAt('IERC20', slpETHKP3R);

    // Get contracts
    escrow1 = await ethers.getContractAt('Keep3rEscrow', escrow1Address);
    escrow2 = await ethers.getContractAt('Keep3rEscrow', escrow2Address);
    keep3rLiquidityManager = await ethers.getContractAt('Keep3rLiquidityManager', keep3rLiquidityManagerAddress);
    keep3rLiquidityManagerJob = await ethers.getContractAt('Keep3rLiquidityManagerJob', keep3rLiquidityManagerJobAddress);
  });

  const logJobData = async (jobAddress: string, userAddress: string) => {
    const nextAction = await keep3rLiquidityManager.getNextAction(jobAddress);
    const escrow1Step = await keep3rLiquidityManager.jobEscrowStep(jobAddress, escrow1.address);
    const escrow2Step = await keep3rLiquidityManager.jobEscrowStep(jobAddress, escrow2.address);
    const jobCycle = await keep3rLiquidityManager.jobCycle(jobAddress);
    const userJobCycle = await keep3rLiquidityManager.userJobCycle(userAddress, jobAddress);
    console.log('nextAction:', nextAction[0], actions[nextAction[1]]);
    console.log('escrow1 step:', steps[escrow1Step]);
    console.log('escrow2 step:', steps[escrow2Step]);
    console.log('jobCycle:', jobCycle.toNumber(), ' - user cycle:', userJobCycle.toNumber());
  };
  const logKeeperJobData = async (jobAddress: string) => {
    const liquidityProvidedEscrow1 = await keep3r.liquidityProvided(escrow1.address, slpETHKP3R, jobAddress);
    const liquidityProvidedEscrow2 = await keep3r.liquidityProvided(escrow2.address, slpETHKP3R, jobAddress);
    const liquidityAmountsUnbondingEscrow1 = await keep3r.liquidityAmountsUnbonding(escrow1.address, slpETHKP3R, jobAddress);
    const liquidityAmountsUnbondingEscrow2 = await keep3r.liquidityAmountsUnbonding(escrow2.address, slpETHKP3R, jobAddress);
    const liquidityAmountEscrow1 = await keep3r.liquidityAmount(escrow1.address, slpETHKP3R, jobAddress);
    const liquidityAmountEscrow2 = await keep3r.liquidityAmount(escrow2.address, slpETHKP3R, jobAddress);

    console.log('liquidityProvidedEscrow1:', liquidityProvidedEscrow1.toNumber());
    console.log('liquidityAmountsUnbondingEscrow1:', liquidityAmountsUnbondingEscrow1.toNumber());
    console.log('liquidityAmountEscrow1:', liquidityAmountEscrow1.toNumber());
    console.log('liquidityProvidedEscrow2:', liquidityProvidedEscrow2.toNumber());
    console.log('liquidityAmountsUnbondingEscrow2:', liquidityAmountsUnbondingEscrow2.toNumber());
    console.log('liquidityAmountEscrow2:', liquidityAmountEscrow2.toNumber());
  };
  const advanceDays = async (days: number) => {
    await evm.advanceTimeAndBlock(days * DAY + 1);
  };

  describe('unstuck funds from passUndind job', () => {
    it('manually set liquidity on keep3rV1 though escrow', async () => {
      const governor = keep3rLiquidityManagerJobGovernance;
      for (const job of passUnwindeJobs) {
        const owner = await wallet.impersonate(job.owner);
        const jobAddress = job.job;
        const amount = await keep3rLiquidityManager.connect(owner).userJobLiquidityLockedAmount(owner._address, jobAddress, slpETHKP3R);
        console.log('owner job liquidity:', amount.toString());

        await expect(
          keep3rLiquidityManager.connect(owner).removeIdleLiquidityFromJob(slpETHKP3R, jobAddress, amount, { gasPrice: 0 })
        ).to.be.revertedWith('Keep3rLiquidityManager::liquidity-still-locked');

        // grab step and next action
        await logKeeperJobData(jobAddress);
        await logJobData(jobAddress, owner._address);

        // set liquidity
        console.log('# set 2 wei liqudiity');
        const slpGovernorAmount = 2;
        await slp.connect(governor).transfer(escrow1.address, slpGovernorAmount);

        console.log('# add liquidity');
        await keep3rLiquidityManager.connect(governor).addLiquidityToJob(escrow1.address, slpETHKP3R, jobAddress, slpGovernorAmount);
        await logKeeperJobData(jobAddress);
        await logJobData(jobAddress, owner._address);

        console.log('# wait 3 days');
        await advanceDays(3);
        await logJobData(jobAddress, owner._address);

        console.log('# apply credit');
        await keep3rLiquidityManager.connect(governor).applyCreditToJob(escrow1.address, slpETHKP3R, jobAddress);

        // forceWork
        console.log('# forceWork');
        await keep3rLiquidityManager.connect(governor).forceWork(jobAddress);
        await logKeeperJobData(jobAddress);
        await logJobData(jobAddress, owner._address);

        console.log('# wait 14 days');
        await advanceDays(14);
        await logJobData(jobAddress, owner._address);

        console.log('# forceWork');
        await keep3rLiquidityManager.connect(governor).forceWork(jobAddress);
        await logKeeperJobData(jobAddress);
        await logJobData(jobAddress, owner._address);

        console.log('# remove user liquidity');
        await keep3rLiquidityManager.connect(owner).removeIdleLiquidityFromJob(slpETHKP3R, jobAddress, amount, { gasPrice: 0 });
        await keep3rLiquidityManager.connect(owner).withdrawLiquidity(slpETHKP3R, amount);

        // Add 2 wei liquidity to job to avoid lock
        await keep3rLiquidityManager.connect(governor).setMinAmount(slpETHKP3R, 2);
        await slp.connect(governor).approve(keep3rLiquidityManager.address, 2, { gasPrice: 0 });
        await keep3rLiquidityManager.connect(governor).depositLiquidity(slpETHKP3R, 2, { gasPrice: 0 });
        await keep3rLiquidityManager.connect(governor).setJobLiquidityAmount(slpETHKP3R, job.job, 2, { gasPrice: 0 });

        let workableFromTheStart = await keep3rLiquidityManager.workable(job.job);
        let lastAction = (await keep3rLiquidityManager.getNextAction(job.job))._action;
        for (let i = 0; i < 100; i++) {
          const nextAction = await keep3rLiquidityManager.getNextAction(job.job);
          if (workableFromTheStart || lastAction !== nextAction._action) {
            if (workableFromTheStart) workableFromTheStart = false;
            if (nextAction._action !== 0) {
              // console.log(`[${job.job}] Escrow ${escrow1Address.toLowerCase() == nextAction._escrow.toLowerCase() ? '1' : '2'} — Execute ${
              //     actions[nextAction._action]
              //   }`)
              lastAction = nextAction;
              await keep3rLiquidityManagerJob.connect(keep3rLiquidityManagerJobGovernance).forceWork(job.job, { gasPrice: 0 });
            }
          }
          await evm.advanceTimeAndBlock(DAY);
          currentTimestamp += DAY;
        }
      }
    });
    it.skip('[DOES NOT WORK] add 1wei LP and try work to increase cycle', async () => {
      const governor = keep3rLiquidityManagerJobGovernance;
      for (const job of passUnwindeJobs) {
        const owner = await wallet.impersonate(job.owner);
        const jobAddress = job.job;
        const amount = await keep3rLiquidityManager.connect(owner).userJobLiquidityLockedAmount(owner._address, jobAddress, slpETHKP3R);
        console.log('owner job liquidity:', amount.toString());

        const slpGovernorAmount = 2;
        // Set min
        await keep3rLiquidityManager.connect(governor).setMinAmount(slpETHKP3R, slpGovernorAmount, { gasPrice: 0 });

        // add 2 slp as governor
        await slp.connect(governor).approve(keep3rLiquidityManager.address, slpGovernorAmount);
        await keep3rLiquidityManager.connect(governor).depositLiquidity(slpETHKP3R, slpGovernorAmount);
        const governorIdle = await keep3rLiquidityManager.userLiquidityIdleAmount(governor._address, slpETHKP3R);
        console.log('governorIdle:', governorIdle.toString());

        await expect(
          keep3rLiquidityManager.connect(owner).removeIdleLiquidityFromJob(slpETHKP3R, jobAddress, amount, { gasPrice: 0 })
        ).to.be.revertedWith('Keep3rLiquidityManager::liquidity-still-locked');

        // grab step and next action
        await logJobData(jobAddress, owner._address);

        // set liquidity
        console.log('# set 2 wei liqudiity');
        await keep3rLiquidityManager.connect(governor).setJobLiquidityAmount(slpETHKP3R, jobAddress, slpGovernorAmount, { gasPrice: 0 });

        await logJobData(jobAddress, owner._address);

        console.log('# wait 20 days');
        await advanceDays(20);

        // forceWork
        console.log('# forceWork');
        await keep3rLiquidityManager.connect(governor).forceWork(jobAddress);
        await logJobData(jobAddress, owner._address);

        console.log('# wait 20 days');
        await advanceDays(20);
        await logJobData(jobAddress, owner._address);

        console.log('# forceWork');
        await keep3rLiquidityManager.connect(governor).forceWork(jobAddress);
        await logJobData(jobAddress, owner._address);

        console.log('# wait 17 days');
        await advanceDays(17);
        await logJobData(jobAddress, owner._address);

        await keep3rLiquidityManager.connect(owner).withdrawLiquidity(slpETHKP3R, amount);
      }
    });
  });
});
