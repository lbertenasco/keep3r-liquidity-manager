import { ContractFactory } from '@ethersproject/contracts';
import { BigNumber, providers, utils } from 'ethers';
import hre from 'hardhat';
import evm from '../test/utils/evm';
const ethers = hre.ethers;
const DAY = 60 * 60 * 24;

const slpETHKP3R = '0xaf988afF99d3d0cb870812C325C588D8D8CB7De8';
const jobsToSetLiquidityTo = [
  // '0x7E0Cc5edF2DD01FC543D698b7E00ff54c6c39085', // liqudiity provider is owner, skipping
  '0x620bd1E1D1d845c8904aC03F6cd6b87706B7596b',
  '0x02027bDA2425204f152B8aa35Fb78687D65E1AF5',
  '0x4a479E4457841D2D2Ff86e5A5389300963880C10',
  '0x448E2f3b02dCC8A00c420b99Ae06a474A13275A1',
  '0xaed599AADfEE8e32Cedb59db2b1120d33A7bACFD',
  '0x2ef7801c6A9d451EF20d0F513c738CC012C57bC3',
  '0xE5a7db399dEC2c5ddEfeBc52ea70f127284D118d',
  '0xeE15010105b9BB564CFDfdc5cee676485092AEDd',
];
const jobsToForceWork = [
  '0x7E0Cc5edF2DD01FC543D698b7E00ff54c6c39085',
  // '0x620bd1E1D1d845c8904aC03F6cd6b87706B7596b',
  // '0x02027bDA2425204f152B8aa35Fb78687D65E1AF5',
  // '0x4a479E4457841D2D2Ff86e5A5389300963880C10',
  // '0x448E2f3b02dCC8A00c420b99Ae06a474A13275A1',
  // '0xaed599AADfEE8e32Cedb59db2b1120d33A7bACFD',
  // '0x2ef7801c6A9d451EF20d0F513c738CC012C57bC3',
  // '0xE5a7db399dEC2c5ddEfeBc52ea70f127284D118d',
  // '0xeE15010105b9BB564CFDfdc5cee676485092AEDd',
];
const advanceDays = async (days: number) => {
  await evm.advanceTimeAndBlock(days * DAY + 1);
};

async function main() {
  await hre.run('compile');
  const [owner] = await ethers.getSigners();
  console.log(owner.address);
  const liqManager = await ethers.getContractAt(
    'contracts/keep3r-liquidity-manager/Keep3rLiquidityManager.sol:Keep3rLiquidityManager',
    '0xf14cb1feb6c40f26d9ca0ea39a9a613428cdc9ca'
  );
  const liqManagerJob = await ethers.getContractAt(
    'contracts/job/Keep3rLiquidityManagerJob.sol:Keep3rLiquidityManagerJob',
    '0x7e0cc5edf2dd01fc543d698b7e00ff54c6c39085'
  );
  const slp = await ethers.getContractAt('IERC20', slpETHKP3R);

  console.time('Set liquidity minimum to 2 wei');
  await liqManager.setMinAmount(slpETHKP3R, 2);
  console.timeEnd('Set liquidity minimum to 2 wei');

  console.time(`Deposit all slps`);
  // we could add more WEIs, it wouldnt hurt.
  const slpBalance = await slp.balanceOf(owner.address);
  if (!slpBalance.gte(2 * jobsToSetLiquidityTo.length)) {
    console.error('Not enough SLP balance');
    return;
  }
  await slp.approve(liqManager.address, slpBalance);
  await liqManager.depositLiquidity(slpETHKP3R, slpBalance);
  console.timeEnd(`Deposit all slps`);

  for (let i = 0; i < jobsToSetLiquidityTo.length; i++) {
    console.time(`Set job (${jobsToSetLiquidityTo[i]}) liquidity amount to 2 wei`);
    await liqManager.setJobLiquidityAmount(slpETHKP3R, jobsToSetLiquidityTo[i], 2);
    console.timeEnd(`Set job (${jobsToSetLiquidityTo[i]}) liquidity amount to 2 wei`);
  }
  // await advanceDays(1);
  // Execute force works
  for (let i = 0; i < jobsToForceWork.length; i++) {
    try {
      console.time(`Force work job (${jobsToForceWork[i]})`);
      await liqManagerJob.callStatic.forceWork(jobsToForceWork[i]);
      await liqManagerJob.forceWork(jobsToForceWork[i]);
      console.timeEnd(`Force work job (${jobsToForceWork[i]})`);
    } catch (error) {
      console.log(`${jobsToForceWork[i]} - not worked`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
