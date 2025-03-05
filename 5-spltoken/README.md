# Solana SPL 代币操作工具

提供了一系列用于操作 Solana SPL 代币的 ts 方法，包括创建代币、发行、铸造、销毁、授权和查询等功能。

## 功能概览

- 创建新的 SPL 代币
- 铸造代币到指定钱包
- 销毁代币
- 转账代币
- 查询代币信息和余额
- 授权和撤销授权
- 冻结和解冻代币账户
- 关闭代币账户

## 安装依赖

## 运行
```bash
ts-node ./5-spltoken/spltoken.ts
```

## 测试日志（在testnet进行的测试）
```bash
======= SPL 代币测试开始 =======
已连接到 Solana 测试网络
创建新的SPL代币...
SPL代币创建成功！
- Mint地址: CLS5bQuUtXBTYvdqZi1vVHgmE591TkkznQtYAYSGKi5L
- 精度: 6
- 铸造权限: 4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv
- 冻结权限: 4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv
- 创建交易: CLS5bQuUtXBTYvdqZi1vVHgmE591TkkznQtYAYSGKi5L
代币信息: {
  address: 'CLS5bQuUtXBTYvdqZi1vVHgmE591TkkznQtYAYSGKi5L',
  supply: '0',
  decimals: 6,
  mintAuthority: '4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv',
  freezeAuthority: '4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv'
}

铸造代币测试:
铸造成功: 1000 个代币已发送到 4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv
- 代币账户: 4RAXpvNBv1rHDYiRgk2E88YfJyHUrxZjhpaWZcbRc6f2
- 交易签名: XySAq7smvwtF2KeNgbdxpXxs5HDhJtKnKryBSDMQBjczUvS7HXaewXXc6qJurwqjMNqvqqqYM5nZiTJ3NDjrzm9
Payer 代币余额: 1000

转账代币测试:
转账成功: 250 个代币已从 4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv 发送到 8h3GuaWuin1u8Uu2ps9DFvxeWtgQecEybPTxBqEpHbvx
- 交易签名: 46SA8M1XJNhfDX69APVp5MJRbewVdBjRvb31UYmEXfEQaEAGStPHSoUzpCDXXK1kH8d5Z8E4MWFQVRwBL1cUdZyn
Payer 代币余额: 750
Recipient 代币余额: 250

代理授权测试:
授权成功: 8h3GuaWuin1u8Uu2ps9DFvxeWtgQecEybPTxBqEpHbvx 被授权使用 100 个代币
- 交易签名: 4DBCAkw1fx74uGtZ8po4LRwsYKcGSuyBRHnTyRsiF4NDZTC5Vm9txbEPLAZx8wJBT2v6coBJ3depvhVXgzu1vbCw
撤销授权成功: 所有授权已被撤销
- 交易签名: 2vjEGSKqQ24d1Vwgt48xoXRHcgk9H6XnZ6icGXXtUFhFWy3aoKPyfdea1U9GPfPPNE3ej5sCo7uaFBw4j3TLrERg

冻结/解冻账户测试:
账户冻结成功: BTAkLHT4Y3oFMm21iC2oAbb8ZxwQh1th2asJnKe7hZj4
- 交易签名: 4RrboWNwMMNizkR8YMSiGqxWgoPhtrg73cCMeFtNGiFrog4e8fRMNNue8929AWLkUW4NQG7BHt12yRfgSFrtB1WV
账户解冻成功: BTAkLHT4Y3oFMm21iC2oAbb8ZxwQh1th2asJnKe7hZj4
- 交易签名: 3Zq5GHdTdz6u44i288fK13UmTkxuV5BcP9JedMfj1Ru71rHUjuEsErKtB4dfRhgTzH2SU6SEPBuHQmTL3eZkYe17

燃烧代币测试:
销毁成功: 100 个代币已从 4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv 销毁
- 交易签名: 449aYt2jxjSyXvGbtp2dXh7ZVHH9zi58KEzKxJ33SWvTnNSGP5JvKKjwCccNdv4frn47hNPY4fCAFD63NmYQMLDz
Payer 燃烧后代币余额: 650

转移铸造权限测试:
铸造权限转移成功
- 从: 4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv
- 到: EBBrdvUuyvGdQ6v63YiWysfXmJeXVHTpkzcK1GRsNLSE
- 交易签名: 6745rSPrgYMsLff8vuwz8L5oDkdPXJstmqGWXQYoBBwBHtfKYvkroTn9iY7M6GoN5pZk6WaNfrLdGSH6d1n3dEs3
更新后的代币信息: {
  address: 'CLS5bQuUtXBTYvdqZi1vVHgmE591TkkznQtYAYSGKi5L',
  supply: '900',
  decimals: 6,
  mintAuthority: 'EBBrdvUuyvGdQ6v63YiWysfXmJeXVHTpkzcK1GRsNLSE',
  freezeAuthority: '4cfdshKcXLyN8zYGhcMP9EN8PDm15ACPJNs716gPpbHv'
}

关闭代币账户:
销毁成功: 250 个代币已从 8h3GuaWuin1u8Uu2ps9DFvxeWtgQecEybPTxBqEpHbvx 销毁
- 交易签名: 3sTGdDz2FkoVuuEPpqQ2aYVf6xioU8VC83iuqcRDhzKXbjuDh8Fr1wQwJy7H3p9yRLumnL9WiRCCvDp4ah7po8ay
代币账户关闭成功: BTAkLHT4Y3oFMm21iC2oAbb8ZxwQh1th2asJnKe7hZj4
- 租金已返还到: 8h3GuaWuin1u8Uu2ps9DFvxeWtgQecEybPTxBqEpHbvx
- 交易签名: 28s97neb9kq658GfKHGLyCNnaCKZhTGs9grvNRBVMtSkQVPEPVECJUjxNrJSkB7ZLVYBgWXqqCE2x3hgRVig21pd

======= SPL 代币测试完成 =======
```
