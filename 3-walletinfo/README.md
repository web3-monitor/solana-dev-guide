# Solana 钱包余额查询工具

## 简介

用于查询 Solana 区块链上任意钱包地址的 SOL 余额和所有 SPL 代币余额。

## 功能特点

- 查询任意 Solana 钱包地址的 SOL 余额
- 获取所有 SPL 代币账户及余额
- 仅显示余额大于 0 的代币
- 显示代币的精度和合约地址
- 支持自定义 RPC 节点

## 安装依赖

在使用之前，确保你已经安装了必要的依赖：

```bash
ts-node ./3-walletinfo/walletinfo.ts