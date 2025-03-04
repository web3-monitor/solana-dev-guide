#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Solana 开发环境安装脚本 ===${NC}"
echo -e "本脚本将检查并安装 Node.js 最新稳定版本"
echo ""

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="Windows"
else
    OS="未知"
fi

echo -e "${YELLOW}检测到操作系统: ${OS}${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js 已安装: ${NODE_VERSION}${NC}"
    echo -e "如果需要更新 Node.js，请卸载现有版本后重新运行此脚本"
    exit 0
else
    echo -e "${YELLOW}未检测到 Node.js，准备安装最新稳定版本...${NC}"
    
    if [[ "$OS" == "Linux" ]]; then
        echo -e "${YELLOW}在 Linux 上安装 Node.js...${NC}"
        
        if ! command -v curl &> /dev/null; then
            echo -e "${YELLOW}安装 curl...${NC}"
            sudo apt-get update
            sudo apt-get install -y curl
        fi
        
        echo -e "${YELLOW}下载并安装 NVM (Node Version Manager)...${NC}"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
        
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        echo -e "${YELLOW}安装 Node.js LTS 版本...${NC}"
        nvm install --lts
        
    elif [[ "$OS" == "macOS" ]]; then
        echo -e "${YELLOW}在 macOS 上安装 Node.js...${NC}"
        
        if ! command -v brew &> /dev/null; then
            echo -e "${YELLOW}安装 Homebrew...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        echo -e "${YELLOW}使用 Homebrew 安装 Node.js...${NC}"
        brew install node
        
    elif [[ "$OS" == "Windows" ]]; then
        echo -e "${RED}在 Windows 系统上，请手动下载并安装 Node.js:${NC}"
        echo -e "请访问 ${BLUE}https://nodejs.org/${NC} 下载最新的 LTS 版本"
        echo -e "安装完成后，请重新运行此脚本进行验证"
        exit 1
    else
        echo -e "${RED}不支持的操作系统。请手动安装 Node.js:${NC}"
        echo -e "请访问 ${BLUE}https://nodejs.org/${NC} 查看安装指南"
        exit 1
    fi
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js 安装成功: ${NODE_VERSION}${NC}"
    else
        echo -e "${RED}Node.js 安装失败，请尝试手动安装${NC}"
        echo -e "请访问 ${BLUE}https://nodejs.org/${NC} 下载安装"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}===========================${NC}"
echo -e "${GREEN}✅ Node.js 安装检查完成!${NC}"
echo -e "${GREEN}===========================${NC}"
echo ""
echo -e "现在您可以开始 Solana 开发了！"
echo -e "下一步建议执行: 进入项目文件夹后 npm install 来安装项目依赖"
echo ""