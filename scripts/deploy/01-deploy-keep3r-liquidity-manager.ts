import { ContractFactory } from '@ethersproject/contracts';
import hre from 'hardhat';
const ethers = hre.ethers;
const { Confirm } = require('enquirer');

import config from '../../.config.json';

const prompt = new Confirm({
  message: 'Do you wish to deploy Keep3rLiquidityManager contract?',
});

async function main() {
  await hre.run('compile');
  const Keep3rLiquidityManager = await ethers.getContractFactory(
    'contracts/keep3r-liquidity-manager/Keep3rLiquidityManager.sol:Keep3rLiquidityManager'
  );

  await promptAndSubmit(Keep3rLiquidityManager);
}

function promptAndSubmit(Keep3rLiquidityManager: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('using address:', owner.address);
    try {
      prompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.time('Keep3rLiquidityManagers deployed');
          const escrowContracts = config.contracts.mainnet.escrow;
          const klmContracts = config.contracts.mainnet.klm;
          console.log(
            escrowContracts.keep3r,
            klmContracts.escrow1,
            klmContracts.escrow2
          );
          const keep3rLiquidityManager = await Keep3rLiquidityManager.deploy(
            escrowContracts.keep3r,
            klmContracts.escrow1,
            klmContracts.escrow2
          );
          console.timeEnd('Keep3rLiquidityManagers deployed');
          console.log(
            'Keep3rLiquidityManager address:',
            keep3rLiquidityManager.address
          );
          console.log(
            'PLEASE: change .config.json & example.config.json keep3rLiquidityManagers address to:',
            keep3rLiquidityManager.address
          );
          resolve();
        } else {
          console.error('Aborted!');
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
