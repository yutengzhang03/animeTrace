# 番迹 · 个人追番管理

极简、二次元风的个人追番记录站。基于 **Bangumi 官方开放 API**，自动归集一部番的全部季数、OVA、剧场版、特别篇，SQLite 存你的状态/进度/评分，支持多用户注册登录。

## 技术栈

- 前端：Vue 3 + Vite + Tailwind CSS + Element Plus + Pinia + Vue Router
- 后端：Node.js + Express + 内置 `node:sqlite`（无需原生编译）
- 认证：PBKDF2 密码哈希 + HMAC-SHA256 签名 Token
- 数据源：Bangumi v0 API（合规、官方）

## 目录结构

```
番迹/
├── package.json          # 根脚本：一键启动 / 构建 / 部署
├── server/               # Express + SQLite 后端
│   ├── src/
│   │   ├── app.js        # Express 入口（默认端口 3001）
│   │   ├── db.js         # SQLite 建表/连接/认证工具
│   │   ├── routes/       # RESTful 路由（auth / search / subjects / library / stats）
│   │   ├── services/     # Bangumi API + 系列归集
│   │   └── middleware/   # Token 鉴权
│   └── data/fanji.db     # 本地数据库（首次运行自动生成）
└── web/                  # Vue 3 前端
    ├── dist/             # 构建产物（npm run build 生成）
    └── src/
        ├── views/        # 页面（首页 / 搜索 / 番库 / 详情 / 设置 / 登录）
        ├── components/   # 复用组件
        ├── stores/       # Pinia 状态
        └── api/          # 后端接口封装
```

## 快速开始（本地开发）

```bash
# 1. 一次性安装所有依赖（根 + 前端 + 后端）
npm run install:all

# 2. 同时启动前后端（开发模式）
npm run dev
```

启动后：
- 前端：http://localhost:5173
- 后端：http://localhost:3001

前端开发服务器已经把 `/api` 代理到后端，浏览器直接打开前端地址即可。

首次使用在页面注册一个账号即可开始追番。

## 单端口生产模式（用于部署 / 公网访问）

把前端打包并由后端进程一并伺服，**只需一个端口、一个进程**：

```bash
npm run serve     # = npm run build && npm --prefix server start
```

打开 http://localhost:3001 就能用，所有 API 同源。

生产环境建议固定 Token 签名密钥：

```bash
FANJI_TOKEN_SECRET=$(openssl rand -hex 32) npm run serve
```

## 公网访问

### 1. Cloudflare Tunnel（推荐，免费）

```bash
brew install cloudflared
cloudflared tunnel --url http://localhost:3001
```

终端会输出一个 `https://xxx-xxx.trycloudflare.com` 的地址 — 自带 HTTPS、不用动路由器、Mac 在 NAT 后面也能用。把这个 URL 发给朋友就行。

要固定 URL（不每次重启都换），免费注册 Cloudflare 账号 + 一个域名后跑：

```bash
cloudflared tunnel login
cloudflared tunnel create fanji
cloudflared tunnel route dns fanji fanji.你的域名.com
cloudflared tunnel run fanji
```

### 2. 部署到 AWS EC2

详见 **[DEPLOY-AWS.md](./DEPLOY-AWS.md)**，推荐 `t4g.nano` 实例，月费约 $3-5。

### 3. iPhone 当 App 用

公网 URL 拿到后，iPhone Safari 打开 → 底部分享 → "添加到主屏幕" → 起个名字。
图标会出现在主屏，点开就是全屏的番迹 App。

### 4. 让 Mac 不睡（本地部署时）

公网访问期间 Mac 必须保持唤醒：

```bash
caffeinate -di     # 一直跑这个，关闭它就允许睡眠
```

或者在「系统设置 → 锁屏 / 节能」里关掉自动睡眠。

## 核心功能

| 功能 | 说明 |
|---|---|
| 多用户 | 注册即用（用户名 + 密码），每个用户独立番库，数据完全隔离 |
| 番剧搜索 | 调用 Bangumi v0 搜索接口，展示封面、中日文名、年份、集数 |
| 系列归集 | 通过 Bangumi 关系接口递归遍历，自动分栏 TV / OVA / 剧场版 / 特别篇 |
| 状态管理 | 想看 / 在看 / 看过 / 搁置 / 弃番 五种状态，搜索结果卡片直接可标记 |
| 进度记录 | 看到第几话、1-10 评分、个人备注 |
| 个人番库 | 按状态/类型/年份筛选排序 |
| 统计面板 | 收录总数、观看集数、平均评分、年份分布 |
| 暗色模式 | 跟随系统或手动切换 |
| 缓存优化 | 番剧元数据本地缓存 7 天，避免重复请求被限流 |
| 批量录入 | 设置页支持粘贴 Bangumi subject_id 批量加入 |

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `3001` | 后端监听端口 |
| `HOST` | `0.0.0.0` | 监听地址（默认所有网卡，便于隧道访问） |
| `FANJI_TOKEN_SECRET` | 随机生成 | Token 签名密钥（生产环境务必固定，否则重启后所有用户需重新登录） |
| `FANJI_DB_PATH` | `server/data/fanji.db` | SQLite 文件路径 |

## 数据来源

Bangumi（番组计划）v0 API：https://bangumi.github.io/api/

仅使用官方公开接口，不做爬虫，对它友好一点。

## 许可

MIT
