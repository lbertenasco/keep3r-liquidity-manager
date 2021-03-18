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
import { behaviours, constants, bdd, erc20 } from '../../utils';
import { Address } from 'node:cluster';
const { when, given, then } = bdd;

describe.only('Keep3rLiquidityManagerUserLiquidityHandler', () => {
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
      initialAmount: utils.parseEther('10000'),
    });
  });

  describe('addLiquidity', () => {
    when('user is zero address', () => {
      then('tx is reverted with reason');
    });
    when('amount is zero', () => {
      then('tx is reverted with reaso');
    });
    when('adding valid liquidity', () => {
      then('total liquidity amount increases');
      then('total user liquidity amount increases');
      then('total user idle liquidity amount increases');
    });
  });
  describe('subLiquidity', () => {
    when('user does is zero address', () => {
      then('tx is reverted with reason');
    });
    when('user does not have enough total liquidity', () => {
      then('tx is reverted with reason');
    });
    when('subtracting valid liquidity', () => {
      then('total liquidity amount decreases');
      then('total user liquidity amount decreases');
      then('total user idle liquidity amount decreases');
    });
  });

  describe('_depositLiquidity', () => {
    const fundsToMove = BigNumber.from('1000');
    let depositTxResponse: TransactionResponse;

    when('contract is not approved to move funds', () => {
      then('tx is reverted with reason', async () => {
        expect(
          keep3rLiquidityManagerUserLiquidityHandler.internalDepositLiquidity(
            owner.address,
            alice.address,
            lp.address,
            fundsToMove
          )
        ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
      });
    });
    when(
      'contract is not approved to move same amount of deposited funds',
      () => {
        given(async () => {
          await lp.approve(
            keep3rLiquidityManagerUserLiquidityHandler.address,
            fundsToMove.sub(1)
          );
        });
        then('tx is reverted with reason', async () => {
          expect(
            keep3rLiquidityManagerUserLiquidityHandler.internalDepositLiquidity(
              owner.address,
              alice.address,
              lp.address,
              fundsToMove
            )
          ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
        });
      }
    );
    when('contract is approved to move funds', () => {
      let initialDepositorBalance: BigNumber;
      given(async () => {
        initialDepositorBalance = await lp.balanceOf(owner.address);
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
        expect(await lp.balanceOf(owner.address)).to.equal(
          initialDepositorBalance.sub(fundsToMove)
        );
      });
      then('event is emitted', async () => {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(owner.address, alice.address, lp.address, fundsToMove);
      });
      then('total liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user idle liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
    });
  });

  describe('depositLiquidityTo', () => {
    const fundsToMove = BigNumber.from('1000');
    let depositTxResponse: TransactionResponse;

    when('contract is not approved to move funds', () => {
      then('tx is reverted with reason', async () => {
        expect(
          keep3rLiquidityManagerUserLiquidityHandler.depositLiquidityTo(
            alice.address,
            lp.address,
            fundsToMove
          )
        ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
      });
    });
    when(
      'contract is not approved to move same amount of deposited funds',
      () => {
        given(async () => {
          await lp.approve(
            keep3rLiquidityManagerUserLiquidityHandler.address,
            fundsToMove.sub(1)
          );
        });
        then('tx is reverted with reason', async () => {
          expect(
            keep3rLiquidityManagerUserLiquidityHandler.depositLiquidityTo(
              alice.address,
              lp.address,
              fundsToMove
            )
          ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
        });
      }
    );
    when('contract is approved to move funds', () => {
      let initialDepositorBalance: BigNumber;
      given(async () => {
        initialDepositorBalance = await lp.balanceOf(owner.address);
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
        expect(await lp.balanceOf(owner.address)).to.equal(
          initialDepositorBalance.sub(fundsToMove)
        );
      });
      then('event is emitted', async () => {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(owner.address, alice.address, lp.address, fundsToMove);
      });
      then('total liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user idle liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            alice.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
    });
  });

  describe('depositLiquidity', () => {
    const fundsToMove = BigNumber.from('1000');
    let depositTxResponse: TransactionResponse;

    when('contract is not approved to move funds', () => {
      then('tx is reverted with reason', async () => {
        expect(
          keep3rLiquidityManagerUserLiquidityHandler.depositLiquidity(
            lp.address,
            fundsToMove
          )
        ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
      });
    });
    when(
      'contract is not approved to move same amount of deposited funds',
      () => {
        given(async () => {
          await lp.approve(
            keep3rLiquidityManagerUserLiquidityHandler.address,
            fundsToMove.sub(1)
          );
        });
        then('tx is reverted with reason', async () => {
          expect(
            keep3rLiquidityManagerUserLiquidityHandler.depositLiquidity(
              lp.address,
              fundsToMove
            )
          ).to.be.revertedWith('ERC20: transfer amount exceeds allowance');
        });
      }
    );
    when('contract is approved to move funds', () => {
      let initialDepositorBalance: BigNumber;
      given(async () => {
        initialDepositorBalance = await lp.balanceOf(owner.address);
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
        expect(await lp.balanceOf(owner.address)).to.equal(
          initialDepositorBalance.sub(fundsToMove)
        );
      });
      then('event is emitted', async () => {
        await expect(depositTxResponse)
          .to.emit(
            keep3rLiquidityManagerUserLiquidityHandler,
            'DepositedLiquidity'
          )
          .withArgs(owner.address, owner.address, lp.address, fundsToMove);
      });
      then('total liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.liquidityTotalAmount(
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityTotalAmount(
            owner.address,
            lp.address
          )
        ).to.equal(fundsToMove);
      });
      then('total user idle liquidity amount decreases', async () => {
        expect(
          await keep3rLiquidityManagerUserLiquidityHandler.userLiquidityIdleAmount(
            owner.address,
            lp.address
          )
        ).to.equal(fundsToMove);
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
