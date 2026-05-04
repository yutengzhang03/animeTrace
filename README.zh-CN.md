# 番迹

[English](./README.md) | [简体中文](./README.zh-CN.md)

番迹是一个轻量多用户追番管理应用。你可以通过 Bangumi 官方 API 搜索番剧，把番加入自己的番库，并记录状态、进度、评分和备注。

它支持本地开发、单端口生产运行，也支持用 Terraform 部署到 AWS Auto Scaling 架构。

## 核心功能

- 多用户注册和登录
- 基于 Bangumi v0 官方 API 的番剧搜索
- 想看 / 在看 / 看过 / 搁置 / 弃番 五种状态
- 集数进度、1-10 评分、个人备注
- 自动归集系列、续作、OVA、剧场版、特别篇
- 统计面板和暗色模式
- 本地开发默认 SQLite
- AWS Terraform 部署：ALB + Auto Scaling Group + EFS

## 技术栈

- 前端：Vue 3、Vite、Tailwind CSS、Element Plus、Pinia、Vue Router
- 后端：Node.js 22、Express、内置 `node:sqlite`
- 认证：PBKDF2 密码哈希 + HMAC-SHA256 签名 Token
- 数据源：Bangumi v0 API
- AWS：Application Load Balancer、Auto Scaling Group、EC2、EFS、CloudWatch CPU alarms

## 目录结构

```text
fanji/
├── package.json
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── db.js
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── data/fanji.db
├── web/
│   ├── src/
│   └── dist/
└── infra/
    └── terraform/
```

## 本地开发

安装所有依赖：

```bash
npm run install:all
```

同时启动前后端：

```bash
npm run dev
```

打开：

- 前端：http://localhost:5173
- 后端：http://localhost:3001

Vite 开发服务器会把 `/api` 代理到后端。

## 单端口生产模式

构建前端，并由 Express 后端直接伺服静态文件：

```bash
npm run serve
```

打开 http://localhost:3001。

生产环境建议固定 token 签名密钥，避免重启后所有用户重新登录：

```bash
FANJI_TOKEN_SECRET="$(openssl rand -hex 32)" npm run serve
```

## AWS 部署

推荐使用 Terraform：

- Application Load Balancer 作为公网入口
- Auto Scaling Group 管理 EC2 实例
- CloudWatch CPU alarms 控制高 CPU 扩容、低 CPU 缩容
- EFS 共享 SQLite 数据库
- Launch Template 自动安装 Node.js 22 并部署应用

详见 [DEPLOY-AWS-TERRAFORM.md](./DEPLOY-AWS-TERRAFORM.md)。

日常要改的 AWS 参数集中在：

```bash
infra/terraform/terraform.tfvars
```

先复制示例：

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

然后在里面改实例类型、key pair、容量上下限、CPU 阈值、域名等配置。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---:|---|
| `PORT` | `3001` | 后端监听端口 |
| `HOST` | `0.0.0.0` | 后端监听地址 |
| `FANJI_TOKEN_SECRET` | 启动时随机 | Token 签名密钥；生产环境务必固定 |
| `FANJI_DB_PATH` | `server/data/fanji.db` | SQLite 数据库路径 |

## 数据来源

番迹使用 Bangumi 官方 v0 API：https://bangumi.github.io/api/

## 许可

MIT
