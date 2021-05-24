import { ContractFactory } from '@ethersproject/contracts';
import { BigNumber, providers, utils } from 'ethers';
import { hexZeroPad, id } from 'ethers/lib/utils';
import hre from 'hardhat';
const ethers = hre.ethers;

let cachedBlocks: any = {};

async function main() {
  await hre.run('compile');
  await getJobProvenance('0x02027bDA2425204f152B8aa35Fb78687D65E1AF5');
}

const getJobProvenance = async (job: string) => {
  const liqManager = await ethers.getContractAt(
    'contracts/keep3r-liquidity-manager/Keep3rLiquidityManager.sol:Keep3rLiquidityManager',
    '0xf14cb1feb6c40f26d9ca0ea39a9a613428cdc9ca'
  );
  const liqManagerJob = await ethers.getContractAt(
    'contracts/job/Keep3rLiquidityManagerJob.sol:Keep3rLiquidityManagerJob',
    '0x7e0cc5edf2dd01fc543d698b7e00ff54c6c39085'
  );
  const setJobLogs = await liqManager.queryFilter(
    {
      topics: [id('LiquidityOfJobSet(address,address,address,uint256)')],
    },
    12104114,
    12498986
  );
  let logs: any[] = [];
  const setJobFilteredLogs = setJobLogs.filter((log) => {
    return log.args!._job == job;
  });
  for (let i = 0; i < setJobFilteredLogs.length; i++) {
    logs.push({
      ...setJobFilteredLogs[i],
      type: 'set',
      timestamp: await getBlockTimestamp(setJobFilteredLogs[i].blockNumber),
    });
  }
  const jobWorks = await liqManagerJob.queryFilter(
    {
      topics: [id('Worked(address,address,uint256,bool)')],
    },
    12104538,
    12498986
  );
  const jobWorksFilteredLogs = jobWorks.filter((log) => {
    return log.args!._job == job;
  });
  for (let i = 0; i < jobWorksFilteredLogs.length; i++) {
    logs.push({
      ...jobWorksFilteredLogs[i],
      type: 'work',
      timestamp: await getBlockTimestamp(jobWorksFilteredLogs[i].blockNumber),
    });
  }
  const jobForcedWorks = await liqManagerJob.queryFilter(
    {
      topics: [id('ForceWorked(address)')],
    },
    12104538,
    12498986
  );
  const jobForcedWorksFilteredLogs = jobForcedWorks.filter((log) => {
    return log.args!._job == job;
  });

  for (let i = 0; i < jobForcedWorksFilteredLogs.length; i++) {
    logs.push({
      ...jobForcedWorksFilteredLogs[i],
      type: 'forceWork',
      timestamp: await getBlockTimestamp(jobForcedWorksFilteredLogs[i].blockNumber),
    });
  }
  logs.sort((x, y) => x.timestamp - y.timestamp);
  console.log('***********');
  logs.forEach((log) => {
    console.log('type', log.type);
    if (log.type === 'set') console.log('amount', utils.formatEther(log.args._amount));
    console.log('hash', log.transactionHash);
    console.log('block number', log.blockNumber);
    // console.log('timestamp', log.timestamp);
    // console.log('tx hash', log.transactionHash);
    console.log('***********');
  });
};

const getBlockTimestamp = async (blockNumber: number) => {
  if (cachedBlocks.hasOwnProperty(blockNumber)) return cachedBlocks[blockNumber];
  const timestamp = (await ethers.provider.getBlock(blockNumber)).timestamp;
  cachedBlocks[blockNumber] = timestamp;
  return timestamp;
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
