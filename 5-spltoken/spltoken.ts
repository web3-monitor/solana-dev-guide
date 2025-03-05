import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  burn,
  createSetAuthorityInstruction,
  AuthorityType,
  createCloseAccountInstruction,
  createFreezeAccountInstruction,
  createThawAccountInstruction,
  approve,
  revoke,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import bs58 from 'bs58';

/**
 * 创建一个新的SPL代币
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param mintAuthority 代币铸造权限的公钥
 * @param freezeAuthority 代币冻结权限的公钥（可选）
 * @param decimals 代币精度（小数位数）
 * @returns 新创建的代币Mint地址
 */
async function createSplToken(
  connection: Connection,
  payer: Keypair,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null = null,
  decimals: number = 9
): Promise<PublicKey> {
  console.log('创建新的SPL代币...');

  // 创建一个新的Keypair作为代币的Mint地址
  const tokenMint = Keypair.generate();

  // 创建代币，设置铸造权限和冻结权限
  const createTokenTx = await createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals,
    tokenMint
  );

  console.log(`SPL代币创建成功！`);
  console.log(`- Mint地址: ${tokenMint.publicKey.toString()}`);
  console.log(`- 精度: ${decimals}`);
  console.log(`- 铸造权限: ${mintAuthority.toString()}`);
  console.log(`- 冻结权限: ${freezeAuthority ? freezeAuthority.toString() : '未设置'}`);
  console.log(`- 创建交易: ${createTokenTx}`);

  return tokenMint.publicKey;
}

/**
 * 获取SPL代币的信息
 * @param connection Solana连接实例
 * @param mintAddress 代币的Mint地址
 * @returns 代币信息
 */
async function getTokenInfo(
  connection: Connection,
  mintAddress: string | PublicKey
): Promise<{
  address: string;
  supply: string;
  decimals: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
}> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  const mintInfo = await getMint(connection, mintPublicKey);

  return {
    address: mintPublicKey.toString(),
    supply: (Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toString(),
    decimals: mintInfo.decimals,
    mintAuthority: mintInfo.mintAuthority ? mintInfo.mintAuthority.toString() : null,
    freezeAuthority: mintInfo.freezeAuthority ? mintInfo.freezeAuthority.toString() : null
  };
}

/**
 * 铸造新的代币到指定钱包
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param mintAddress 代币的Mint地址
 * @param destinationAddress 接收代币的钱包地址
 * @param mintAuthority 具有铸造权限的Keypair
 * @param amount 要铸造的代币数量（按显示单位，将自动根据精度转换）
 * @returns 交易签名
 */
export async function mintTokens(
  connection: Connection,
  payer: Keypair,
  mintAddress: string | PublicKey,
  destinationAddress: string | PublicKey,
  mintAuthority: Keypair,
  amount: number
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  const destinationPublicKey = typeof destinationAddress === 'string'
    ? new PublicKey(destinationAddress)
    : destinationAddress;

  // 获取代币精度
  const mintInfo = await getMint(connection, mintPublicKey);
  const tokenDecimals = mintInfo.decimals;

  // 获取或创建接收者的代币账户
  const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPublicKey,
    destinationPublicKey
  );

  // 计算实际铸造的数量（考虑精度）
  const amountToMint = amount * Math.pow(10, tokenDecimals);

  // 铸造代币
  const signature = await mintTo(
    connection,
    payer,
    mintPublicKey,
    destinationTokenAccount.address,
    mintAuthority,
    BigInt(Math.floor(amountToMint))
  );

  console.log(`铸造成功: ${amount} 个代币已发送到 ${destinationPublicKey.toString()}`);
  console.log(`- 代币账户: ${destinationTokenAccount.address.toString()}`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 转账SPL代币给其他钱包
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param source 发送代币的Keypair
 * @param mintAddress 代币的Mint地址
 * @param destinationAddress 接收代币的钱包地址
 * @param amount 要转账的代币数量（按显示单位，将自动根据精度转换）
 * @returns 交易签名
 */
async function transferTokens(
  connection: Connection,
  payer: Keypair,
  source: Keypair,
  mintAddress: string | PublicKey,
  destinationAddress: string | PublicKey,
  amount: number
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  const destinationPublicKey = typeof destinationAddress === 'string'
    ? new PublicKey(destinationAddress)
    : destinationAddress;

  // 获取代币精度
  const mintInfo = await getMint(connection, mintPublicKey);
  const tokenDecimals = mintInfo.decimals;

  // 获取或创建源钱包的代币账户
  const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPublicKey,
    source.publicKey
  );

  // 获取或创建目标钱包的代币账户
  const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPublicKey,
    destinationPublicKey
  );

  // 计算实际转账的数量（考虑精度）
  const amountToTransfer = amount * Math.pow(10, tokenDecimals);

  // 转账代币
  const signature = await transfer(
    connection,
    payer,
    sourceTokenAccount.address,
    destinationTokenAccount.address,
    source,
    BigInt(Math.floor(amountToTransfer))
  );

  console.log(`转账成功: ${amount} 个代币已从 ${source.publicKey.toString()} 发送到 ${destinationPublicKey.toString()}`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 销毁（燃烧）代币
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param account 持有代币的钱包Keypair
 * @param mintAddress 代币的Mint地址
 * @param amount 要销毁的代币数量（按显示单位，将自动根据精度转换）
 * @returns 交易签名
 */
async function burnTokens(
  connection: Connection,
  payer: Keypair,
  account: Keypair,
  mintAddress: string | PublicKey,
  amount: number
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  // 获取代币精度
  const mintInfo = await getMint(connection, mintPublicKey);
  const tokenDecimals = mintInfo.decimals;

  // 获取账户的代币账户
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPublicKey,
    account.publicKey
  );

  // 计算实际销毁的数量（考虑精度）
  const amountToBurn = amount * Math.pow(10, tokenDecimals);

  // 销毁代币
  const signature = await burn(
    connection,
    payer,
    tokenAccount.address,
    mintPublicKey,
    account,
    BigInt(Math.floor(amountToBurn))
  );

  console.log(`销毁成功: ${amount} 个代币已从 ${account.publicKey.toString()} 销毁`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 获取钱包的SPL代币余额
 * @param connection Solana连接实例
 * @param walletAddress 钱包地址
 * @param mintAddress 代币的Mint地址
 * @returns 代币余额（按显示单位）和代币账户地址
 */
async function getTokenBalance(
  connection: Connection,
  walletAddress: string | PublicKey,
  mintAddress: string | PublicKey
): Promise<{ balance: number, tokenAccount: string }> {
  const walletPublicKey = typeof walletAddress === 'string'
    ? new PublicKey(walletAddress)
    : walletAddress;

  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  try {
    // 获取关联代币账户地址
    const tokenAccountAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey
    );

    // 获取代币精度
    const mintInfo = await getMint(connection, mintPublicKey);
    const tokenDecimals = mintInfo.decimals;

    try {
      // 获取代币账户信息
      const tokenAccountInfo = await connection.getTokenAccountBalance(tokenAccountAddress);
      const balance = Number(tokenAccountInfo.value.amount) / Math.pow(10, tokenDecimals);

      return {
        balance,
        tokenAccount: tokenAccountAddress.toString()
      };
    } catch (err) {
      // 账户可能不存在
      return {
        balance: 0,
        tokenAccount: tokenAccountAddress.toString()
      };
    }
  } catch (error) {
    console.error('获取代币余额失败:', error);
    throw error;
  }
}

/**
 * 授权另一个账户使用指定数量的代币
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param owner 代币所有者Keypair
 * @param delegate 被授权的公钥
 * @param mintAddress 代币的Mint地址
 * @param amount 授权使用的代币数量（按显示单位，将自动根据精度转换）
 * @returns 交易签名
 */
async function approveTokenDelegate(
  connection: Connection,
  payer: Keypair,
  owner: Keypair,
  delegate: PublicKey,
  mintAddress: string | PublicKey,
  amount: number
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  // 获取代币精度
  const mintInfo = await getMint(connection, mintPublicKey);
  const tokenDecimals = mintInfo.decimals;

  // 获取所有者的代币账户
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPublicKey,
    owner.publicKey
  );

  // 计算实际授权的数量（考虑精度）
  const amountToApprove = amount * Math.pow(10, tokenDecimals);

  // 授权代币
  const signature = await approve(
    connection,
    payer,
    tokenAccount.address,
    delegate,
    owner,
    BigInt(Math.floor(amountToApprove))
  );

  console.log(`授权成功: ${delegate.toString()} 被授权使用 ${amount} 个代币`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 撤销对代理的代币使用授权
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param owner 代币所有者Keypair
 * @param mintAddress 代币的Mint地址
 * @returns 交易签名
 */
export async function revokeTokenDelegate(
  connection: Connection,
  payer: Keypair,
  owner: Keypair,
  mintAddress: string | PublicKey
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  // 获取所有者的代币账户
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPublicKey,
    owner.publicKey
  );

  // 撤销授权
  const signature = await revoke(
    connection,
    payer,
    tokenAccount.address,
    owner
  );

  console.log(`撤销授权成功: 所有授权已被撤销`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 冻结代币账户
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param mintAddress 代币的Mint地址
 * @param accountToFreeze 要冻结的代币账户地址
 * @param freezeAuthority 拥有冻结权限的Keypair
 * @returns 交易签名
 */
async function freezeTokenAccount(
  connection: Connection,
  payer: Keypair,
  mintAddress: string | PublicKey,
  accountToFreeze: string | PublicKey,
  freezeAuthority: Keypair
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  const accountToFreezePublicKey = typeof accountToFreeze === 'string'
    ? new PublicKey(accountToFreeze)
    : accountToFreeze;

  // 创建交易
  const transaction = new Transaction().add(
    createFreezeAccountInstruction(
      accountToFreezePublicKey,
      mintPublicKey,
      freezeAuthority.publicKey,
    )
  );

  // 设置最近的区块哈希和支付人
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // 签名并发送交易
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, freezeAuthority]
  );

  console.log(`账户冻结成功: ${accountToFreezePublicKey.toString()}`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 解冻代币账户
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param mintAddress 代币的Mint地址
 * @param accountToThaw 要解冻的代币账户地址
 * @param freezeAuthority 拥有冻结权限的Keypair
 * @returns 交易签名
 */
export async function thawTokenAccount(
  connection: Connection,
  payer: Keypair,
  mintAddress: string | PublicKey,
  accountToThaw: string | PublicKey,
  freezeAuthority: Keypair
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  const accountToThawPublicKey = typeof accountToThaw === 'string'
    ? new PublicKey(accountToThaw)
    : accountToThaw;

  // 创建交易
  const transaction = new Transaction().add(
    createThawAccountInstruction(
      accountToThawPublicKey,
      mintPublicKey,
      freezeAuthority.publicKey,
    )
  );

  // 设置最近的区块哈希和支付人
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // 签名并发送交易
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, freezeAuthority]
  );

  console.log(`账户解冻成功: ${accountToThawPublicKey.toString()}`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 关闭代币账户，回收租金
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param owner 代币账户所有者Keypair
 * @param tokenAccount 要关闭的代币账户地址
 * @param destination 租金接收地址（默认为owner）
 * @returns 交易签名
 */
export async function closeTokenAccount(
  connection: Connection,
  payer: Keypair,
  owner: Keypair,
  tokenAccount: string | PublicKey,
  destination: string | PublicKey = owner.publicKey
): Promise<string> {
  const tokenAccountPublicKey = typeof tokenAccount === 'string'
    ? new PublicKey(tokenAccount)
    : tokenAccount;

  const destinationPublicKey = typeof destination === 'string'
    ? new PublicKey(destination)
    : destination;

  // 创建交易
  const transaction = new Transaction().add(
    createCloseAccountInstruction(
      tokenAccountPublicKey,
      destinationPublicKey,
      owner.publicKey,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // 设置最近的区块哈希和支付人
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // 签名并发送交易
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, owner]
  );

  console.log(`代币账户关闭成功: ${tokenAccountPublicKey.toString()}`);
  console.log(`- 租金已返还到: ${destinationPublicKey.toString()}`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

/**
 * 转移代币的铸造权限
 * @param connection Solana连接实例
 * @param payer 支付交易费用的Keypair
 * @param mintAddress 代币的Mint地址
 * @param currentAuthority 当前拥有铸造权限的Keypair
 * @param newAuthority 新的铸造权限地址（如果设为null则放弃权限）
 * @returns 交易签名
 */
async function transferMintAuthority(
  connection: Connection,
  payer: Keypair,
  mintAddress: string | PublicKey,
  currentAuthority: Keypair,
  newAuthority: PublicKey | null
): Promise<string> {
  const mintPublicKey = typeof mintAddress === 'string'
    ? new PublicKey(mintAddress)
    : mintAddress;

  // 创建交易
  const transaction = new Transaction().add(
    createSetAuthorityInstruction(
      mintPublicKey,
      currentAuthority.publicKey,
      AuthorityType.MintTokens,
      newAuthority,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // 设置最近的区块哈希和支付人
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  // 签名并发送交易
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, currentAuthority]
  );

  console.log(`铸造权限转移成功`);
  console.log(`- 从: ${currentAuthority.publicKey.toString()}`);
  console.log(`- 到: ${newAuthority ? newAuthority.toString() : '已放弃权限'}`);
  console.log(`- 交易签名: ${signature}`);

  return signature;
}

(async () => {
  console.log('======= SPL 代币测试开始 =======');
    
    // 1. 连接到 Solana 测试网
    const rpcUrl = 'https://api.testnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    console.log('已连接到 Solana 测试网络');
    
    // 2. 创建测试钱包
    const secretKey = '使用你自己的测试网钱包私钥';
    const decodedSecretKey = bs58.decode(secretKey);
    const payer = Keypair.fromSecretKey(decodedSecretKey);
    const recipient = Keypair.generate();
    
    // 3. 创建一个新代币
    const mintAuthority = payer; // 铸造权限
    const freezeAuthority = payer; // 冻结权限
    const tokenDecimals = 6; // 代币精度
    
    const tokenMint = await createSplToken(
      connection,
      payer,
      mintAuthority.publicKey,
      freezeAuthority.publicKey,
      tokenDecimals
    );
    
    // 4. 获取代币信息
    const tokenInfo = await getTokenInfo(connection, tokenMint);
    console.log('代币信息:', tokenInfo);
    
    // 5. 铸造代币
    console.log('\n铸造代币测试:');
    // 向 payer 铸造 1000 代币
    await mintTokens(
      connection,
      payer,
      tokenMint,
      payer.publicKey,
      mintAuthority,
      1000
    );
    
    // 获取铸造后余额
    let payerBalance = await getTokenBalance(
      connection,
      payer.publicKey,
      tokenMint
    );
    console.log(`Payer 代币余额: ${payerBalance.balance}`);
    
    // 6. 转账测试
    console.log('\n转账代币测试:');
    // 向接收者转账 250 代币
    await transferTokens(
      connection,
      payer,
      payer, 
      tokenMint,
      recipient.publicKey,
      250
    );
    
    // 获取转账后余额
    payerBalance = await getTokenBalance(connection, payer.publicKey, tokenMint);
    const recipientBalance = await getTokenBalance(connection, recipient.publicKey, tokenMint);
    
    console.log(`Payer 代币余额: ${payerBalance.balance}`);
    console.log(`Recipient 代币余额: ${recipientBalance.balance}`);
    
    // 7. 代理授权测试
    console.log('\n代理授权测试:');
    // 授权接收者可以使用 payer 的 100 个代币
    await approveTokenDelegate(
      connection,
      payer,
      payer,
      recipient.publicKey,
      tokenMint,
      100
    );
    
    // 撤销授权
    await revokeTokenDelegate(
      connection,
      payer,
      payer,
      tokenMint
    );
    
    // 8. 冻结/解冻账户测试
    console.log('\n冻结/解冻账户测试:');
    // 获取接收者的代币账户地址
    const recipientTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      recipient.publicKey
    );
    
    // 冻结接收者账户
    await freezeTokenAccount(
      connection,
      payer,
      tokenMint,
      recipientTokenAccount,
      freezeAuthority
    );
    
    // 解冻接收者账户
    await thawTokenAccount(
      connection,
      payer,
      tokenMint,
      recipientTokenAccount,
      freezeAuthority
    );
    
    // 9. 燃烧代币测试
    console.log('\n燃烧代币测试:');
    await burnTokens(
      connection,
      payer,
      payer,
      tokenMint,
      100
    );
    
    // 获取燃烧后余额
    payerBalance = await getTokenBalance(connection, payer.publicKey, tokenMint);
    console.log(`Payer 燃烧后代币余额: ${payerBalance.balance}`);
    
    // 10. 转移铸造权限测试
    console.log('\n转移铸造权限测试:');
    const newAuthority = Keypair.generate();
    await transferMintAuthority(
      connection,
      payer,
      tokenMint,
      mintAuthority,
      newAuthority.publicKey
    );
    
    // 获取更新后的代币信息
    const updatedTokenInfo = await getTokenInfo(connection, tokenMint);
    console.log('更新后的代币信息:', updatedTokenInfo);
    
    // 11. 关闭代币账户
    console.log('\n关闭代币账户:');
    // 注意: 这将会关闭账户，会导致用户无法再接收此代币，除非重新创建账户
    // 首先确保账户中的代币已经全部转移或燃烧
    await burnTokens(
      connection,
      payer,
      recipient,
      tokenMint,
      recipientBalance.balance
    );
    
    // 关闭账户
    await closeTokenAccount(
      connection,
      payer,
      recipient,
      recipientTokenAccount
    );
    
    console.log('\n======= SPL 代币测试完成 =======');
})().catch(err => console.error(err));