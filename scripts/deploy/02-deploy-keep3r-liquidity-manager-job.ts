import { ContractFactory } from '@ethersproject/contracts';
import hre from 'hardhat';
const ethers = hre.ethers;
const { Confirm } = require('enquirer');

import config from '../../.config.json';
import { e18, ZERO_ADDRESS } from '../../utils/web3-utils';

const prompt = new Confirm({
  message: 'Do you wish to deploy Keep3rLiquidityManagerJob contract?',
});

async function main() {
  await hre.run('compile');
  const Keep3rLiquidityManagerJob = await ethers.getContractFactory(
    'contracts/job/Keep3rLiquidityManagerJob.sol:Keep3rLiquidityManagerJob'
  );

  await promptAndSubmit(Keep3rLiquidityManagerJob);
}

function promptAndSubmit(Keep3rLiquidityManagerJob: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('using address:', owner.address);
    try {
      prompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.time('Keep3rLiquidityManagerJob deployed');
          const escrowContracts = config.contracts.mainnet.escrow;
          const klmContracts = config.contracts.mainnet.klm;
          console.log(
            klmContracts.keep3rLiquidityManager,
            escrowContracts.keep3r,
            ZERO_ADDRESS,
            e18.mul(50), // 50 KP3R
            0,
            0,
            true
          );
          const keep3rLiquidityManagerJob = await Keep3rLiquidityManagerJob.deploy(
            klmContracts.keep3rLiquidityManager,
            escrowContracts.keep3r,
            ZERO_ADDRESS,
            e18.mul(50), // 50 KP3R
            0,
            0,
            true
          );
          console.timeEnd('Keep3rLiquidityManagerJob deployed');
          console.log(
            'Keep3rLiquidityManagerJob address:',
            keep3rLiquidityManagerJob.address
          );
          console.log(
            'PLEASE: change .config.json & example.config.json keep3rLiquidityManagerJob address to:',
            keep3rLiquidityManagerJob.address
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
