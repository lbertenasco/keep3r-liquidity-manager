import { ethers, network } from 'hardhat';
import config from '../../.config.json';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { Contract, ContractFactory, utils } from 'ethers';
import { expect } from 'chai';
import { JsonRpcSigner } from '@ethersproject/providers';
import { evm } from '../utils';
import { e18, ZERO_ADDRESS } from '../../utils/web3-utils';

const DAY = 60 * 60 * 24;
const mainnetContracts = config.contracts.mainnet;
const escrowContracts = mainnetContracts.escrow;
const keep3rContracts = {
  keep3r: '0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44',
  keep3rHelper: '0x24e1565ED1D6530cd977A6A8B3e327b9F53A9fd2',
  keep3rV1Oracle: '0x73353801921417F465377c8d898c6f4C0270282C',
};

describe('Keep3rLiquidityManager', () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let keep3r: Contract;
  let keep3rV1Helper: Contract;
  let keep3rV1Oracle: Contract;
  let keep3rGovernance: JsonRpcSigner;
  let keeper: JsonRpcSigner;

  let lpWhale: JsonRpcSigner;
  const lpWhaleAddress: string = '0x645e4bfd69a692bb7314ee5b0568342d0a34388b';
  const uniKp3rEthLPAddress: string =
    '0x87fEbfb3AC5791034fD5EF1a615e9d9627C2665D';
  const lpAddress: string = uniKp3rEthLPAddress;
  let lp: Contract;

  let Keep3rEscrow: ContractFactory;
  let Keep3rLiquidityManager: ContractFactory;
  let Keep3rLiquidityManagerJob: ContractFactory;

  let escrow1: Contract;
  let escrow2: Contract;
  let keep3rLiquidityManager: Contract;
  let keep3rLiquidityManagerJob: Contract;

  let forkBlockNumber: number;

  before('Setup accounts and contracts', async () => {
    [owner, alice, bob] = await ethers.getSigners();
    Keep3rEscrow = await ethers.getContractFactory('Keep3rEscrow');
    Keep3rLiquidityManager = await ethers.getContractFactory(
      'Keep3rLiquidityManager'
    );
    Keep3rLiquidityManagerJob = await ethers.getContractFactory(
      'Keep3rLiquidityManagerJob'
    );
    forkBlockNumber = await ethers.provider.getBlockNumber();
  });

  beforeEach(async () => {
    await evm.reset({
      jsonRpcUrl: process.env.MAINNET_HTTPS_URL,
      blockNumber: forkBlockNumber,
    });
    // impersonate keep3rGovernance
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [config.accounts.mainnet.keep3rGovernance],
    });
    keep3rGovernance = ethers.provider.getSigner(
      config.accounts.mainnet.keep3rGovernance
    );
    // impersonate keeper
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [config.accounts.mainnet.keeper],
    });
    keeper = ethers.provider.getSigner(config.accounts.mainnet.keeper);
    // impersonate lp whale
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [lpWhaleAddress],
    });
    lpWhale = ethers.provider.getSigner(lpWhaleAddress);

    keep3r = await ethers.getContractAt(
      'IKeep3rV1',
      keep3rContracts.keep3r,
      keep3rGovernance
    );
    keep3rV1Helper = await ethers.getContractAt(
      'IKeep3rV1Helper',
      keep3rContracts.keep3rHelper,
      keep3rGovernance
    );
    keep3rV1Oracle = await ethers.getContractAt(
      'IKeep3rV1Oracle',
      keep3rContracts.keep3rV1Oracle,
      keeper
    );
    lp = await ethers.getContractAt('IERC20', lpAddress);

    // Deploy contracts
    escrow1 = await Keep3rEscrow.deploy(keep3r.address);
    escrow2 = await Keep3rEscrow.deploy(keep3r.address);
    keep3rLiquidityManager = await Keep3rLiquidityManager.deploy(
      keep3r.address,
      escrow1.address,
      escrow2.address
    );

    // Set escrow governance
    await escrow1.setPendingGovernor(keep3rLiquidityManager.address);
    await escrow2.setPendingGovernor(keep3rLiquidityManager.address);
    await keep3rLiquidityManager.acceptGovernorOnEscrow(escrow1.address);
    await keep3rLiquidityManager.acceptGovernorOnEscrow(escrow2.address);

    keep3rLiquidityManagerJob = await Keep3rLiquidityManagerJob.deploy(
      keep3rLiquidityManager.address,
      keep3r.address,
      ZERO_ADDRESS,
      e18.mul(50), // 50 KP3R
      0,
      0,
      true
    );

    await keep3r.addJob(keep3rLiquidityManagerJob.address);
    await keep3r.addKPRCredit(keep3rLiquidityManagerJob.address, e18.mul(100));
  });

  describe('setKeep3r', () => {
    it('TODO');
  });

  describe('setKeep3rRequirements', () => {
    it('TODO');
  });

  describe('setJobRewardMultiplier', () => {
    it('TODO');
  });

  describe('jobs', () => {
    it('TODO');
  });

  describe('addLiquidityToJob', () => {
    context('when no min liquidity set', () => {
      it('reverts', async () => {
        await expect(
          addLiquidityToJob(keep3rLiquidityManagerJob.address)
        ).to.be.revertedWith('Keep3rLiquidityManager::liquidity-min-not-set');
      });
    });
    context('when min liquidity is set', () => {
      beforeEach(async () => {
        await keep3rLiquidityManager.setMinAmount(lp.address, e18);
      });
      it('succeeds', async () => {
        const amount = e18.mul(10);
        await addLiquidityToJob(keep3rLiquidityManagerJob.address, amount);
        expect(
          await keep3rLiquidityManager.userJobLiquidityAmount(
            owner.address,
            keep3rLiquidityManagerJob.address,
            lp.address
          )
        ).to.eq(amount);
      });
    });
  });

  describe('workable', () => {
    context('when no liquidity on job', () => {
      it('revert', async () => {
        await expect(
          keep3rLiquidityManagerJob.callStatic.workable(
            keep3rLiquidityManagerJob.address
          )
        ).to.be.revertedWith(
          'Keep3rLiquidityManager::getNextAction:job-has-no-liquidity'
        );
      });
    });

    context('when is workable', () => {
      beforeEach(async () => {
        await keep3rLiquidityManager.setMinAmount(lp.address, e18);
        await addLiquidityToJob(keep3rLiquidityManagerJob.address);
      });
      it('returns true', async () => {
        expect(
          await keep3rLiquidityManagerJob.callStatic.workable(
            keep3rLiquidityManagerJob.address
          )
        ).to.be.true;
      });
    });
  });

  describe('work', () => {
    beforeEach(async () => {
      await keep3rLiquidityManager.setMinAmount(lp.address, e18);
      await addLiquidityToJob(keep3rLiquidityManagerJob.address);
    });
    context('when no setJob', () => {
      it('revert', async () => {
        await expect(
          keep3rLiquidityManagerJob
            .connect(keeper)
            .callStatic.work(keep3rLiquidityManagerJob.address)
        ).to.be.revertedWith(
          'Keep3rLiquidityManagerJobHandler::onlyJob:msg-sender-is-not-the-correct-job'
        );
      });
    });

    context('with setJob', () => {
      beforeEach(async () => {
        await keep3rLiquidityManager.setJob(keep3rLiquidityManagerJob.address);
      });
      it('succeeds', async () => {
        expect(
          await keep3rLiquidityManagerJob
            .connect(keeper)
            .callStatic.work(keep3rLiquidityManagerJob.address)
        ).to.be.gt(0);
      });
    });
  });

  describe('full cycle', () => {
    const amount = e18.mul(100);
    beforeEach(async () => {
      await keep3rLiquidityManager.setMinAmount(lp.address, e18);
      await addLiquidityToJob(keep3rLiquidityManagerJob.address, amount);
      await keep3rLiquidityManager.setJob(keep3rLiquidityManagerJob.address);
    });
    it('succeeds', async () => {
      // addLiquidity on escrow1 and waits 3 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(3);

      // applyCredits on escrow1 and waits 14 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(13);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(1);

      // addLiquidity on escrow2 and waits 3 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(3);

      // applyCredits on escrow2 and unbond on escrow1 and waits 14 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(14);

      // removeLiquidity on escrow1 and addLiquidity on escrow1 and waits 3 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(3);

      // applyLiquidity on escrow1 and unbond on escrow2 and waits 14 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(14);

      // removeLiquidity on escrow2 and addLiquidity on escrow2 and waits 3 days + cycle 1 more time
      await cycleWork(1);

      // REMOVE liquidity
      await removeLiquidityFromJob(keep3rLiquidityManagerJob.address);

      // removeLiquidity on escrow1 and waits 3 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(3);

      // unbond on escrow2 and waits 14 days
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      expect(
        await keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.false;
      await advanceDays(14);

      // removeLiquidity on escrow2
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      await expect(
        keep3rLiquidityManagerJob.callStatic.workable(
          keep3rLiquidityManagerJob.address
        )
      ).to.be.revertedWith(
        'Keep3rLiquidityManager::getNextAction:job-has-no-liquidity'
      );

      // idle liquidity
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(
          owner.address,
          keep3rLiquidityManagerJob.address,
          lp.address
        )
      ).to.eq(0);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          owner.address,
          keep3rLiquidityManagerJob.address,
          lp.address
        )
      ).to.eq(amount);
      expect(
        await keep3rLiquidityManager.callStatic.jobCycle(
          keep3rLiquidityManagerJob.address
        )
      ).to.eq(4);
    });
  });

  describe('broken cycle', () => {
    const amount = e18.mul(100);
    beforeEach(async () => {
      await keep3rLiquidityManager.setMinAmount(lp.address, e18);
      await addLiquidityToJob(keep3rLiquidityManagerJob.address, amount);
      await keep3rLiquidityManager.setJob(keep3rLiquidityManagerJob.address);
    });
    it('succeeds', async () => {
      await cycleWork(2);

      // removes 2 trirds from desired liquidity
      const newAmount = amount.div(3).div(2).mul(2); // normalizes amount to be pair
      await keep3rLiquidityManager.setJobLiquidityAmount(
        lp.address,
        keep3rLiquidityManagerJob.address,
        newAmount
      );

      await cycleWork(1);

      // idle liquidity
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(
          owner.address,
          keep3rLiquidityManagerJob.address,
          lp.address
        )
      ).to.eq(newAmount);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          owner.address,
          keep3rLiquidityManagerJob.address,
          lp.address
        )
      ).to.eq(amount);
      expect(
        await keep3rLiquidityManager.callStatic.jobCycle(
          keep3rLiquidityManagerJob.address
        )
      ).to.eq(1);
    });
  });

  describe('recover LPs after cycle', () => {
    const amount = e18.mul(100);
    beforeEach(async () => {
      await keep3rLiquidityManager.setMinAmount(lp.address, e18);
      await addLiquidityToJob(keep3rLiquidityManagerJob.address, amount);
      await keep3rLiquidityManager.setJob(keep3rLiquidityManagerJob.address);
    });
    it('succeeds', async () => {
      await cycleWork(1);

      await removeLiquidityFromJob(keep3rLiquidityManagerJob.address);

      // wait 3 more days to properly unbond from escrow2
      await advanceDays(3);
      // unbond last liquidity
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);
      await advanceDays(14);
      await keep3rLiquidityManagerJob
        .connect(keeper)
        .work(keep3rLiquidityManagerJob.address);

      // remove liquidity from job
      await keep3rLiquidityManager.removeIdleLiquidityFromJob(
        lp.address,
        keep3rLiquidityManagerJob.address,
        amount
      );

      const lpBeforeWithdrawal = await lp.balanceOf(owner.address);
      // withdraw liquidity
      await keep3rLiquidityManager.withdrawLiquidity(lp.address, amount);
      const lpAfterWithdrawal = await lp.balanceOf(owner.address);

      // user liquidity
      expect(lpAfterWithdrawal.sub(lpBeforeWithdrawal)).to.eq(amount);

      // idle liquidity
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(
          owner.address,
          keep3rLiquidityManagerJob.address,
          lp.address
        )
      ).to.eq(0);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          owner.address,
          keep3rLiquidityManagerJob.address,
          lp.address
        )
      ).to.eq(0);
      expect(
        await keep3rLiquidityManager.callStatic.jobCycle(
          keep3rLiquidityManagerJob.address
        )
      ).to.eq(1);
    });
  });

  describe('cycle after removed job', () => {
    const amount = e18.mul(100);
    let randomJob: string;
    beforeEach(async () => {
      await keep3rLiquidityManager.setMinAmount(lp.address, e18);
      await keep3rLiquidityManager.setJob(keep3rLiquidityManagerJob.address);

      // setup random job
      randomJob = '0x73353801921417F465377c8d898c6f4C0270282C'; // Keep3rV1Oracle
      await addLiquidityToJob(randomJob, amount);
    });
    it('succeeds', async () => {
      const job = randomJob;
      await cycleWork(4, job);

      // removes job from keep3r
      await keep3r.removeJob(job);

      // reverts on addLiquidityToJob
      await expect(keep3rLiquidityManagerJob.connect(keeper).work(job)).to.be
        .reverted;

      // remove liquidity
      await removeLiquidityFromJob(job);

      await cycleWork(1, job);
      await keep3rLiquidityManagerJob.connect(keeper).work(job);

      // idle liquidity
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(
          owner.address,
          job,
          lp.address
        )
      ).to.eq(0);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          owner.address,
          job,
          lp.address
        )
      ).to.eq(amount);
      expect(await keep3rLiquidityManager.callStatic.jobCycle(job)).to.eq(4);

      // remove liquidity from job
      await keep3rLiquidityManager.removeIdleLiquidityFromJob(
        lp.address,
        job,
        amount
      );
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          owner.address,
          job,
          lp.address
        )
      ).to.eq(0);
    });
  });

  describe('alice and bob provide liquidity', () => {
    const amount = e18.mul(100);
    beforeEach(async () => {
      await keep3rLiquidityManager.setMinAmount(lp.address, e18);
      await keep3rLiquidityManager.setJob(keep3rLiquidityManagerJob.address);
    });
    it('succeeds', async () => {
      const job = keep3rLiquidityManagerJob.address;

      // alice
      await lp.connect(lpWhale).transfer(alice.address, amount);
      await lp.connect(alice).approve(keep3rLiquidityManager.address, amount);
      await keep3rLiquidityManager
        .connect(alice)
        .depositLiquidity(lp.address, amount);
      // bob
      await lp.connect(lpWhale).transfer(bob.address, amount);
      await lp.connect(bob).approve(keep3rLiquidityManager.address, amount);
      await keep3rLiquidityManager
        .connect(bob)
        .depositLiquidity(lp.address, amount);

      // alice adds liquidity
      await keep3rLiquidityManager
        .connect(alice)
        .setJobLiquidityAmount(lp.address, job, amount);
      await cycleWork(4, job);

      // bob adds liquidity
      await keep3rLiquidityManager
        .connect(bob)
        .setJobLiquidityAmount(lp.address, job, amount);
      await cycleWork(1, job);
      await keep3rLiquidityManager
        .connect(bob)
        .setJobLiquidityAmount(lp.address, job, 0);
      await cycleWork(2, job);

      // idle liquidity
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(
          alice.address,
          job,
          lp.address
        )
      ).to.eq(amount);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(
          bob.address,
          job,
          lp.address
        )
      ).to.eq(0);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          bob.address,
          job,
          lp.address
        )
      ).to.eq(amount);
      expect(await keep3rLiquidityManager.callStatic.jobCycle(job)).to.eq(5);

      // remove liquidity from job
      await keep3rLiquidityManager
        .connect(bob)
        .removeIdleLiquidityFromJob(lp.address, job, amount);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          bob.address,
          job,
          lp.address
        )
      ).to.eq(0);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          alice.address,
          job,
          lp.address
        )
      ).to.eq(amount);

      await keep3rLiquidityManager
        .connect(alice)
        .setJobLiquidityAmount(lp.address, job, 0);
      await cycleWork(1, job);
      await keep3rLiquidityManagerJob.connect(keeper).work(job);

      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityAmount(
          alice.address,
          job,
          lp.address
        )
      ).to.eq(0);
      await keep3rLiquidityManager
        .connect(alice)
        .removeIdleLiquidityFromJob(lp.address, job, amount);
      expect(
        await keep3rLiquidityManager.callStatic.userJobLiquidityLockedAmount(
          alice.address,
          job,
          lp.address
        )
      ).to.eq(0);
    });
  });

  const advanceDays = async (days: number) => {
    await evm.advanceTimeAndBlock(days * DAY);
    await updateOraclePrices();
  };

  const updateOraclePrices = async () => {
    await keep3rV1Oracle.updatePair(uniKp3rEthLPAddress);
  };

  const addLiquidityToJob = async (job: string, amount = e18.mul(100)) => {
    // get liquidity
    await lp.connect(lpWhale).transfer(owner.address, amount);
    // approve
    await lp.approve(keep3rLiquidityManager.address, amount);
    // depositLiquidity
    await keep3rLiquidityManager.depositLiquidity(lp.address, amount);
    // get userLiquidityIdleAmount
    const idleLiquidity = await keep3rLiquidityManager.callStatic.userLiquidityIdleAmount(
      owner.address,
      lp.address
    );
    // setJobLiquidityAmount
    await keep3rLiquidityManager.setJobLiquidityAmount(
      lp.address,
      job,
      idleLiquidity
    );
  };

  const cycleWork = async (
    times: number,
    job: string = keep3rLiquidityManagerJob.address
  ) => {
    for (let i = 0; i < times; i++) {
      await keep3rLiquidityManagerJob.connect(keeper).work(job);
      expect(await keep3rLiquidityManagerJob.callStatic.workable(job)).to.be
        .false;
      await advanceDays(3);

      // applyLiquidity on escrow2 and unbond on escrow1 and waits 14 days
      await keep3rLiquidityManagerJob.connect(keeper).work(job);
      expect(await keep3rLiquidityManagerJob.callStatic.workable(job)).to.be
        .false;
      await advanceDays(14);
    }
  };

  const removeLiquidityFromJob = async (job: string) => {
    // setJobLiquidityAmount to 0
    await keep3rLiquidityManager.setJobLiquidityAmount(lp.address, job, 0);
  };

  const shouldBehaveLikeWorkRevertsWhenNotFromWorker = async (
    workData: any
  ) => {
    await expect(
      keep3rLiquidityManagerJob.workForBond(
        keep3rLiquidityManagerJob.address,
        workData
      )
    ).to.be.revertedWith('keep3r::isKeeper:keeper-not-min-requirements');
  };

  const shouldBehaveLikeWorkedForBonds = async (workData: any) => {
    const initialBonded = await keep3rV1Helper.callStatic.bonds(
      await keeper.getAddress()
    );
    await keep3rLiquidityManagerJob
      .connect(keeper)
      .workForBond(keep3rLiquidityManagerJob.address, workData);
    expect(
      await keep3rV1Helper.callStatic.bonds(await keeper.getAddress())
    ).to.be.gt(initialBonded);
  };

  const shouldBehaveLikeWorkWorked = async (workData: any) => {
    const initialTimesWorked = await keep3rLiquidityManagerJob.timesWorked();
    await keep3rLiquidityManagerJob
      .connect(keeper)
      .workForBond(keep3rLiquidityManagerJob.address, workData);
    expect(await keep3rLiquidityManagerJob.timesWorked()).to.equal(
      initialTimesWorked.add(1)
    );
  };

  const shouldBehaveLikeWorkUpdatedCredits = async (workData: any) => {
    const initialUsedCredits = await keep3rLiquidityManagerJob.usedCredits(
      keep3rLiquidityManagerJob.address
    );
    await keep3rLiquidityManagerJob
      .connect(keeper)
      .workForTokens(keep3rLiquidityManagerJob.address, workData);
    expect(
      await keep3rLiquidityManagerJob.usedCredits(
        keep3rLiquidityManagerJob.address
      )
    ).to.be.gt(initialUsedCredits);
  };

  const shouldBehaveLikeWorkEmittedEvent = async (workData: any) => {
    await expect(
      keep3rLiquidityManagerJob
        .connect(keeper)
        .workForBond(keep3rLiquidityManagerJob.address, workData)
    ).to.emit(keep3rLiquidityManagerJob, 'Worked');
  };

  const shouldBehaveLikeWorkHitMaxCredits = async () => {
    const newKeep3rJob = await Keep3rLiquidityManagerJob.deploy(
      keep3rLiquidityManagerJob.address,
      utils.parseUnits('150', 'gwei')
    );
    await keep3rLiquidityManagerJob.addValidJob(
      newKeep3rJob.address,
      utils.parseUnits('0.2', 'ether'), // _maxCredits
      1_000 // _rewardMultiplier 1x
    );
    const workData = await newKeep3rJob.callStatic.getWorkData();
    let tested = false;
    while (!tested) {
      try {
        await keep3rLiquidityManagerJob
          .connect(keeper)
          .workForBond(newKeep3rJob.address, workData);
      } catch (err) {
        expect(err.message).to.equal(
          'VM Exception while processing transaction: revert Keep3rProxyJob::update-credits:used-credits-exceed-max-credits'
        );
        tested = true;
      }
    }
  };

  const shouldBehaveLikeRewardMultiplierMatters = async (workData: any) => {
    const newKeep3rJob = await Keep3rLiquidityManagerJob.deploy(
      keep3rLiquidityManagerJob.address,
      utils.parseUnits('150', 'gwei')
    );
    await keep3rLiquidityManagerJob.addValidJob(
      newKeep3rJob.address,
      utils.parseUnits('0.2', 'ether'), // _maxCredits
      0_005 // _rewardMultiplier 0.5x
    );
    const initial1XKeep3r = await keep3rLiquidityManagerJob.usedCredits(
      keep3rLiquidityManagerJob.address
    );
    await keep3rLiquidityManagerJob
      .connect(keeper)
      .workForBond(keep3rLiquidityManagerJob.address, workData);
    const consumedWith1X = (
      await keep3rLiquidityManagerJob.usedCredits(
        keep3rLiquidityManagerJob.address
      )
    ).sub(initial1XKeep3r);

    const newWorkData = await newKeep3rJob.callStatic.getWorkData();
    const initial0500XKeep3r = await keep3rLiquidityManagerJob.usedCredits(
      newKeep3rJob.address
    );
    await keep3rLiquidityManagerJob
      .connect(keeper)
      .workForBond(newKeep3rJob.address, newWorkData);
    const consumedWith0500X = (
      await keep3rLiquidityManagerJob.usedCredits(newKeep3rJob.address)
    ).sub(initial0500XKeep3r);
    expect(consumedWith1X).to.be.gt(consumedWith0500X.mul(2));
  };

  describe('isValidJob', () => {
    it('TODO');
  });
});
