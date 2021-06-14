import { JsonRpcSigner } from '@ethersproject/providers';

import hre, { network } from 'hardhat';
const ethers = hre.ethers;

import config from '../../.config.json';
import { e18 } from '../../utils/web3-utils';

const accounts = [
  '0x0000ce2cc1fd87494432faa18e1878048a4c1b00',
  '0x0001281035131705eddb774276640d3116cb006a',
  '0x00022b7dd504ef143b48054b8a9cbcb8de200bc4',
];

async function main() {
  await hre.run('compile');
  await new Promise(async () => {
    let lpWhale: JsonRpcSigner;
    const lpWhaleAddress: string = '0x645e4bfd69a692bb7314ee5b0568342d0a34388b';
    const uniKp3rEthLPAddress: string = '0x87fEbfb3AC5791034fD5EF1a615e9d9627C2665D';
    const lpAddress: string = uniKp3rEthLPAddress;

    // impersonate lp whale
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [lpWhaleAddress],
    });
    lpWhale = ethers.provider.getSigner(lpWhaleAddress);

    const keep3rLiquidityManager = await ethers.getContractAt('Keep3rLiquidityManager', config.contracts.mainnet.klm.keep3rLiquidityManager);
    const lp = await ethers.getContractAt('IERC20', lpAddress);
    // impersonate liquidity manager governor
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [await keep3rLiquidityManager.governor()],
    });
    const liquidityManagerGovernor = ethers.provider.getSigner(await keep3rLiquidityManager.governor());
    await keep3rLiquidityManager.connect(liquidityManagerGovernor).setMinAmount(lp.address, e18);
    await keep3rLiquidityManager.connect(liquidityManagerGovernor).setLiquidityFee(25); // 2.5%

    for (const account of accounts) {
      console.log('sending tokens to:', account);
      // get LPs and ether
      (await ethers.getContractFactory('ForceETH')).deploy(account, {
        value: e18.mul(10),
      });
      const amount = e18.mul(100);
      await lp.connect(lpWhale).transfer(account, amount);
    }
    console.log('ready :)');
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
