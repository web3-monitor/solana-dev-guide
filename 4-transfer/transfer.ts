import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction,
    Keypair,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount,
    TOKEN_PROGRAM_ID,
    getMint,
} from '@solana/spl-token';
import bs58 from 'bs58';

// 替换为你的RPC节点URL, 官方公开节点性能比较差
const rpcUrl = 'https://api.mainnet-beta.solana.com';

/**
 * 转账SOL
 * @param secretKey 发送者的私钥
 * @param recipientAddress 接收者的钱包地址
 * @param amount 转账金额(以SOL为单位)
 */
async function transferSOL(
    secretKey: string,
    recipientAddress: string,
    amount: number
) {
    try {
        // 根据私钥生成Keypair
        const decodedSecretKey = bs58.decode(secretKey);
        const senderKeypair = Keypair.fromSecretKey(decodedSecretKey);

        // 连接Solana
        const connection = new Connection(rpcUrl, 'confirmed');

        // 创建接收者公钥
        const recipientPublicKey = new PublicKey(recipientAddress);

        // 验证接收者地址是否有效
        if (!PublicKey.isOnCurve(recipientPublicKey.toBuffer())) {
            throw new Error('无效的接收者钱包地址');
        }

        // 检查发送者余额
        const senderBalance = await connection.getBalance(senderKeypair.publicKey);
        const amountInLamports = amount * LAMPORTS_PER_SOL;

        if (senderBalance < amountInLamports + 5000) { // 加上一些手续费
            throw new Error(`余额不足。当前余额: ${senderBalance / LAMPORTS_PER_SOL} SOL，需要: ${amount} SOL加上手续费`);
        }

        console.log(`开始转账 ${amount} SOL 从 ${senderKeypair.publicKey.toString()} 到 ${recipientAddress}`);

        // 创建转账交易
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: recipientPublicKey,
                lamports: amountInLamports
            })
        );

        // 设置最近的区块哈希和支付人
        transaction.feePayer = senderKeypair.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // 模拟交易
        const simulatedTransaction = await connection.simulateTransaction(transaction, [senderKeypair]);
        console.log('模拟交易结果:', simulatedTransaction);

        // 发送并确认交易
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair]
        );

        console.log(`交易成功！交易签名: ${signature}`);
        console.log(`Solscan交易链接: https://solscan.io/tx/${signature}`);

        return signature;
    } catch (error) {
        console.error('SOL转账失败:', error);
        throw error;
    }
}

/**
 * 转账SPL代币 - 自动获取代币精度
 * @param secretKey 发送者的私钥
 * @param recipientAddress 接收者的钱包地址
 * @param tokenMintAddress 代币的Mint地址
 * @param amount 转账金额(以代币的显示单位计算，如1个USDC就是1，而不是1000000)
 */
async function transferSPLToken(
    secretKey: string,
    recipientAddress: string,
    tokenMintAddress: string,
    amount: number
  ) {
    try {
      // 根据私钥生成Keypair
      const decodedSecretKey = bs58.decode(secretKey);
      const senderKeypair = Keypair.fromSecretKey(decodedSecretKey);
      
      // 连接Solana
      const connection = new Connection(rpcUrl, 'confirmed');
      
      // 创建公钥
      const recipientPublicKey = new PublicKey(recipientAddress);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);
      
      // 验证接收者地址是否有效
      if (!PublicKey.isOnCurve(recipientPublicKey.toBuffer())) {
        throw new Error('无效的接收者钱包地址');
      }
      
      // 获取代币精度信息
      console.log(`获取代币 ${tokenMintAddress} 的精度信息...`);
      const mintInfo = await getMint(connection, tokenMintPublicKey);
      const decimals = mintInfo.decimals;
      console.log(`代币精度: ${decimals}`);
      
      // 获取发送者的代币账户地址
      const senderTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        senderKeypair.publicKey
      );
      
      // 检查发送者的代币余额
      let senderTokenAccountInfo;
      try {
        senderTokenAccountInfo = await getAccount(connection, senderTokenAccount);
      } catch (error) {
        throw new Error(`发送者没有${tokenMintAddress}代币的账户`);
      }
      
      // 计算代币数量（考虑精度）
      const tokenAmountBigInt = BigInt(Math.floor(amount * Math.pow(10, decimals)));
      const currentBalance = Number(senderTokenAccountInfo.amount) / Math.pow(10, decimals);
      
      if (senderTokenAccountInfo.amount < tokenAmountBigInt) {
        throw new Error(`代币余额不足。当前余额: ${currentBalance}, 需要: ${amount}`);
      }
      
      console.log(`当前代币余额: ${currentBalance}`);
      
      // 获取接收者的代币账户地址
      const recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMintPublicKey,
        recipientPublicKey
      );
      
      const transaction = new Transaction();
      
      // 检查接收者是否已经有这个代币的账户，如果没有则创建
      let recipientHasAccount = true;
      try {
        await getAccount(connection, recipientTokenAccount);
        console.log('接收者已经有代币账户');
      } catch (error) {
        recipientHasAccount = false;
        console.log('接收者没有代币账户，将自动创建');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            senderKeypair.publicKey,  // 支付账户创建费用
            recipientTokenAccount,    // 要创建的账户
            recipientPublicKey,       // 账户所有者
            tokenMintPublicKey        // 代币Mint
          )
        );
      }
      
      console.log(`开始转账 ${amount} 单位代币(精度为${decimals})从 ${senderKeypair.publicKey.toString()} 到 ${recipientAddress}`);
      
      // 添加转账指令
      transaction.add(
        createTransferInstruction(
          senderTokenAccount,         // 源账户
          recipientTokenAccount,      // 目标账户
          senderKeypair.publicKey,    // 所有者
          tokenAmountBigInt           // 金额（已考虑精度）
        )
      );
      
      // 设置最近的区块哈希和支付人
      transaction.feePayer = senderKeypair.publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      
      // 发送并确认交易
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );
      
      console.log(`交易成功！交易签名: ${signature}`);
      console.log(`Solscan交易链接: https://solscan.io/tx/${signature}`);
      console.log(`接收者${recipientHasAccount ? '已有' : '已创建'}代币账户: ${recipientTokenAccount.toString()}`);
      
      return {
        signature,
        decimals,
        tokenAmount: amount,
        tokenAmountRaw: tokenAmountBigInt.toString(),
        recipientTokenAccount: recipientTokenAccount.toString()
      };
    } catch (error) {
      console.error('SPL代币转账失败:', error);
      throw error;
    }
  }

const secretKey = '填写你的钱包私钥'; // 发送者的私钥
const recipientAddress = '收款地址'; // 接收者的钱包地址
const solAmount = 0.01; // 转账sol金额

const tokenMintAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; //以USDC为例
const tokenAmount = 1; // 转账spltoken金额

(async () => {
    // 转账SOL
    await transferSOL(secretKey, recipientAddress, solAmount);

    // 转账SPL代币
    await transferSPLToken(secretKey, recipientAddress, tokenMintAddress, tokenAmount);
})();
