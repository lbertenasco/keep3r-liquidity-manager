import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect } from 'chai';
import _ from 'lodash';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { ethers } from 'hardhat';
import { behaviours, constants, bdd, wallet, erc20 } from '../../utils';
const { when, given, then } = bdd;

describe('Keep3rLiquidityManagerUserJobsLiquidityHandler', () => {
  let owner: SignerWithAddress;
  let keep3rV1FakeContract: ContractFactory;
  let keep3rV1Fake: Contract;
  let keep3rEscrowContract: ContractFactory;
  let keep3rEscrow1: Contract;
  let keep3rEscrow2: Contract;
  let keep3rLiquidityManagerUserJobsLiquditiyHandlerContract: ContractFactory;
  let keep3rLiquidityManagerUserJobsLiquditiyHandler: Contract;

  before('Setup accounts and contracts', async () => {
    [owner] = await ethers.getSigners();
    keep3rV1FakeContract = await ethers.getContractFactory(
      'contracts/mock/Keep3rV1.sol:FakeKeep3rV1'
    );
    keep3rEscrowContract = await ethers.getContractFactory('Keep3rEscrow');
    keep3rLiquidityManagerUserJobsLiquditiyHandlerContract = await ethers.getContractFactory(
      'contracts/mock/keep3r-liquidity-manager/Keep3rLiquidityManagerUserJobsLiquidityHandler.sol:Keep3rLiquidityManagerUserJobsLiquidityHandlerMock'
    );
  });

  beforeEach('Deploy necessary contracts', async () => {
    keep3rV1Fake = await keep3rV1FakeContract.deploy();
    keep3rEscrow1 = await keep3rEscrowContract.deploy(keep3rV1Fake.address);
    keep3rEscrow2 = await keep3rEscrowContract.deploy(keep3rV1Fake.address);
    keep3rLiquidityManagerUserJobsLiquditiyHandler = await keep3rLiquidityManagerUserJobsLiquditiyHandlerContract.deploy(
      keep3rV1Fake.address, // keep3rV1
      keep3rEscrow1.address, // escrow1
      keep3rEscrow2.address // escrow2
    );
  });

  describe('setMinAmount', () => {
    when('setting min amount for liquidity', () => {
      given(async function () {
        this.liquidityAddress = await wallet.generateRandomAddress();
        this.minAmount = utils.parseUnits('100', 'gwei');
        this.setMinAmountTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.setMinAmount(
          this.liquidityAddress,
          this.minAmount
        );
      });
      then('sets new min amount', async function () {
        expect(
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.liquidityMinAmount(
            this.liquidityAddress
          )
        ).to.equal(this.minAmount);
      });
      then('emits event', async function () {
        await expect(this.setMinAmountTx)
          .to.emit(
            keep3rLiquidityManagerUserJobsLiquditiyHandler,
            'LiquidityMinSet'
          )
          .withArgs(this.liquidityAddress, this.minAmount);
      });
    });
  });

  describe('setLiquidityToJobOfUser', () => {
    when('setting same amount than current one', () => {
      then('tx is reverted with reason');
    });
    when('when setting higher amount than current one', () => {
      then('adds diff between current and wanted liquidity of user to job');
      then('emits event with correct args');
    });
    when('setting lower amount than current one', () => {
      then('subs diff between current and wanted liquidity of user to job');
      then('emits event with correct args');
    });
  });

  describe('removeIdleLiquidityOfUserFromJob', () => {
    given(async function () {
      this.liquidityToken = await erc20.deploy({
        name: 'lp',
        symbol: 'LP',
        initialAccount: owner.address,
        initialAmount: utils.parseEther('1000'),
      });
      this.liquidityAddress = this.liquidityToken.address;
      this.jobAddress = await wallet.generateRandomAddress();
      this.idleAmount = await utils.parseEther('10');
      this.minAmount = utils.parseEther('1');
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setMinAmount(
        this.liquidityAddress,
        this.minAmount
      );
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserLiquidityIdleAmount(
        owner.address,
        this.liquidityAddress,
        this.idleAmount
      );
    });
    when('removing zero liquidity', () => {
      given(async function () {
        this.removeIdleTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.removeIdleLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          0
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.removeIdleTx).to.be.revertedWith(
          'Keep3rLiquidityManager::zero-amount'
        );
      });
    });
    when('not enough job cycles have gone through', () => {
      given(async function () {
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.liquidityAddress
        );
        this.removeIdleTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.removeIdleLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          1
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.removeIdleTx).to.be.revertedWith(
          'Keep3rLiquidityManager::liquidity-still-locked'
        );
      });
    });
    when('removing more than unlocked', () => {
      given(async function () {
        this.unlockedAmount = utils.parseUnits('123', 'gwei');
        this.jobLiquidityAmount = utils.parseEther('10');
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setJobCycle(
          this.jobAddress,
          (
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobCycle(
              owner.address,
              this.jobAddress
            )
          ).add(2)
        );
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserJobLiquidityAmount(
          owner.address,
          this.jobAddress,
          this.liquidityAddress,
          this.jobLiquidityAmount.sub(this.unlockedAmount)
        );
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserJobLiquidityLockedAmount(
          owner.address,
          this.jobAddress,
          this.liquidityAddress,
          this.jobLiquidityAmount
        );
        this.removeIdleTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.removeIdleLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.unlockedAmount.add(10)
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.removeIdleTx).to.be.revertedWith(
          'Keep3rLiquidityManager::amount-bigger-than-idle-available'
        );
      });
    });
    when('removing correct amount after 2 job cycles have gone through', () => {
      given(async function () {
        this.unlockedAmount = utils.parseUnits('123', 'gwei');
        this.jobLiquidityAmount = utils.parseEther('10');
        this.amountToWithdraw = this.unlockedAmount.div(2);
        this.idleAmount = utils.parseEther('1.5');
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserLiquidityIdleAmount(
          owner.address,
          this.liquidityAddress,
          this.idleAmount
        );
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setJobCycle(
          this.jobAddress,
          (
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobCycle(
              owner.address,
              this.jobAddress
            )
          ).add(2)
        );
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserJobLiquidityAmount(
          owner.address,
          this.jobAddress,
          this.liquidityAddress,
          this.jobLiquidityAmount.sub(this.unlockedAmount)
        );
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserJobLiquidityLockedAmount(
          owner.address,
          this.jobAddress,
          this.liquidityAddress,
          this.jobLiquidityAmount
        );
        await this.liquidityToken.transfer(
          keep3rEscrow1.address,
          this.amountToWithdraw.div(2)
        );
        await this.liquidityToken.transfer(
          keep3rEscrow2.address,
          this.amountToWithdraw.div(2)
        );
        this.removeIdleTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.removeIdleLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.amountToWithdraw
        );
      });
      then('liquidity locked should be reduced', async function () {
        expect(
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityLockedAmount(
            owner.address,
            this.jobAddress,
            this.liquidityAddress
          )
        ).to.equal(this.jobLiquidityAmount.sub(this.amountToWithdraw));
      });
      then('idle liquidity should increase', async function () {
        expect(
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.userLiquidityIdleAmount(
            owner.address,
            this.liquidityAddress
          )
        ).to.equal(this.idleAmount.add(this.amountToWithdraw));
      });
      then('emits event with correct args', async function () {
        await expect(this.removeIdleTx).to.emit(
          keep3rLiquidityManagerUserJobsLiquditiyHandler,
          'IdleLiquidityRemovedFromJob'
        );
      });
    });
    when(
      'removing correct amount after enough job cycles to remove liquidity',
      () => {
        then('liquidity locked should be reduced');
        then('idle liquidity should increase');
        then('emits event with correct args');
      }
    );
  });

  describe('addLiquidityOfUserToJob', () => {
    given(async function () {
      this.liquidityAddress = await wallet.generateRandomAddress();
      this.jobAddress = await wallet.generateRandomAddress();
      this.idleAmount = await utils.parseEther('10');
      this.minAmount = utils.parseEther('1');
      await keep3rV1Fake.addJob(this.jobAddress);
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setMinAmount(
        this.liquidityAddress,
        this.minAmount
      );
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserLiquidityIdleAmount(
        owner.address,
        this.liquidityAddress,
        this.idleAmount
      );
    });
    when('adding liquidity to a non existen job', () => {
      given(async function () {
        this.addLiquidityOfUserToJobTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
          owner.address,
          this.liquidityAddress,
          await wallet.generateRandomAddress(),
          0
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.addLiquidityOfUserToJobTx).to.be.revertedWith(
          'Keep3rLiquidityManager::job-not-on-keep3r'
        );
      });
    });
    when('adding zero liquidity', () => {
      given(async function () {
        this.addLiquidityOfUserToJobTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          0
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.addLiquidityOfUserToJobTx).to.be.revertedWith(
          'Keep3rLiquidityManager::zero-amount'
        );
      });
    });
    when('adding more liquidity than idle available', () => {
      given(async function () {
        this.addLiquidityOfUserToJobTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.idleAmount.add(1)
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.addLiquidityOfUserToJobTx).to.be.revertedWith(
          'Keep3rLiquidityManager::no-idle-liquidity-available'
        );
      });
    });
    when('liquidity min amount is not set', () => {
      given(async function () {
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setMinAmount(
          this.liquidityAddress,
          0
        );
        this.addLiquidityOfUserToJobTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.idleAmount
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.addLiquidityOfUserToJobTx).to.be.revertedWith(
          'Keep3rLiquidityManager::liquidity-min-not-set'
        );
      });
    });
    when('not locking more than min liquidity', () => {
      given(async function () {
        await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserJobLiquidityLockedAmount(
          owner.address,
          this.jobAddress,
          this.liquidityAddress,
          this.minAmount.div(2)
        );
        this.addLiquidityOfUserToJobTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.minAmount.div(2).sub(1)
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.addLiquidityOfUserToJobTx).to.be.revertedWith(
          'Keep3rLiquidityManager::locked-amount-not-enough'
        );
      });
    });
    when('adding available liquidity and more than min', () => {
      when('job didnt have that liquidity before', () => {
        given(async function () {
          this.initialJobLiquidities = await keep3rLiquidityManagerUserJobsLiquditiyHandler.jobLiquidities(
            this.jobAddress
          );
          this.addLiquidityOfUserToJobTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
            owner.address,
            this.liquidityAddress,
            this.jobAddress,
            this.minAmount
          );
        });
        then('adds liquidity to job on user', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityAmount(
              owner.address,
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.minAmount);
        });
        then('increases locked liquidity of user', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityLockedAmount(
              owner.address,
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.minAmount);
        });
        then('reduces idle liquidity of user', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userLiquidityIdleAmount(
              owner.address,
              this.liquidityAddress
            )
          ).to.equal(this.idleAmount.sub(this.minAmount));
        });
        then('it adds lp to job', async function () {
          expect(
            _.difference(
              await keep3rLiquidityManagerUserJobsLiquditiyHandler.jobLiquidities(
                this.jobAddress
              ),
              this.initialJobLiquidities
            )
          ).to.deep.equal([this.liquidityAddress]);
        });
        then('increases desired liquidity amount of job', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.jobLiquidityDesiredAmount(
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.minAmount);
        });
      });
      when('job had that liquidity before', () => {
        given(async function () {
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
            owner.address,
            this.liquidityAddress,
            this.jobAddress,
            this.minAmount
          );
          this.addLiquidityOfUserToJobTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.addLiquidityOfUserToJob(
            owner.address,
            this.liquidityAddress,
            this.jobAddress,
            this.minAmount
          );
        });
        then('adds liquidity to job on user', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityAmount(
              owner.address,
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.minAmount.mul(2));
        });
        then('increases locked liquidity of user', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityLockedAmount(
              owner.address,
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.minAmount.mul(2));
        });
        then('reduces idle liquidity of user', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userLiquidityIdleAmount(
              owner.address,
              this.liquidityAddress
            )
          ).to.equal(this.idleAmount.sub(this.minAmount.mul(2)));
        });
        then('increases desired liquidity amount of job', async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.jobLiquidityDesiredAmount(
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.minAmount.mul(2));
        });
      });
    });
  });

  describe('subLiquidityOfUserFromJob', () => {
    given(async function () {
      this.liquidityAddress = await wallet.generateRandomAddress();
      this.jobAddress = await wallet.generateRandomAddress();
      this.jobLiquidityAmount = utils.parseEther('10');
      this.minAmount = utils.parseEther('1');
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setMinAmount(
        this.liquidityAddress,
        this.minAmount
      );
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setJobLiquidityDesiredAmount(
        this.jobAddress,
        this.liquidityAddress,
        this.jobLiquidityAmount
      );
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserJobLiquidityAmount(
        owner.address,
        this.jobAddress,
        this.liquidityAddress,
        this.jobLiquidityAmount
      );
      await keep3rLiquidityManagerUserJobsLiquditiyHandler.setUserJobLiquidityLockedAmount(
        owner.address,
        this.jobAddress,
        this.liquidityAddress,
        this.jobLiquidityAmount
      );
    });
    when('reducing more liquidity than available', () => {
      given(async function () {
        this.subLiquidityTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.subLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.jobLiquidityAmount.add(1)
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.subLiquidityTx).to.be.revertedWith(
          'Keep3rLiquidityManager::not-enough-lp-in-job'
        );
      });
    });
    when('reducing liquidity to less than minimum', () => {
      given(async function () {
        this.subLiquidityTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.subLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.jobLiquidityAmount.sub(this.minAmount).add(1)
        );
      });
      then('tx is reverted with reason', async function () {
        await expect(this.subLiquidityTx).to.be.revertedWith(
          'Keep3rLiquidityManager::locked-amount-not-enough'
        );
      });
    });
    when('reducing liquidity of job from user', () => {
      given(async function () {
        this.subLiquidityTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.subLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.jobLiquidityAmount.sub(this.minAmount)
        );
        await this.subLiquidityTx;
      });
      then('job liquidity amount of user is reduced', async function () {
        expect(
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityAmount(
            owner.address,
            this.jobAddress,
            this.liquidityAddress
          )
        ).to.equal(this.minAmount);
      });
      then(
        'locked job liquidity amount of user is not modified',
        async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityLockedAmount(
              owner.address,
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.jobLiquidityAmount);
        }
      );
      then('desired liquidity in job is reduced', async function () {
        expect(
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.jobLiquidityDesiredAmount(
            this.jobAddress,
            this.liquidityAddress
          )
        ).to.equal(this.minAmount);
      });
    });
    when('setting liquidity of job to zero', () => {
      given(async function () {
        this.subLiquidityTx = keep3rLiquidityManagerUserJobsLiquditiyHandler.subLiquidityOfUserFromJob(
          owner.address,
          this.liquidityAddress,
          this.jobAddress,
          this.jobLiquidityAmount
        );
        await this.subLiquidityTx;
      });
      then('job liquidity amount of user is set to zero', async function () {
        expect(
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityAmount(
            owner.address,
            this.jobAddress,
            this.liquidityAddress
          )
        ).to.equal(0);
      });
      then(
        'locked job liquidity amount of user is not modified',
        async function () {
          expect(
            await keep3rLiquidityManagerUserJobsLiquditiyHandler.userJobLiquidityLockedAmount(
              owner.address,
              this.jobAddress,
              this.liquidityAddress
            )
          ).to.equal(this.jobLiquidityAmount);
        }
      );
      then('desired liquidity in job is set to zero', async function () {
        expect(
          await keep3rLiquidityManagerUserJobsLiquditiyHandler.jobLiquidityDesiredAmount(
            this.jobAddress,
            this.liquidityAddress
          )
        ).to.equal(0);
      });
    });
  });
});
