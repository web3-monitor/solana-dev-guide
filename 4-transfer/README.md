# Solana 转账工具

## 简介

用于在 Solana 区块链上转账 SOL 和所有 SPL 代币。

## 功能特点

- 转账sol
- 转账 SPL 代币
- 如果接收账户没有相关spl代币的地址，会自动创建
- 自动获取代币精度，转账时输出不带精度的数量即可
- 支持自定义 RPC 节点

## 安装依赖

在使用之前，确保你已经安装了必要的依赖：

## 运行

```bash
ts-node ./4-transfer/transfer.ts