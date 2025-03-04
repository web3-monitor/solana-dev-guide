/**
 * 示例：Solana 钱包生成
 * 
 * 本示例展示多种生成 Solana 钱包的方法：
 * 1. 通过助记词生成单个钱包
 * 2. 通过私钥生成钱包
 * 3. 从同一助记词生成多个钱包（HD钱包）
 * 4. 生成指定前缀/后缀的钱包（多线程）
 * 
 * 运行方式：
 * ts-node ./2-wallet/wallet.ts
 */

import {
    Keypair,
} from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import bs58 from 'bs58';
import * as os from 'os';
import { Worker, isMainThread } from 'worker_threads';
import readline from 'readline';


// ---------------- 方法1：通过助记词生成钱包 ----------------

/**
 * 从助记词生成 Solana 钱包
 * @param mnemonic 助记词 (12-24个单词)
 * @param path 可选的派生路径，默认为 Solana 标准路径
 * @returns Solana 密钥对
 */
function createWalletFromMnemonic(mnemonic: string, path: string = "m/44'/501'/0'/0'"): Keypair {
    // 验证助记词是否有效
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('无效的助记词');
    }

    // 从助记词生成种子
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    // 按照路径派生私钥
    const derivedSeed = derivePath(path, seed.toString('hex')).key;

    // 创建 Solana 密钥对
    const keypair = Keypair.fromSeed(derivedSeed);

    return keypair;
}

/**
 * 生成新的随机助记词和钱包
 * @returns 包含助记词和钱包的对象
 */
function generateNewWallet(): { mnemonic: string; keypair: Keypair } {
    // 生成随机助记词 (12 个单词)
    const mnemonic = bip39.generateMnemonic();

    // 使用助记词创建钱包
    const keypair = createWalletFromMnemonic(mnemonic);

    return { mnemonic, keypair };
}

// ---------------- 方法2：通过私钥生成钱包 ----------------

/**
 * 从私钥字符串创建 Solana 钱包
 * @param privateKeyString Base58 编码的私钥字符串
 * @returns Solana 密钥对
 */
function createWalletFromPrivateKey(privateKeyString: string): Keypair {
    // 将 Base58 私钥转换为 Uint8Array
    const privateKeyBytes = bs58.decode(privateKeyString);

    // 创建 Solana 密钥对
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    return keypair;
}

/**
 * 从私钥数组创建 Solana 钱包
 * @param privateKeyArray 私钥字节数组 (Uint8Array)
 * @returns Solana 密钥对
 */
function createWalletFromPrivateKeyArray(privateKeyArray: Uint8Array): Keypair {
    return Keypair.fromSecretKey(privateKeyArray);
}

// ---------------- 方法3：从同一助记词生成多个钱包 ----------------

/**
 * 从同一助记词生成多个 Solana 钱包（HD钱包派生）
 * @param mnemonic 助记词
 * @param count 要生成的钱包数量
 * @param accountOffset 起始账户索引 (默认为0)
 * @returns 生成的钱包数组
 */
function deriveMultipleWallets(mnemonic: string, count: number, accountOffset: number = 0): Keypair[] {
    // 验证助记词
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('无效的助记词');
    }

    // 从助记词生成种子
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    const wallets: Keypair[] = [];

    // 生成多个钱包
    for (let i = 0; i < count; i++) {
        const accountIndex = i + accountOffset;

        // 构建BIP44派生路径
        // m/44'/501'/account'/0' - 标准Solana派生路径，501是Solana的币种代码
        const path = `m/44'/501'/${accountIndex}'/0'`;

        // 从种子按路径派生私钥
        const derivedSeed = derivePath(path, seed.toString('hex')).key;

        // 创建 Solana 密钥对
        const keypair = Keypair.fromSeed(derivedSeed);

        wallets.push(keypair);
    }

    return wallets;
}

// ---------------- 方法4：多线程生成指定前缀或后缀的钱包 ----------------

/**
 * 多线程生成具有指定前缀或后缀的 Solana 钱包
 * @param options 生成选项
 * @returns 找到的匹配钱包
 */
function generateVanityWallet(options: {
    prefix?: string;       // 前缀
    suffix?: string;       // 后缀
    caseSensitive?: boolean; // 是否区分大小写
    threadsCount?: number; // 线程数量
    timeout?: number;      // 超时时间(毫秒)
}): Promise<Keypair> {
    // 只在主线程执行主逻辑
    if (!isMainThread) {
        throw new Error('此函数只能在主线程中调用');
    }

    if (!options.prefix && !options.suffix) {
        throw new Error('必须指定前缀或后缀');
    }

    // 设置默认值
    const threadsCount = options.threadsCount || Math.max(1, os.cpus().length - 1);
    const timeout = options.timeout || 60000; // 默认60秒
    const caseSensitive = options.caseSensitive !== undefined ? options.caseSensitive : true;
    
    return new Promise((resolve, reject) => {
        console.log(`启动 ${threadsCount} 个线程寻找${caseSensitive ? '区分' : '不区分'}大小写的钱包地址...`);
        if (options.prefix) console.log(`前缀: ${options.prefix}`);
        if (options.suffix) console.log(`后缀: ${options.suffix}`);
        
        let timeoutId: NodeJS.Timeout | null = null;
        const workers: Worker[] = [];
        let walletFound = false;
        
        // 进度跟踪
        let totalAttempts = 0;
        let startTime = Date.now();
        let updateInterval: NodeJS.Timeout;
        
        // 创建更新进度的函数
        const updateProgress = () => {
            const elapsedSec = (Date.now() - startTime) / 1000;
            const rate = Math.floor(totalAttempts / elapsedSec);
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`进度: 已尝试 ${totalAttempts.toLocaleString()} 次 | 速率: ${rate.toLocaleString()} 次/秒`);
        };
        
        // 开始定期更新进度
        updateInterval = setInterval(updateProgress, 100); // 每100毫秒更新一次

        // 设置超时
        if (timeout > 0) {
            timeoutId = setTimeout(() => {
                clearInterval(updateInterval);
                console.log(`\n超时(${timeout}ms)! 正在停止所有线程...`);
                workers.forEach(worker => worker.terminate());
                reject(new Error('搜索超时'));
            }, timeout);
        }

        // 创建包含worker代码的字符串
        const workerScript = `
            const { parentPort, workerData } = require('worker_threads');
            const { Keypair } = require('@solana/web3.js');
            
            const { prefix, suffix, caseSensitive, threadId } = workerData;
            
            // 预处理前缀和后缀
            const searchPrefix = prefix ? (caseSensitive ? prefix : prefix.toLowerCase()) : '';
            const searchSuffix = suffix ? (caseSensitive ? suffix : suffix.toLowerCase()) : '';
            
            // 检查地址是否匹配
            function checkAddress(address) {
                const addr = caseSensitive ? address : address.toLowerCase();
                
                if (searchPrefix && !addr.startsWith(searchPrefix)) {
                    return false;
                }
                
                if (searchSuffix && !addr.endsWith(searchSuffix)) {
                    return false;
                }
                
                return true;
            }
            
            // 开始生成和检查钱包
            let attempts = 0;
            const startTime = Date.now();
            const progressInterval = 1000; // 每1000个钱包报告一次进度
            
            while (true) {
                attempts++;
                
                // 生成随机钱包
                const keypair = Keypair.generate();
                const publicKey = keypair.publicKey.toString();
                
                // 检查是否符合条件
                if (checkAddress(publicKey)) {
                    // 找到匹配的钱包，通知主线程
                    parentPort.postMessage({
                        found: true,
                        publicKey: publicKey,
                        secretKey: Array.from(keypair.secretKey),
                        attempts: attempts
                    });
                    
                    break;
                }
                
                // 定期报告进度
                if (attempts % progressInterval === 0) {
                    parentPort.postMessage({
                        progress: true,
                        attempts: progressInterval
                    });
                }
            }
        `;

        // 启动工作线程
        for (let i = 0; i < threadsCount; i++) {
            // 使用内联脚本创建Worker
            const worker = new Worker(workerScript, {
                eval: true,
                workerData: {
                    prefix: options.prefix,
                    suffix: options.suffix,
                    caseSensitive: caseSensitive,
                    threadId: i
                }
            });

            workers.push(worker);

            // 处理工作线程消息
            worker.on('message', (message) => {
                if (message.found && !walletFound) {
                    walletFound = true;
                    
                    // 停止更新进度
                    clearInterval(updateInterval);
                    
                    // 清除当前行并打印最终结果
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);
                    console.log(`找到匹配的钱包! 总尝试次数: ${totalAttempts + message.attempts}`);
                    
                    // 停止所有线程
                    workers.forEach(w => w.terminate());
                    
                    if (timeoutId) clearTimeout(timeoutId);
                    
                    // 将数组转换回 Uint8Array
                    const secretKey = new Uint8Array(message.secretKey);
                    const keypair = Keypair.fromSecretKey(secretKey);
                    
                    resolve(keypair);
                } else if (message.progress) {
                    // 更新总尝试次数
                    totalAttempts += message.attempts;
                }
            });

            // 处理错误
            worker.on('error', (err) => {
                console.error(`\n线程 ${i + 1} 错误:`, err);
                if (!walletFound) {
                    worker.terminate();
                }
            });

            worker.on('exit', (code) => {
                if (code !== 0 && !walletFound) {
                    console.error(`\n线程 ${i + 1} 退出，代码: ${code}`);
                }
            });
        }
    });
}



// ---------------- 钱包信息和展示 ----------------

/**
 * 展示钱包信息
 * @param name 钱包名称/描述
 * @param keypair Solana 密钥对
 */
function displayWalletInfo(name: string, keypair: Keypair): void {
    const publicKey = keypair.publicKey.toString();
    const privateKeyBase58 = bs58.encode(keypair.secretKey);

    console.log(`\n=== ${name} ===`);
    console.log(`地址: ${publicKey}`);
    console.log(`私钥 (Base58): ${privateKeyBase58}`);
    console.log(`私钥 (unit8Array): [${keypair.secretKey}]`)
}

/**
 * 展示多个钱包信息
 * @param name 钱包组名称/描述
 * @param wallets 钱包数组
 */
function displayMultipleWallets(name: string, wallets: Keypair[]): void {
    console.log(`\n=== ${name} (${wallets.length}个钱包) ===`);

    wallets.forEach((wallet, index) => {
        const publicKey = wallet.publicKey.toString();
        const privateKeyBase58 = bs58.encode(wallet.secretKey);

        console.log(`\n钱包 #${index + 1}:`);
        console.log(`地址: ${publicKey}`);
        console.log(`私钥 (Base58): ${privateKeyBase58}`);
        console.log(`私钥 (unit8Array): [${wallet.secretKey}]`)
    });
}

// ---------------- 主函数 ----------------

async function main() {
    console.log('Solana 钱包生成示例');

    // 示例1: 使用随机生成的助记词创建钱包
    console.log('\n1. 生成随机助记词并创建钱包');
    const { mnemonic, keypair: newWallet } = generateNewWallet();
    console.log(`生成的助记词: ${mnemonic}`);
    displayWalletInfo('新生成的钱包', newWallet);

    // 示例2: 使用特定助记词创建钱包
    console.log('\n2. 使用特定助记词恢复钱包');
    // 注意：这里使用的是示例助记词，实际使用中应该使用自己的助记词
    const sampleMnemonic = 'lemon sort plug harsh enroll heart soup uncle theory sea move solve';
    try {
        const recoveredWallet = createWalletFromMnemonic(sampleMnemonic);
        displayWalletInfo('从助记词恢复的钱包', recoveredWallet);
    } catch (error) {
        console.error('从助记词恢复钱包失败:', error);
    }

    // 示例3: 使用私钥创建钱包
    console.log('\n3. 使用私钥创建钱包');
    try {
        // 从上面生成的钱包中获取私钥 (实际使用中应该使用自己的私钥)
        const privateKeyBase58 = bs58.encode(newWallet.secretKey);
        const walletFromPrivateKey = createWalletFromPrivateKey(privateKeyBase58);
        displayWalletInfo('从私钥创建的钱包', walletFromPrivateKey);
    } catch (error) {
        console.error('从私钥创建钱包失败:', error);
    }

    // 示例4: 从同一助记词生成多个钱包 (不同账户)
    console.log('\n4. 从同一助记词生成多个钱包 (不同账户)');
    try {
        // 使用上面生成的助记词
        const walletCount = 3;
        const multipleWallets = deriveMultipleWallets(mnemonic, walletCount);
        displayMultipleWallets('不同账户钱包集', multipleWallets);

        // 验证第一个派生钱包与原始钱包是否匹配
        const isFirstWalletSame = multipleWallets[0].publicKey.equals(newWallet.publicKey);
        console.log(`验证: 第一个派生钱包与原钱包${isFirstWalletSame ? '匹配' : '不匹配'}`);
    } catch (error) {
        console.error('生成多个钱包失败:', error);
    }

    // 示例5: 生成带有指定前缀或后缀的钱包
    console.log('\n5. 生成带有指定前缀或后缀的钱包');
    try {
        console.log('开始搜索指定前缀的钱包...');
        
        // 使用多线程方式生成带特定前缀的钱包
        // 注意!!!!!!! 这可能需要很长时间，取决于前缀/后缀的长度和线程数，随着长度增加，难度呈指数级增长
        const vanityWallet = await generateVanityWallet({
            prefix: 'so',     // 指定前缀为"so"
            // suffix: 'xyz',    // 或指定后缀
            caseSensitive: true, // 区分大小写
            threadsCount: 8,    // 使用32个线程加速搜索
            timeout: 3000000     // 3000秒超时
        });
        
        console.log('找到匹配的钱包!');
        displayWalletInfo('定制前缀钱包', vanityWallet);
    } catch (error) {
        console.error('搜索定制钱包失败:', error);
    }

    console.log('\n⚠️ 安全提示:');
    console.log('- 永远不要向他人透露你的助记词或私钥');
    console.log('- 不要在生产代码中硬编码助记词或私钥');
    console.log('- 在安全的地方备份你的助记词和私钥');
    console.log('- 一个助记词可以生成无数个钱包，所以只需要备份一个助记词');
}

main().catch(err => {
    console.error('发生错误:', err);
});