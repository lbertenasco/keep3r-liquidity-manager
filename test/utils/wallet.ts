import { Wallet } from 'ethers';

const generateRandomAddress = async () => {
  const wallet = await Wallet.createRandom();
  return wallet.address;
};

export default {
  generateRandomAddress,
};
