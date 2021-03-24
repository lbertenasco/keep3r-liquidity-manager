import { ContractFactory } from '@ethersproject/contracts';
import hre from 'hardhat';
const ethers = hre.ethers;
const { Confirm } = require('enquirer');

import config from '../../.config.json';

const prompt = new Confirm({
  message: 'Do you wish to deploy keep3r escrow contract?',
});

async function main() {
  await hre.run('compile');
  const Keep3rEscrow = await ethers.getContractFactory(
    'contracts/escrow/Keep3rEscrow.sol:Keep3rEscrow'
  );

  await promptAndSubmit(Keep3rEscrow);
}

function promptAndSubmit(Keep3rEscrow: ContractFactory) {
  return new Promise<void>(async (resolve, reject) => {
    const [owner] = await ethers.getSigners();
    console.log('using address:', owner.address);
    try {
      prompt.run().then(async (answer: boolean) => {
        if (answer) {
          console.time('Keep3rEscrows deployed');
          const escrowContracts = config.contracts.mainnet.escrow;
          console.log(escrowContracts.keep3r);
          const keep3rEscrow1 = await Keep3rEscrow.deploy(
            escrowContracts.keep3r
          );
          const keep3rEscrow2 = await Keep3rEscrow.deploy(
            escrowContracts.keep3r
          );
          console.timeEnd('Keep3rEscrows deployed');
          console.log('Keep3rEscrow1 address:', keep3rEscrow1.address);
          console.log('Keep3rEscrow2 address:', keep3rEscrow2.address);
          console.log(
            'PLEASE: change .config.json & example.config.json keep3rEscrow1 address to:',
            keep3rEscrow1.address,
            'and keep3rEscrow1 to:',
            keep3rEscrow2.address
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
