import { ethers, network } from 'hardhat';
import config from '../../.config.json';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { Contract, ContractFactory, utils } from 'ethers';
import { expect } from 'chai';
import { JsonRpcSigner } from '@ethersproject/providers';
import { evm } from '../utils';
import { e18, ZERO_ADDRESS } from '../../utils/web3-utils';

const mainnetContracts = config.contracts.mainnet;
const escrowContracts = mainnetContracts.escrow;

describe('Keep3rLiquidityManager', () => {
  let owner: SignerWithAddress;
  let keep3r: Contract;
  let keep3rV1Helper: Contract;
  let keep3rGovernance: JsonRpcSigner;
  let keeper: JsonRpcSigner;

  let lpWhale: JsonRpcSigner;
  const lpWhaleAddress: string = '0x645e4bfd69a692bb7314ee5b0568342d0a34388b';
  const lpAddress: string = '0x87febfb3ac5791034fd5ef1a615e9d9627c2665d';
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
    [owner] = await ethers.getSigners();
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
      escrowContracts.keep3r,
      keep3rGovernance
    );
    keep3rV1Helper = await ethers.getContractAt(
      'IKeep3rV1Helper',
      mainnetContracts.keep3rHelper.address,
      keep3rGovernance
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

  const addLiquidityToJob = async (job: string, amount = e18.mul(100)) => {
    // get liquidity
    await lp.connect(lpWhale).transfer(owner.address, amount);
    // approve
    await lp.approve(keep3rLiquidityManager.address, amount);
    // depositLiquidity
    await keep3rLiquidityManager.depositLiquidity(lp.address, amount);
    // setJobLiquidityAmount
    await keep3rLiquidityManager.setJobLiquidityAmount(job, lp.address, amount);
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
