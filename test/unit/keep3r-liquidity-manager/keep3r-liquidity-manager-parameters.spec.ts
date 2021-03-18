import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect } from 'chai';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Contract, ContractFactory, utils } from 'ethers';
import { ethers } from 'hardhat';
import { behaviours, constants, bdd } from '../../utils';
const { when, given, then } = bdd;

describe('Keep3rLiquidityManagerParameters', () => {
  let owner: SignerWithAddress;
  let keep3rLiquidityManagerParametersContract: ContractFactory;
  let keep3rLiquidityManagerParameters: Contract;

  before('Setup accounts and contracts', async () => {
    [owner] = await ethers.getSigners();
    keep3rLiquidityManagerParametersContract = await ethers.getContractFactory(
      'contracts/mock/keep3r-liquidity-manager/Keep3rLiquidityManagerParameters.sol:Keep3rLiquidityManagerParametersMock'
    );
  });

  beforeEach('Deploy necessary contracts', async () => {
    keep3rLiquidityManagerParameters = await keep3rLiquidityManagerParametersContract.deploy(
      '0x0000000000000000000000000000000000000002'
    );
  });

  describe('constructor', () => {
    when('keep3r address is zero', () => {
      then('reverts with message', async () => {
        await behaviours.deployShouldRevertWithZeroAddress({
          contract: keep3rLiquidityManagerParametersContract,
          args: [constants.ZERO_ADDRESS],
        });
      });
    });
    when('no address is zero', () => {
      then('deploys, sets data correctly and emits events', async () => {
        await behaviours.deployShouldSetVariablesAndEmitEvents({
          contract: keep3rLiquidityManagerParametersContract,
          args: [constants.NOT_ZERO_ADDRESS],
          settersGettersVariablesAndEvents: [
            {
              getterFunc: 'keep3rV1',
              variable: constants.NOT_ZERO_ADDRESS,
              eventEmitted: 'Keep3rV1Set',
            },
          ],
        });
      });
    });
  });

  describe('setKeep3rV1', () => {
    when('setting keep3rV1 as zero address', () => {
      then('reverts with message', async () => {
        await behaviours.txShouldRevertWithZeroAddress({
          contract: keep3rLiquidityManagerParameters,
          func: 'setKeep3rV1',
          args: [constants.ZERO_ADDRESS],
        });
      });
    });
    when('setting valid keep3rV1', () => {
      let tx: TransactionResponse;
      const newKeep3rV1 = '0x2222222222222222222222222222222222222221';
      given(async () => {
        const setTx = await keep3rLiquidityManagerParameters.setKeep3rV1(
          newKeep3rV1
        );
        tx = setTx;
      });
      then('event is emitted correctly', async () => {
        await expect(tx)
          .to.emit(keep3rLiquidityManagerParameters, 'Keep3rV1Set')
          .withArgs(newKeep3rV1);
      });
      then('keep3rV1 is modified', async () => {
        expect(await keep3rLiquidityManagerParameters.keep3rV1()).to.equal(
          newKeep3rV1
        );
      });
    });
  });
});
