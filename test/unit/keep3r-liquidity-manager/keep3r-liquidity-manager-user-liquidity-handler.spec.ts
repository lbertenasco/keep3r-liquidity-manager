import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { expect } from 'chai';
import {
  TransactionResponse,
  TransactionRequest,
} from '@ethersproject/abstract-provider';
import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractFactory,
  utils,
} from 'ethers';
import { ethers } from 'hardhat';
import { constants, bdd, erc20, behaviours } from '../../utils';
const { when, given, then } = bdd;

describe('Keep3rLiquidityManagerUserLiquidityHandler', () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let keep3rLiquidityManagerUserLiquidityHandlerContract: ContractFactory;
  let keep3rLiquidityManagerUserLiquidityHandler: Contract;
  let lp: Contract;

  before('Setup accounts and contracts', async () => {
    [owner, alice, bob] = await ethers.getSigners();
    keep3rLiquidityManagerUserLiquidityHandlerContract = await ethers.getContractFactory(
      'contracts/mock/keep3r-liquidity-manager/Keep3rLiquidityManagerUserLiquidityHandler.sol:Keep3rLiquidityManagerUserLiquidityHandlerMock'
    );
  });

  beforeEach('Deploy necessary contracts', async () => {
    keep3rLiquidityManagerUserLiquidityHandler = await keep3rLiquidityManagerUserLiquidityHandlerContract.deploy(
      '0x0000000000000000000000000000000000000002'
    );
    lp = await erc20.deploy({
      name: 'lp1',
      symbol: 'LP1',
      initialAccount: owner.address,
      initialAmount: utils.parseEther('0'),
    });
  });

  describe('setLiquidityFee', () => {
    given(async function () {
      this.maxLiquidityFee = await keep3rLiquidityManagerUserLiquidityHandler.MAX_LIQUIDITY_FEE();
    });
    when('liquidity fee is bigger than max liquidity fee', () => {
      then('tx is reverted with reason', async function () {
        await expect(
          keep3rLiquidityManagerUserLiquidityHandler.setLiquidityFee(
            this.maxLiquidityFee.add(1)
          )
        ).to.be.revertedWith(
          'Keep3rLiquidityManager::fee-exceeds-max-liquidity-fee'
        );
      });
    });
    when('liquidity fee is smaller than max liquidity fee', () => {
      given(async function () {
        this.setLiquidityFeeTx = keep3rLiquidityManagerUserLiquidityHandler.setLiquidityFee(
          this.maxLiquidityFee
        );
        await this.setLiquidityFeeTx;
      });
      then('sets new liquidity fee', async function () {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityFee()
        ).to.equal(this.maxLiquidityFee);
      });
      then('emits event', async function () {
        expect(this.setLiquidityFeeTx)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'LiquidityFeeSet'
          )
          .withArgs(this.maxLiquidityFee);
      });
    });
  });

  describe('setFeeReceiver', () => {
    given(function () {
      this.feeReceiver = bob.address;
    });
    when('setting fee receiver to zero address', () => {
      then('tx is reverted with reason', async function () {
        await behaviours.txShouldRevertWithZeroAddress({
          contract: keep3rLiquidityManagerUserLiquidityHandler,
          func: 'setFeeReceiver',
          args: [constants.ZERO_ADDRESS],
        });
      });
    });
    when('setting fee receiver to valid address', () => {
      given(async function () {
        this.setFeeReceiverTx = keep3rLiquidityManagerUserLiquidityHandler.setFeeReceiver(
          this.feeReceiver
        );
        await this.setFeeReceiverTx;
      });
      then('sets new fee receiver', async function () {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.feeReceiver()
        ).to.equal(this.feeReceiver);
      });
      then('emits event', async function () {
        expect(this.setFeeReceiverTx)
          .to.emit(keep3rLiquidityManagerUserLiquidityHandler, 'FeeReceiverSet')
          .withArgs(this.feeReceiver);
      });
    });
  });

  describe('addLiquidity', () => {
    when('user is zero address', () => {
      then('tx is reverted with reason', async () => {
        await expect(
          keep3rLiquidityManagerUserLiquidityHandler.addLiquidity(
            constants.ZERO_ADDRESS,
            lp.address,
            BigNumber.from('100')
          )
        ).to.be.revertedWith('Keep3rLiquidityManager::zero-user');
      });
    });
    when('amount is zero', () => {
      then('tx is reverted with reason', async () => {
        await expect(
          keep3rLiquidityManagerUserLiquidityHandler.addLiquidity(
            alice.address,
            lp.address,
            0
          )
        ).to.be.revertedWith('Keep3rLiquidityManager::amount-bigger-than-zero');
      });
    });
    when('adding valid liquidity', () => {
      const liquidityToAdd = utils.parseEther('10');
      given(async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
        await keep3rLiquidityManagerUserLiquidityHandler.addLiquidity(
          alice.address,
          lp.address,
          liquidityToAdd
        );
      });
      then('total liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(liquidityToAdd);
      });
      then('total user liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(liquidityToAdd);
      });
      then('total user idle liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(liquidityToAdd);
      });
    });
  });
  describe('subLiquidity', () => {
    when('user is zero address', () => {
      then('tx is reverted with reason', async () => {
        await expect(
          keep3rLiquidityManagerUserLiquidityHandler.subLiquidity(
            constants.ZERO_ADDRESS,
            lp.address,
            BigNumber.from('100')
          )
        ).to.be.revertedWith(
          'Keep3rLiquidityManager::amount-bigger-than-total'
        );
      });
    });
    when('user does not have enough total liquidity', () => {
      then('tx is reverted with reason', async () => {
        await expect(
          keep3rLiquidityManagerUserLiquidityHandler.subLiquidity(
            owner.address,
            lp.address,
            BigNumber.from('100')
          )
        ).to.be.revertedWith(
          'Keep3rLiquidityManager::amount-bigger-than-total'
        );
      });
    });
    when('subtracting valid liquidity', () => {
      const liquidity = utils.parseEther('15');
      given(async () => {
        await keep3rLiquidityManagerUserLiquidityHandler.addLiquidity(
          owner.address,
          lp.address,
          liquidity
        );
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(liquidity);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(liquidity);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(liquidity);
        await keep3rLiquidityManagerUserLiquidityHandler.subLiquidity(
          owner.address,
          lp.address,
          liquidity
        );
      });
      then('total liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
      });
      then('total user liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
      });
      then('total user idle liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
      });
    });
  });

  describe('_depositLiquidity', () => {
    const fundsToMove = BigNumber.from('1000');
    let depositTxResponse: TransactionResponse;

    when('contract is not approved to move funds', () => {
      given(async () => {
        await lp.mint(owner.address, fundsToMove);
        depositTxResponse = keep3rLiquidityManagerUserLiquidityHandler.internalDepositLiquidity(
          owner.address,
          alice.address,
          lp.address,
          fundsToMove
        );
      });
      then('tx is reverted with reason', async () => {
        await expect(depositTxResponse).to.be.revertedWith(
          'ERC20: transfer amount exceeds allowance'
        );
      });
    });
    when(
      'contract is not approved to move same amount of deposited funds',
      () => {
        given(async () => {
          await lp.mint(owner.address, fundsToMove);
          await lp.approve(
            keep3rLiquidityManagerUserLiquidityHandler.address,
            fundsToMove.sub(1)
          );
          depositTxResponse = keep3rLiquidityManagerUserLiquidityHandler.internalDepositLiquidity(
            owner.address,
            alice.address,
            lp.address,
            fundsToMove
          );
        });
        then('tx is reverted with reason', async () => {
          await expect(depositTxResponse).to.be.revertedWith(
            'ERC20: transfer amount exceeds allowance'
          );
        });
      }
    );
    when('there is no fee', () => {
      given(async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        await lp.mint(owner.address, fundsToMove);
        await lp.approve(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          fundsToMove
        );
        depositTxResponse = await keep3rLiquidityManagerUserLiquidityHandler.internalDepositLiquidity(
          owner.address,
          alice.address,
          lp.address,
          fundsToMove
        );
      });

      then('depositor funds are moved', async () => {
        expect(await lp.balanceOf(owner.address)).to.equal(0);
      });
      then('event is emitted', async () => {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(owner.address, alice.address, lp.address, fundsToMove, 0);
      });
      then('total liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user idle liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
    });
    when('there is fee', () => {
      given(async function () {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        this.feeReceiver = bob.address;
        this.liquidityFee = BigNumber.from('100');
        this.fee = fundsToMove
          .mul(this.liquidityFee)
          .div(await keep3rLiquidityManagerUserLiquidityHandler.PRECISION());
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityFee(
          this.liquidityFee
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setFeeReceiver(
          this.feeReceiver
        );
        await lp.mint(owner.address, fundsToMove);
        await lp.approve(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          fundsToMove
        );
        depositTxResponse = await keep3rLiquidityManagerUserLiquidityHandler.internalDepositLiquidity(
          owner.address,
          alice.address,
          lp.address,
          fundsToMove
        );
      });

      then('depositor funds are moved', async function () {
        expect(await lp.balanceOf(owner.address)).to.equal(0);
      });
      then('event is emitted', async function () {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(
            owner.address,
            alice.address,
            lp.address,
            fundsToMove.sub(this.fee),
            this.fee
          );
      });
      then(
        'total liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
      then(
        'total user liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
              alice.address,
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
      then(
        'total user idle liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
              alice.address,
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
    });
  });

  describe('depositLiquidityTo', () => {
    const fundsToMove = BigNumber.from('1000');
    let depositTxResponse: TransactionResponse;

    when('contract is not approved to move funds', () => {
      given(async () => {
        await lp.mint(owner.address, fundsToMove);
        depositTxResponse = keep3rLiquidityManagerUserLiquidityHandler.depositLiquidityTo(
          alice.address,
          lp.address,
          fundsToMove
        );
      });
      then('tx is reverted with reason', async () => {
        await expect(depositTxResponse).to.be.revertedWith(
          'ERC20: transfer amount exceeds allowance'
        );
      });
    });
    when(
      'contract is not approved to move same amount of deposited funds',
      () => {
        given(async () => {
          await lp.mint(owner.address, fundsToMove);
          await lp.approve(
            keep3rLiquidityManagerUserLiquidityHandler.address,
            fundsToMove.sub(1)
          );
          depositTxResponse = keep3rLiquidityManagerUserLiquidityHandler.depositLiquidityTo(
            alice.address,
            lp.address,
            fundsToMove
          );
        });
        then('tx is reverted with reason', async () => {
          await expect(depositTxResponse).to.be.revertedWith(
            'ERC20: transfer amount exceeds allowance'
          );
        });
      }
    );
    when('there is no fee', () => {
      given(async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        await lp.mint(owner.address, fundsToMove);
        await lp.approve(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          fundsToMove
        );
        depositTxResponse = await keep3rLiquidityManagerUserLiquidityHandler.depositLiquidityTo(
          alice.address,
          lp.address,
          fundsToMove
        );
      });

      then('depositor funds are moved', async () => {
        expect(await lp.balanceOf(owner.address)).to.equal(0);
      });
      then('event is emitted', async () => {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(owner.address, alice.address, lp.address, fundsToMove, 0);
      });
      then('total liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user idle liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
    });
    when('there is fee', () => {
      given(async function () {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(0);
        this.feeReceiver = bob.address;
        this.liquidityFee = BigNumber.from('100');
        this.fee = fundsToMove
          .mul(this.liquidityFee)
          .div(await keep3rLiquidityManagerUserLiquidityHandler.PRECISION());
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityFee(
          this.liquidityFee
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setFeeReceiver(
          this.feeReceiver
        );
        await lp.mint(owner.address, fundsToMove);
        await lp.approve(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          fundsToMove
        );
        depositTxResponse = await keep3rLiquidityManagerUserLiquidityHandler.depositLiquidityTo(
          alice.address,
          lp.address,
          fundsToMove
        );
      });

      then('depositor funds are moved', async function () {
        expect(await lp.balanceOf(owner.address)).to.equal(0);
      });
      then('event is emitted', async function () {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(
            owner.address,
            alice.address,
            lp.address,
            fundsToMove.sub(this.fee),
            this.fee
          );
      });
      then(
        'total liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
      then(
        'total user liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
              alice.address,
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
      then(
        'total user idle liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
              alice.address,
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
    });
  });

  describe('depositLiquidity', () => {
    const fundsToMove = BigNumber.from('1000');
    let depositTxResponse: TransactionResponse;

    when('contract is not approved to move funds', () => {
      given(async () => {
        await lp.mint(owner.address, fundsToMove);
        depositTxResponse = keep3rLiquidityManagerUserLiquidityHandler.depositLiquidity(
          lp.address,
          fundsToMove
        );
      });
      then('tx is reverted with reason', async () => {
        await expect(depositTxResponse).to.be.revertedWith(
          'ERC20: transfer amount exceeds allowance'
        );
      });
    });
    when(
      'contract is not approved to move same amount of deposited funds',
      () => {
        given(async () => {
          await lp.mint(owner.address, fundsToMove);
          await lp.approve(
            keep3rLiquidityManagerUserLiquidityHandler.address,
            fundsToMove.sub(1)
          );
          depositTxResponse = keep3rLiquidityManagerUserLiquidityHandler.depositLiquidity(
            lp.address,
            fundsToMove
          );
        });
        then('tx is reverted with reason', async () => {
          await expect(depositTxResponse).to.be.revertedWith(
            'ERC20: transfer amount exceeds allowance'
          );
        });
      }
    );
    when('there is no fee', () => {
      given(async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
        await lp.mint(owner.address, fundsToMove);
        await lp.approve(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          fundsToMove
        );
        depositTxResponse = await keep3rLiquidityManagerUserLiquidityHandler.depositLiquidity(
          lp.address,
          fundsToMove
        );
      });

      then('depositor funds are moved', async () => {
        expect(await lp.balanceOf(owner.address)).to.equal(0);
      });
      then('event is emitted', async () => {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(owner.address, owner.address, lp.address, fundsToMove, 0);
      });
      then('total liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user idle liquidity amount increases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
    });
    when('there is fee', () => {
      given(async function () {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(0);
        this.feeReceiver = bob.address;
        this.liquidityFee = BigNumber.from('100');
        this.fee = fundsToMove
          .mul(this.liquidityFee)
          .div(await keep3rLiquidityManagerUserLiquidityHandler.PRECISION());
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityFee(
          this.liquidityFee
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setFeeReceiver(
          this.feeReceiver
        );
        await lp.mint(owner.address, fundsToMove);
        await lp.approve(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          fundsToMove
        );
        depositTxResponse = await keep3rLiquidityManagerUserLiquidityHandler.depositLiquidity(
          lp.address,
          fundsToMove
        );
      });

      then('depositor funds are moved', async function () {
        expect(await lp.balanceOf(owner.address)).to.equal(0);
      });
      then('event is emitted', async function () {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(
            owner.address,
            owner.address,
            lp.address,
            fundsToMove.sub(this.fee),
            this.fee
          );
      });
      then(
        'total liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
      then(
        'total user liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
              owner.address,
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
      then(
        'total user idle liquidity amount increases subtracting fee',
        async function () {
          expect(
            await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
              owner.address,
              lp.address
            )
          ).to.equal(fundsToMove.sub(this.fee));
        }
      );
    });
  });

  describe('_withdrawLiquidity', () => {
    when('withdrawer does not have idle amount', () => {
      let withdrawTx: TransactionResponse;
      given(async () => {
        const funded = utils.parseEther('150');
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityTotalAmount(
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityTotalAmount(
          owner.address,
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityIdleAmount(
          owner.address,
          lp.address,
          funded.sub(1)
        );
        withdrawTx = keep3rLiquidityManagerUserLiquidityHandler.internalWithdrawLiquidity(
          owner.address,
          alice.address,
          lp.address,
          funded
        );
      });
      then('tx is reverted with reason', async () => {
        await expect(withdrawTx).to.be.revertedWith(
          'Keep3rLiquidityManager::user-insufficient-idle-balance'
        );
      });
    });
    when('withdrawer has enough idle amount', () => {
      let withdrawTx: TransactionResponse;
      const funded = utils.parseEther('150');
      const withdrawn = utils.parseEther('23');
      given(async () => {
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityTotalAmount(
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityTotalAmount(
          owner.address,
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityIdleAmount(
          owner.address,
          lp.address,
          funded
        );
        await lp.mint(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          funded
        );
        withdrawTx = await keep3rLiquidityManagerUserLiquidityHandler.internalWithdrawLiquidity(
          owner.address,
          alice.address,
          lp.address,
          withdrawn
        );
      });
      then('lp tokens are transferred to recipient', async () => {
        expect(await lp.balanceOf(alice.address)).to.equal(withdrawn);
        expect(
          await lp.balanceOf(keep3rLiquidityManagerUserLiquidityHandler.address)
        ).to.equal(funded.sub(withdrawn));
      });
      then('total liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
      then('total withdrawer liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
      then('total withdrawer idle liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
    });
  });
  describe('withdrawLiquidityTo', () => {
    when('withdrawer does not have idle amount', () => {
      let withdrawTx: TransactionResponse;
      given(async () => {
        const funded = utils.parseEther('150');
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityTotalAmount(
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityTotalAmount(
          owner.address,
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityIdleAmount(
          owner.address,
          lp.address,
          funded.sub(1)
        );
        withdrawTx = keep3rLiquidityManagerUserLiquidityHandler.withdrawLiquidityTo(
          alice.address,
          lp.address,
          funded
        );
      });
      then('tx is reverted with reason', async () => {
        await expect(withdrawTx).to.be.revertedWith(
          'Keep3rLiquidityManager::user-insufficient-idle-balance'
        );
      });
    });
    when('withdrawer has enough idle amount', () => {
      let withdrawTx: TransactionResponse;
      const funded = utils.parseEther('150');
      const withdrawn = utils.parseEther('23');
      given(async () => {
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityTotalAmount(
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityTotalAmount(
          owner.address,
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityIdleAmount(
          owner.address,
          lp.address,
          funded
        );
        await lp.mint(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          funded
        );
        withdrawTx = await keep3rLiquidityManagerUserLiquidityHandler.withdrawLiquidityTo(
          alice.address,
          lp.address,
          withdrawn
        );
      });
      then('lp tokens are transferred to recipient', async () => {
        expect(await lp.balanceOf(alice.address)).to.equal(withdrawn);
        expect(
          await lp.balanceOf(keep3rLiquidityManagerUserLiquidityHandler.address)
        ).to.equal(funded.sub(withdrawn));
      });
      then('total liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
      then('total withdrawer liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
      then('total withdrawer idle liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
    });
  });
  describe('withdrawLiquidity', () => {
    when('withdrawer does not have idle amount', () => {
      let withdrawTx: TransactionResponse;
      given(async () => {
        const funded = utils.parseEther('150');
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityTotalAmount(
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityTotalAmount(
          owner.address,
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityIdleAmount(
          owner.address,
          lp.address,
          funded.sub(1)
        );
        withdrawTx = keep3rLiquidityManagerUserLiquidityHandler.withdrawLiquidity(
          lp.address,
          funded
        );
      });
      then('tx is reverted with reason', async () => {
        await expect(withdrawTx).to.be.revertedWith(
          'Keep3rLiquidityManager::user-insufficient-idle-balance'
        );
      });
    });
    when('withdrawer has enough idle amount', () => {
      let withdrawTx: TransactionResponse;
      const funded = utils.parseEther('150');
      const withdrawn = utils.parseEther('23');
      given(async () => {
        await keep3rLiquidityManagerUserLiquidityHandler.setLiquidityTotalAmount(
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityTotalAmount(
          owner.address,
          lp.address,
          funded
        );
        await keep3rLiquidityManagerUserLiquidityHandler.setUserLiquidityIdleAmount(
          owner.address,
          lp.address,
          funded
        );
        await lp.mint(
          keep3rLiquidityManagerUserLiquidityHandler.address,
          funded
        );
        withdrawTx = await keep3rLiquidityManagerUserLiquidityHandler.withdrawLiquidity(
          lp.address,
          withdrawn
        );
      });
      then('lp tokens are transferred to recipient', async () => {
        expect(await lp.balanceOf(owner.address)).to.equal(withdrawn);
        expect(
          await lp.balanceOf(keep3rLiquidityManagerUserLiquidityHandler.address)
        ).to.equal(funded.sub(withdrawn));
      });
      then('total liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
      then('total withdrawer liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
      then('total withdrawer idle liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(funded.sub(withdrawn));
      });
    });
  });
});

// function depositLiquidityTest({
//   title,
//   from,
//   to,
//   initialTotalLiquidityAmount,
//   initialUserLiquidityTotalAmount,
//   initialUserLiquidityIdleAmount,
//   lp,
//   amount,
//   exec,
// } : {
//   title: string;
//   from: SignerWithAddress;
//   to: SignerWithAddress;
//   initialTotalLiquidityAmount: BigNumberish;
//   initialUserLiquidityTotalAmount: BigNumberish;
//   initialUserLiquidityIdleAmount: BigNumberish;
//   lp: Contract;
//   amount: BigNumberish;
//   exec: (params: {
//     from: SignerWithAddress;
//     to: SignerWithAddress;
//     lp: Contract;
//     amount: BigNumberish;
//   }) => Promise<TransactionResponse>;
// }) {
//   when(title, () => {
//     when('contract is not approved to move funds', () => {
//       then('tx is reverted with reason');
//     });
//     when('contract is not approved to move same amount of deposited funds', () => {
//       then('tx is reverted with reason');
//     });

//     when('contract is approved to move funds', () => {
//       let response: TransactionResponse;
//       given(async () => {
//         console.log('lp', lp, 'to', to);
//         expect(await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(lp.address)).to.equal(initialTotalLiquidityAmount);
//         expect(await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(to.address, lp.address)).to.equal(initialUserLiquidityTotalAmount);
//         expect(await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(to.address, lp.address)).to.equal(initialUserLiquidityIdleAmount);
//         await lp.connect(from).approve(keep3rLiquidityManagerUserLiquidityHandler.address, amount);
//         // response = await exec({
//         //   from,
//         //   to,
//         //   lp,
//         //   amount
//         // });
//       });

//       then('depositor funds are moved', async () => {

//       });
//       then('event is emitted');
//       then('total liquidity amount decreases');
//       then('total user liquidity amount decreases');
//       then('total user idle liquidity amount decreases');
//     });
//   });
// };
