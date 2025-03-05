import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// 获取钱包的SOL余额和所有SPL代币余额
async function getWalletBalances(walletAddress: string) {
    
    const rpcUrl = 'https://api.mainnet-beta.solana.com'; // 替换为你的RPC节点URL
    const connection = new Connection(rpcUrl, 'confirmed');

    try {
        const publicKey = new PublicKey(walletAddress);

        // 获取SOL余额
        const lamportBalance = await connection.getBalance(publicKey);
        const solBalance = lamportBalance / LAMPORTS_PER_SOL;
        console.log('SOL余额:', solBalance, 'SOL');

        // 获取所有SPL代币账户
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { programId: TOKEN_PROGRAM_ID },
            'confirmed'
        );

        console.log(`查找到 ${tokenAccounts.value.filter(it => Number(it.account.data.parsed.info.tokenAmount.amount) > 0).length} 个余额大于0的SPL代币账户`);
        console.log('------------------------');

        // 如果没有任何代币账户
        if (tokenAccounts.value.length === 0) {
            console.log('该钱包没有持有任何SPL代币');
            return;
        }

        // 遍历所有代币账户并显示余额
        tokenAccounts.value.forEach((tokenAccount) => {
            const tokenInfo = tokenAccount.account.data.parsed.info;
            const tokenMint = tokenInfo.mint;
            const tokenAmount = tokenInfo.tokenAmount;

            // 只显示余额大于0的代币
            if (Number(tokenAmount.amount) > 0) {
                const decimals = tokenAmount.decimals;
                const amount = Number(tokenAmount.amount) / Math.pow(10, decimals);

                console.log(`代币合约地址: ${tokenMint}`);
                console.log(`余额: ${amount} (精度: ${decimals})`);
                console.log(`代币账户: ${tokenAccount.pubkey.toString()}`);
                console.log('------------------------');
            }
        });

    } catch (error) {
        console.error('获取钱包余额时出错:', error);
    }
}

// 请将此处替换为你想要查询的Solana钱包地址
const walletAddress = '5B7BwmRp9EJfFGLeyC6S6KWGBHRUHZ7WbaDgW8mnVpQY';

// 调用函数
getWalletBalances(walletAddress);