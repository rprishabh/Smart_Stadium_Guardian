import { ethers } from "ethers";

// Your live deployed Soulbound NFT contract address
const CONTRACT_ADDRESS = "0xfe487d3cb42ac0215a5db27c38d7c3b34cc3291e";

// Optimized ABI matching your new ERC-1155 Soulbound Smart Contract
const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "volunteer", "type": "address" },
            { "internalType": "uint256", "name": "level", "type": "uint256" }
        ],
        "name": "awardBadge",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "account", "type": "address" },
            { "internalType": "uint256", "name": "id", "type": "uint256" }
        ],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }],
        "name": "uri",
        "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    }
];

// Request MetaMask connection and return the volunteer's wallet address
export async function connectWallet(): Promise<string | null> {
    if (!(window as any).ethereum) {
        alert("Please install MetaMask to utilize live Web3 features!");
        return null;
    }
    try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        return accounts[0];
    } catch (error) {
        console.error("Wallet connection failed:", error);
        return null;
    }
}

// Mint a specific Level Soulbound Badge to the volunteer based on hard work performance
export async function awardVolunteerBadge(
    volunteerAddress: string,
    level: number
): Promise<string | null> {
    if (!(window as any).ethereum) return null;

    try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Note: Since this is an NFT token level ID, we pass the integer directly 
        // rather than processing it through parseEther weights!
        const tx = await contract.awardBadge(volunteerAddress, level);
        const receipt = await tx.wait();

        // Returns the real transaction hash for your scrolling audit ledger
        return receipt.hash;
    } catch (error) {
        console.error("Blockchain minting transaction failed:", error);
        return null;
    }
}