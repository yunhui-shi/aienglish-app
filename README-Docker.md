# AI英语学习应用 - Docker部署指南

这是一个包含前端(Next.js)和后端(FastAPI)的AI英语学习应用的Docker化部署方案。

## 项目架构

- **前端**: Next.js + TypeScript + Tailwind CSS
- **后端**: FastAPI + SQLAlchemy + PostgreSQL
- **缓存**: Redis
- **数据库**: PostgreSQL

## 快速开始

### 1. 环境准备

确保你的系统已安装:
- Docker
- Docker Compose

### 2. 配置环境变量

复制环境变量模板文件:
```bash
cp .env.example .env
```

根据需要修改 `.env` 文件中的配置。

### 3. 启动服务

使用Docker Compose启动所有服务:
```bash
docker-compose up -d
```

这将启动以下服务:
- PostgreSQL数据库 (端口: 5432)
- Redis缓存 (端口: 6379)
- FastAPI后端 (端口: 8000)
- Next.js前端 (端口: 3000)

### 4. 访问应用

- 前端应用: http://localhost:3000
- 后端API文档: http://localhost:8000/docs
- 后端API: http://localhost:8000

## 开发模式

如果你想在开发模式下运行(支持热重载):

```bash
# 启动数据库和Redis
docker-compose up -d db redis

# 本地运行后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 本地运行前端
npm install
npm run dev
```

## 常用命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs frontend
docker-compose logs backend
docker-compose logs db
```

### 停止服务
```bash
docker-compose down
```

### 重新构建镜像
```bash
docker-compose build
```

### 清理数据
```bash
# 停止服务并删除数据卷
docker-compose down -v
```

## 数据库管理

### 数据库迁移

数据库迁移会在后端容器启动时自动执行。如果需要手动执行:

```bash
docker-compose exec backend alembic upgrade head
```

### 创建新的迁移
```bash
docker-compose exec backend alembic revision --autogenerate -m "描述信息"
```

### 连接数据库
```bash
docker-compose exec db psql -U aienglish_user -d aienglish
```

## 生产部署注意事项

1. **安全配置**:
   - 修改默认的数据库密码
   - 使用强密码作为JWT密钥
   - 配置适当的CORS设置

2. **性能优化**:
   - 使用生产级的Web服务器(如Nginx)
   - 配置适当的资源限制
   - 启用日志轮转

3. **监控和备份**:
   - 设置数据库备份策略
   - 配置应用监控
   - 设置健康检查

## 故障排除

### 常见问题

1. **端口冲突**:
   如果端口被占用，修改 `docker-compose.yml` 中的端口映射。

2. **数据库连接失败**:
   检查数据库服务是否正常启动，查看日志:
   ```bash
   docker-compose logs db
   ```

3. **前端无法连接后端**:
   确保 `NEXT_PUBLIC_API_URL` 环境变量设置正确。

### 重置环境

如果遇到问题需要完全重置:
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 项目结构

```
aienglish-app/
├── backend/                 # FastAPI后端
│   ├── app/                # 应用代码
│   ├── alembic/            # 数据库迁移
│   ├── Dockerfile          # 后端Docker配置
│   ├── requirements.txt    # Python依赖
│   └── start.sh           # 启动脚本
├── src/                    # Next.js前端源码
├── public/                 # 静态资源
├── Dockerfile              # 前端Docker配置
├── docker-compose.yml      # Docker编排配置
├── .env.example           # 环境变量模板
└── README-Docker.md       # 本文档
```