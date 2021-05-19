import { JsonRpcSigner } from '@ethersproject/providers';

import hre, { network } from 'hardhat';
const ethers = hre.ethers;

import config from '../../.config.json';

async function main() {
  await hre.run('compile');
  await new Promise(async () => {
    const [owner] = await ethers.getSigners();
    // impersonate keeper
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [config.accounts.mainnet.keeper],
    });
    const keeper = (owner.provider as any).getUncheckedSigner(config.accounts.mainnet.keeper);

    const keep3rLiquidityManagerJob = await ethers.getContractAt(
      'Keep3rLiquidityManagerJob',
      config.contracts.mainnet.klm.keep3rLiquidityManagerJob
    );

    const jobs = await keep3rLiquidityManagerJob.callStatic.jobs();
    for (const job of jobs) {
      const workable = await keep3rLiquidityManagerJob.callStatic.workable(job);
      console.log({ job, workable });
      if (!workable) continue;
      await keep3rLiquidityManagerJob.connect(keeper).callStatic.work(job);
      await keep3rLiquidityManagerJob.connect(keeper).work(job);
      console.log('worked!');
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
