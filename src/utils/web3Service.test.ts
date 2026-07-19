import { connectWallet, awardVolunteerBadge } from './web3Service';

describe('Web3 Service Audit & Minting', () => {
  const originalEthereum = (window as any).ethereum;

  beforeEach(() => {
    delete (window as any).ethereum;
  });

  afterAll(() => {
    (window as any).ethereum = originalEthereum;
  });

  test('connectWallet returns null gracefully when window.ethereum is not present', async () => {
    // Suppress window.alert during headless test execution
    window.alert = jest.fn();
    const result = await connectWallet();
    expect(result).toBeNull();
  });

  test('awardVolunteerBadge returns null gracefully when window.ethereum is not present', async () => {
    const result = await awardVolunteerBadge('0x123', 1);
    expect(result).toBeNull();
  });
});
