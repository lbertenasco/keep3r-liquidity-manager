import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect } from 'chai';
import _ from 'lodash';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { BigNumber, Contract, ContractFactory, utils } from 'ethers';
import { ethers } from 'hardhat';
import { behaviours, constants, bdd } from '../../utils';
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

  describe('jobHasLP', () => {
    given(async function () {
      this.jobAddress = '0xcbefaf9e348b21cd7f148f2a626350dd19319456';
      this.lpAddress1 = '0xDc25eF3F5b8A186998338a2aDa83795fBA2d695e';
      this.lpAddress2 = '0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c';
      await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
        this.jobAddress,
        this.lpAddress1
      );
    });
    when('job does not have that lp', () => {
      then('returns false', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.jobHasLP(
            this.jobAddress,
            this.lpAddress2
          )
        ).to.be.false;
      });
    });
    when('job does have that lp', () => {
      then('returns false', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.jobHasLP(
            this.jobAddress,
            this.lpAddress1
          )
        ).to.be.true;
      });
    });
  });

  describe('addLPToJob', () => {
    when('LP didnt exist in job', () => {
      given(async function () {
        this.jobAddress = '0xcbefaf9e348b21cd7f148f2a626350dd19319456';
        this.lpAddress = '0xDc25eF3F5b8A186998338a2aDa83795fBA2d695e';
        this.jobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
          this.jobAddress
        );
        this.jobLiquidityIndexes = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidityIndexes(
          this.jobAddress
        );
        this.addLPToJobTx = await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress
        );
      });
      then('gets added to job liquidities', async function () {
        expect(
          _.difference(
            await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
              this.jobAddress
            ),
            this.jobLiquidities
          )
        ).to.deep.equal([this.lpAddress]);
      });
      then('job lp index is assigned correctly', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidityIndex(
            this.jobAddress,
            this.lpAddress
          )
        ).to.equal(0);
      });
    });
    when('LP already exists in job', () => {
      given(async function () {
        this.jobAddress = '0xcbefaf9e348b21cd7f148f2a626350dd19319456';
        this.lpAddress = '0xDc25eF3F5b8A186998338a2aDa83795fBA2d695e';
        this.jobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
          this.jobAddress
        );
        this.jobLiquidityIndexes = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidityIndexes(
          this.jobAddress
        );
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress
        );
        this.addLPToJobTx = keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress
        );
        await this.addLPToJobTx;
      });
      then('tx is not reverted', async function () {
        expect(this.addLPToJobTx).to.not.be.reverted;
      });
      then('job liquidities is not modified', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
            this.jobAddress
          )
        ).to.deep.equal([this.lpAddress]);
      });
      then('job liqudity indexes is not modified', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidityIndex(
            this.jobAddress,
            this.lpAddress
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidityIndexes(
            this.jobAddress
          )
        ).to.deep.equal([[this.lpAddress, BigNumber.from('0')]]);
      });
    });
    when('there is an LP already in job', () => {
      given(async function () {
        this.jobAddress = '0xcbefaf9e348b21cd7f148f2a626350dd19319456';
        this.lpAddress1 = '0xDc25eF3F5b8A186998338a2aDa83795fBA2d695e';
        this.lpAddress2 = '0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c';
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress1
        );
        this.initialJobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
          this.jobAddress
        );
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress2
        );
        this.finalJobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
          this.jobAddress
        );
      });
      then('gets added to job liquidities', async function () {
        expect(
          _.difference(this.finalJobLiquidities, this.initialJobLiquidities)
        ).to.deep.equal([this.lpAddress2]);
      });
      then('job lp index is assigned correctly', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidityIndex(
            this.jobAddress,
            this.lpAddress2
          )
        ).to.equal(1);
      });
    });
  });

  describe('removeLPFromJob', () => {
    when('LP didnt exist in job', () => {
      given(async function () {
        this.jobAddress = '0xcbefaf9e348b21cd7f148f2a626350dd19319456';
        this.lpAddress = '0xDc25eF3F5b8A186998338a2aDa83795fBA2d695e';
        this.jobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
          this.jobAddress
        );
        this.jobLiquidityIndexes = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidityIndexes(
          this.jobAddress
        );
        this.removeTx = keep3rLiquidityManagerJobsLiquditiyHandler.removeLPFromJob(
          this.jobAddress,
          this.lpAddress
        );
        await this.removeTx;
      });
      then('tx is not reverted', async function () {
        expect(this.removeTx).to.not.be.reverted;
      });
      then('job liquidities is not modified', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
            this.jobAddress
          )
        ).to.deep.equal(this.jobLiquidities);
      });
      then('job liqudity indexes is not modified', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidityIndexes(
            this.jobAddress
          )
        ).to.deep.equal(this.jobLiquidityIndexes);
      });
    });
    when('LP did exist in job and its the only one', () => {
      given(async function () {
        this.jobAddress = '0xcbefaf9e348b21cd7f148f2a626350dd19319456';
        this.lpAddress = '0xDc25eF3F5b8A186998338a2aDa83795fBA2d695e';
        this.addLPToJobTx = await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress
        );
        await keep3rLiquidityManagerJobsLiquditiyHandler.removeLPFromJob(
          this.jobAddress,
          this.lpAddress
        );
      });
      then('gets removed from job liqudities', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
            this.jobAddress
          )
        ).to.be.empty;
      });
      then('job liquditiy index from lp is removed', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidityIndexes(
            this.jobAddress
          )
        ).to.be.empty;
      });
    });
    when('LP did exist in job and its not the only one', () => {
      given(async function () {
        this.jobAddress = '0xcbefaf9e348b21cd7f148f2a626350dd19319456';
        this.lpAddress1 = '0xDc25eF3F5b8A186998338a2aDa83795fBA2d695e';
        this.lpAddress2 = '0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c';
        this.lpAddress3 = '0x8fD00f170FDf3772C5ebdCD90bF257316c69BA45';
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress1
        );
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress2
        );
        await keep3rLiquidityManagerJobsLiquditiyHandler.addLPToJob(
          this.jobAddress,
          this.lpAddress3
        );
        await keep3rLiquidityManagerJobsLiquditiyHandler.removeLPFromJob(
          this.jobAddress,
          this.lpAddress1
        );
        this.finalJobLiquidities = await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
          this.jobAddress
        );
      });
      then(
        'last job liquidity swaps indexes with removed lp',
        async function () {
          expect(
            await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidities(
              this.jobAddress,
              0
            )
          ).to.equal(this.lpAddress3);
        }
      );
      then(
        'last job liqudity index swaps with removed lp index',
        async function () {
          expect(
            await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidityIndex(
              this.jobAddress,
              this.lpAddress3
            )
          ).to.equal(0);
        }
      );
      then('gets removed from job liqudities', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidities(
            this.jobAddress
          )
        ).to.deep.equal([this.lpAddress3, this.lpAddress2]);
      });
      then('job liquditiy index from lp is removed', async function () {
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.jobLiquidityIndex(
            this.jobAddress,
            this.lpAddress1
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerJobsLiquditiyHandler.getJobLiquidityIndexes(
            this.jobAddress
          )
        ).to.deep.equal([
          [this.lpAddress3, BigNumber.from('0')],
          [this.lpAddress2, BigNumber.from('1')],
        ]);
      });
    });
  });
});
