import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect } from 'chai';
import _ from 'lodash';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BigNumber, Contract, ContractFactory, utils, Wallet } from 'ethers';
import { ethers } from 'hardhat';
import { behaviours, constants, bdd, wallet, eventUtils } from '../../utils';
const { when, given, then } = bdd;

describe('Keep3rLiquidityManagerJobsLiquidityHandler', () => {
  let owner: SignerWithAddress;
  let keep3rLiquidityManagerJobsLiquditiyHandlerContract: ContractFactory;
  let keep3rLiquidityManagerJobsLiquditiyHandler: Contract;

  before('Setup accounts and contracts', async () => {
    [owner] = await ethers.getSigners();
    keep3rLiquidityManagerJobsLiquditiyHandlerContract = await ethers.getContractFactory(
      'contracts/mock/keep3r-liquidity-manager/Keep3rLiquidityManagerJobsLiquidityHandler.sol:Keep3rLiquidityManagerJobsLiquidityHandlerMock'
    );
  });

  beforeEach('Deploy necessary contracts', async () => {
    keep3rLiquidityManagerJobsLiquditiyHandler = await keep3rLiquidityManagerJobsLiquditiyHandlerContract.deploy();
  });

  describe('addJob', () => {
    when('doenst exist in jobs', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        this.addJobTx = keep3rLiquidityManagerJobsLiquditiyHandler.addJob(this.jobAddress);
        await this.addJobTx;
      });
      then('adds it', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobs()).to.deep.equal([this.jobAddress]);
      });
      then('emits event', async function () {
        await expect(this.addJobTx).to.emit(keep3rLiquidityManagerJobsLiquditiyHandler, 'JobAdded').withArgs(this.jobAddress);
      });
    });
    when('exists in jobs', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        await keep3rLiquidityManagerJobsLiquditiyHandler.addJob(this.jobAddress);
        this.addJobTx = keep3rLiquidityManagerJobsLiquditiyHandler.addJob(this.jobAddress);
        await this.addJobTx;
      });
      then('tx is not reverted', async function () {
        await expect(this.addJobTx).to.not.be.reverted;
      });
      then('jobs is not modified', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobs()).to.deep.equal([this.jobAddress]);
      });
      then('event is not emitted', async function () {
        await eventUtils.expectNoEventWithName(await this.addJobTx, 'JobAdded');
      });
    });
  });

  describe('removeJob', () => {
    given(async function () {
      this.jobAddress = await wallet.generateRandomAddress();
      await keep3rLiquidityManagerJobsLiquditiyHandler.addJob(this.jobAddress);
    });
    when('doenst exist in jobs', () => {
      given(async function () {
        this.jobAddress2 = await wallet.generateRandomAddress();
        this.removeJobTx = keep3rLiquidityManagerJobsLiquditiyHandler.removeJob(this.jobAddress2);
        await this.removeJobTx;
      });
      then('tx is not reverted', async function () {
        await expect(this.removeJobTx).to.not.be.reverted;
      });
      then('jobs is not modified', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobs()).to.deep.equal([this.jobAddress]);
      });
      then('event is not emitted', async function () {
        await eventUtils.expectNoEventWithName(await this.removeJobTx, 'JobRemoved');
      });
    });
    when('exists in jobs', () => {
      given(async function () {
        this.removeJobTx = keep3rLiquidityManagerJobsLiquditiyHandler.removeJob(this.jobAddress);
        await this.removeJobTx;
      });
      then('removes it', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobs()).to.deep.equal([]);
      });
      then('emits event', async function () {
        await expect(this.removeJobTx).to.emit(keep3rLiquidityManagerJobsLiquditiyHandler, 'JobRemoved').withArgs(this.jobAddress);
      });
    });
  });

  describe('addLPToJob', () => {
    when('LP didnt exist in job', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        this.lpAddress = await wallet.generateRandomAddress();
        this.jobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress);
        this.jobs = await keep3rLiquidityManagerJobsLiquditiyHandler.jobs();
        this.addLPToJobTx = await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress);
      });
      then('gets added to job liquidities', async function () {
        expect(
          _.difference(await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress), this.jobLiquidities)
        ).to.deep.equal([this.lpAddress]);
      });
      then('adds job to jobs', async function () {
        expect(_.difference(await keep3rLiquidityManagerJobsLiquditiyHandler.jobs(), this.jobs)).to.deep.equal([this.jobAddress]);
      });
    });
    when('LP already exists in job', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        this.lpAddress = await wallet.generateRandomAddress();
        this.jobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress);
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress);
        this.addLPToJobTx = keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress);
        await this.addLPToJobTx;
      });
      then('tx is not reverted', async function () {
        expect(this.addLPToJobTx).to.not.be.reverted;
      });
      then('job liquidities is not modified', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress)).to.deep.equal([this.lpAddress]);
      });
    });
    when('there is an LP already in job', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        this.lpAddress1 = await wallet.generateRandomAddress();
        this.lpAddress2 = await wallet.generateRandomAddress();
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress1);
        this.initialJobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress);
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress2);
        this.finalJobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress);
      });
      then('gets added to job liquidities', async function () {
        expect(_.difference(this.finalJobLiquidities, this.initialJobLiquidities)).to.deep.equal([this.lpAddress2]);
      });
    });
  });

  describe('removeLPFromJob', () => {
    when('LP didnt exist in job', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        this.lpAddress = await wallet.generateRandomAddress();
        this.jobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress);
        this.removeTx = keep3rLiquidityManagerJobsLiquditiyHandler.removeLPFromJob(this.jobAddress, this.lpAddress);
        await this.removeTx;
      });
      then('tx is not reverted', async function () {
        expect(this.removeTx).to.not.be.reverted;
      });
      then('job liquidities is not modified', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress)).to.deep.equal(this.jobLiquidities);
      });
    });
    when('LP did exist in job and its the only one', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        this.lpAddress = await wallet.generateRandomAddress();
        this.addLPToJobTx = await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress);
        this.jobs = await keep3rLiquidityManagerJobsLiquditiyHandler.jobs();
        await keep3rLiquidityManagerJobsLiquditiyHandler.removeLPFromJob(this.jobAddress, this.lpAddress);
      });
      then('gets removed from job liqudities', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress)).to.be.empty;
      });
      then('removes job from jobs', async function () {
        expect(_.difference(this.jobs, await keep3rLiquidityManagerJobsLiquditiyHandler.jobs())).to.deep.equal([this.jobAddress]);
      });
    });
    when('LP did exist in job and its not the only one', () => {
      given(async function () {
        this.jobAddress = await wallet.generateRandomAddress();
        this.lpAddress1 = await wallet.generateRandomAddress();
        this.lpAddress2 = await wallet.generateRandomAddress();
        this.lpAddress3 = await wallet.generateRandomAddress();
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress1);
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress2);
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(this.jobAddress, this.lpAddress3);
        await keep3rLiquidityManagerJobsLiquditiyHandler.removeLPFromJob(this.jobAddress, this.lpAddress1);
        this.finalJobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress);
      });
      then('gets removed from job liqudities', async function () {
        expect(await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(this.jobAddress)).to.deep.equal([
          this.lpAddress3,
          this.lpAddress2,
        ]);
      });
    });
  });
});
