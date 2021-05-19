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
const forkBlockNumber = 12477943;

const keep3rAddress = '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44';
const keep3rLiquidityManagerAddress = '0xf14cb1feb6c40f26d9ca0ea39a9a613428cdc9ca';
const keep3rLiquidityManagerJobAddress = '0x7e0cc5edf2dd01fc543d698b7e00ff54c6c39085';
const escrow1Address = '0xc3c272d18e31086ea7ff0e51474ade320ef5b3e1';
const escrow2Address = '0x39392ae1b305161ecb500be8da88444c5b5a8ed5';

const keep3rLiquidityManagerGovernanceAddress = '0x37fc68835dd1ef6d7660fa47e87774d4678e7bcb';
const keep3rLiquidityManagerJobGovernanceAddress = '0x37fc68835dd1ef6d7660fa47e87774d4678e7bcb';
const slpETHKP3R = '0xaf988afF99d3d0cb870812C325C588D8D8CB7De8';
const slpWhaleAddress = '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd';

type JobAndOwner = { job: string; owner: string };
const forwardJobs: JobAndOwner[] = [
  {
    job: '0x7E0Cc5edF2DD01FC543D698b7E00ff54c6c39085',
    owner: '0x37fc68835dD1EF6D7660fA47E87774d4678e7BCB',
  },
  {
    job: '0x620bd1E1D1d845c8904aC03F6cd6b87706B7596b',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
  {
    job: '0x02027bDA2425204f152B8aa35Fb78687D65E1AF5',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
  {
    job: '0x4a479E4457841D2D2Ff86e5A5389300963880C10',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
  {
    job: '0x448E2f3b02dCC8A00c420b99Ae06a474A13275A1',
    owner: '0x66600b59f86F51c0052D369433C3a1D10d87672B',
  },
  {
    job: '0xaed599AADfEE8e32Cedb59db2b1120d33A7bACFD',
    owner: '0x0d5dc686d0a2abbfdafdfb4d0533e886517d4e83',
  },
  {
    job: '0x2ef7801c6A9d451EF20d0F513c738CC012C57bC3',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
  {
    job: '0xE5a7db399dEC2c5ddEfeBc52ea70f127284D118d',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
  {
    job: '0xeE15010105b9BB564CFDfdc5cee676485092AEDd',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
];
const unwindingJobs: JobAndOwner[] = [
  {
    job: '0x7b28163e7a3db17eF2dba02BCf7250A8Dc505057',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
];
const passUnwindeJobs: JobAndOwner[] = [
  {
    job: '0x5efD850044Ba76b8ffE49437CB301be3568bA696',
    owner: '0x5f0845101857d2A91627478e302357860b1598a1',
  },
];

describe.only('Keep3rLiquidityManager', () => {
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
    await evm.reset({
      jsonRpcUrl: process.env.MAINNET_HTTPS_URL,
      blockNumber: forkBlockNumber,
    });

    startingTimestamp = (await ethers.provider.getBlock(forkBlockNumber)).timestamp;

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

  const getJobToCorrectCycle = async (job: string, signer: JsonRpcSigner) => {
    logs.push({
      log: `[${job}] Job Owner — Execute Set job liquidity amount to 2 wei`,
      timestamp: currentTimestamp,
    });
    currentTimestamp += 1;
    const amountToSave = await keep3rLiquidityManager.connect(signer).userJobLiquidityAmount(signer._address, job, slpETHKP3R);
    await keep3rLiquidityManager.connect(keep3rLiquidityManagerGovernance).setMinAmount(slpETHKP3R, 0);
    await slp.connect(slpWhale).transfer(signer._address, 2, { gasPrice: 0 });
    await slp.connect(signer).approve(keep3rLiquidityManager.address, 2, { gasPrice: 0 });
    await keep3rLiquidityManager.connect(signer).depositLiquidity(slpETHKP3R, 2, { gasPrice: 0 });
    await keep3rLiquidityManager.connect(signer).setJobLiquidityAmount(slpETHKP3R, job, 2, { gasPrice: 0 });

    let failSwitch = false;
    let changedAmountCycle = await keep3rLiquidityManager.jobCycle(job);
    let workableFromTheStart = await keep3rLiquidityManager.workable(job);
    let lastAction = (await keep3rLiquidityManager.getNextAction(job))._action;
    while (!failSwitch) {
      const nextAction = await keep3rLiquidityManager.getNextAction(job);
      if (workableFromTheStart || lastAction !== nextAction._action) {
        if (workableFromTheStart) workableFromTheStart = false;
        if (nextAction._action !== 0) {
          logs.push({
            log: `[${job}] Escrow ${escrow1Address.toLowerCase() == nextAction._escrow.toLowerCase() ? '1' : '2'} — Execute ${
              actions[nextAction._action]
            }`,
            timestamp: currentTimestamp,
          });
          lastAction = nextAction;
          await keep3rLiquidityManagerJob.connect(keep3rLiquidityManagerJobGovernance).forceWork(job, { gasPrice: 0 });
          if (changedAmountCycle.add(2).eq(await keep3rLiquidityManager.jobCycle(job))) {
            failSwitch = true;
          }
        }
      }
      await evm.advanceTimeAndBlock(DAY);
      currentTimestamp += DAY;
    }
    // UNCOMMENTING THIS CODE WILL PROVE THAT
    // FUNDS WITH 2 WEIS MAKE THE RESCUE NOT TO GET BRICKED
    // for (let i = 0; i < 1000; i++) {
    //   const nextAction = await keep3rLiquidityManager.getNextAction(job);
    //   if (workableFromTheStart || lastAction !== nextAction._action) {
    //     if (workableFromTheStart) workableFromTheStart = false;
    //     if (nextAction._action !== 0) {
    //       logs.push({
    //         log: `[${job}] Escrow ${escrow1Address.toLowerCase() == nextAction._escrow.toLowerCase() ? '1' : '2'} — Execute ${
    //           actions[nextAction._action]
    //         }`,
    //         timestamp: currentTimestamp,
    //       });
    //       console.log(`[${job}] Escrow ${escrow1Address.toLowerCase() == nextAction._escrow.toLowerCase() ? '1' : '2'} — Execute ${
    //         actions[nextAction._action]
    //       }`)
    //       lastAction = nextAction;
    //       await keep3rLiquidityManagerJob.connect(keep3rLiquidityManagerJobGovernance).forceWork(job, { gasPrice: 0 });
    //       if (changedAmountCycle.add(2).eq(await keep3rLiquidityManager.jobCycle(job))) {
    //         failSwitch = true;
    //       }
    //     }
    //   }
    //   await evm.advanceTimeAndBlock(DAY);
    //   currentTimestamp += DAY;
    // }
    logs.push({
      log: `[${job}] Recover ${utils.formatEther(amountToSave)}`,
      timestamp: currentTimestamp,
    });
  };

  describe('Saving jobs in forward state', () => {
    it('works jobs until it needs to, and then takes funds', async () => {
      let totalAmountSaved = BigNumber.from('0');
      const jobAmounts: any = {};
      for (let i = 0; i < forwardJobs.length; i++) {
        process.stdout.write('.'.repeat(i + 1));
        currentTimestamp = startingTimestamp;
        const signer = await wallet.impersonate(forwardJobs[i].owner);
        const job = forwardJobs[i].job;
        const amount = await keep3rLiquidityManager.connect(signer).userJobLiquidityAmount(signer._address, job, slpETHKP3R);
        jobAmounts[job] = amount;
        await getJobToCorrectCycle(job, signer);
        await keep3rLiquidityManager.connect(signer).removeIdleLiquidityFromJob(slpETHKP3R, job, amount.sub(2), { gasPrice: 0 });
        await keep3rLiquidityManager.connect(signer).withdrawLiquidity(slpETHKP3R, amount.sub(2), { gasPrice: 0 });
        totalAmountSaved = totalAmountSaved.add(amount);
      }
      process.stdout.write('\n');
    });
  });

  describe('Saving job in unwinding state', () => {
    it('saves liquidity from getting bricked', async () => {
      currentTimestamp = startingTimestamp;
      const job = unwindingJobs[0];
      let notOnRemoveLiquidity = true;
      while (notOnRemoveLiquidity) {
        const nextAction = await keep3rLiquidityManager.getNextAction(job.job);
        if (nextAction._action == 4) {
          notOnRemoveLiquidity = false;
          await keep3rLiquidityManagerJob.connect(keep3rLiquidityManagerJobGovernance).forceWork(job.job, { gasPrice: 0 });
          logs.push({
            log: `[${job.job}] Escrow ${escrow1Address.toLowerCase() == nextAction._escrow.toLowerCase() ? '1' : '2'} — Execute ${
              actions[nextAction._action]
            }`,
            timestamp: currentTimestamp,
          });
        } else {
          await evm.advanceTimeAndBlock(DAY);
          currentTimestamp += DAY;
        }
      }
      const signer = await wallet.impersonate(job.owner);
      const amount = await keep3rLiquidityManager.connect(signer).userJobLiquidityLockedAmount(signer._address, job.job, slpETHKP3R);
      await keep3rLiquidityManager.connect(signer).removeIdleLiquidityFromJob(slpETHKP3R, job.job, amount, { gasPrice: 0 });
      await keep3rLiquidityManager.connect(signer).withdrawLiquidity(slpETHKP3R, amount, { gasPrice: 0 });
      logs.push({
        log: `[${job.job}] Recover ${utils.formatEther(amount)}`,
        timestamp: currentTimestamp,
      });
    });
  });

  describe('After saving the day', () => {
    it('prints logs', () => {
      console.log('Start:', moment.unix(startingTimestamp).toString());
      logs = logs.sort((a, b) => a.timestamp - b.timestamp);
      logs.forEach((log) => {
        console.log(log.log, moment.unix(log.timestamp).utc(false).toString());
      });
    });
  });
});
