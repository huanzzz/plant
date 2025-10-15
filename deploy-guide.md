# 植物识别网页部署指南

## 📦 项目简介

这是一个基于 TensorFlow.js 的植物识别网页应用，纯静态页面，无需后端服务器。

---

## 🚀 部署方案

### 方案一：GitHub Pages（推荐 ⭐）

#### 优点
- ✅ 完全免费
- ✅ 自动 HTTPS
- ✅ 无需服务器维护
- ✅ 每次 push 自动更新

#### 部署步骤

1. **确保代码已推送到 GitHub**
   ```bash
   git add .
   git commit -m "准备部署"
   git push origin main
   ```

2. **启用 GitHub Pages**
   - 访问 GitHub 仓库页面
   - 点击 `Settings` → `Pages`
   - Source: 选择 `main` 分支，`/ (root)` 目录
   - 点击 `Save`

3. **访问网站**
   - 等待 1-2 分钟
   - 访问链接：`https://<你的用户名>.github.io/<仓库名>/`

#### 注意事项
- 仓库必须是公开的（免费版）
- 模型文件不能超过 100MB

---

### 方案二：Netlify

#### 优点
- ✅ 部署简单快速
- ✅ 免费 CDN 加速
- ✅ 可自定义域名
- ✅ 支持拖放部署

#### 部署步骤

**方法 A：拖放部署（最快）**

1. 访问 [netlify.com](https://www.netlify.com/)
2. 注册/登录
3. 点击 "Add new site" → "Deploy manually"
4. 将整个项目文件夹拖入浏览器
5. 完成！获得链接如：`https://xxx.netlify.app`

**方法 B：GitHub 集成**

1. 访问 [netlify.com](https://www.netlify.com/)
2. 点击 "Add new site" → "Import from Git"
3. 选择 GitHub 并授权
4. 选择仓库 `plant-model-consistency`
5. 点击 "Deploy site"

#### 自定义域名（可选）

- 在 Netlify 控制台点击 "Domain settings"
- 可以使用自己的域名或 Netlify 子域名

---

### 方案三：Vercel

#### 优点
- ✅ 全球 CDN
- ✅ 部署速度极快
- ✅ 与 GitHub 深度集成

#### 部署步骤

1. 访问 [vercel.com](https://vercel.com/)
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 导入 `plant-model-consistency` 仓库
5. 点击 "Deploy"
6. 获得链接：`https://plant-model-consistency.vercel.app`

---

### 方案四：传统服务器部署

如果您有自己的服务器（Linux + Nginx），可以按以下步骤操作。

#### 前置要求
- 一台 Linux 服务器（Ubuntu/CentOS）
- 已安装 Nginx
- 有域名（可选）

#### 部署步骤

**1. 连接到服务器**
```bash
ssh user@your-server-ip
```

**2. 安装 Nginx（如未安装）**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS
sudo yum install nginx
```

**3. 创建网站目录**
```bash
sudo mkdir -p /var/www/plant-recognition
sudo chown -R $USER:$USER /var/www/plant-recognition
```

**4. 上传文件**

在本地电脑运行：
```bash
cd /Users/huan/Desktop/plant-model-consistency
scp -r * user@your-server-ip:/var/www/plant-recognition/
```

**5. 配置 Nginx**

创建配置文件：
```bash
sudo nano /etc/nginx/sites-available/plant-recognition
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名或 IP

    root /var/www/plant-recognition;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # 确保模型文件正确的 MIME 类型
    location ~ \.json$ {
        add_header Content-Type application/json;
    }

    location ~ \.bin$ {
        add_header Content-Type application/octet-stream;
    }

    # 启用 GZIP 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/x-javascript;
}
```

**6. 启用网站**
```bash
sudo ln -s /etc/nginx/sites-available/plant-recognition /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

**7. 配置防火墙**
```bash
sudo ufw allow 'Nginx Full'
```

**8. 访问网站**
- 浏览器访问：`http://your-server-ip` 或 `http://your-domain.com`

#### 可选：配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 🌐 部署方案对比

| 方案 | 成本 | 难度 | 速度 | 适用场景 |
|------|------|------|------|----------|
| **GitHub Pages** | 免费 | ⭐ 简单 | 中等 | 个人项目、演示 |
| **Netlify** | 免费 | ⭐ 简单 | 快 | 需要快速部署 |
| **Vercel** | 免费 | ⭐ 简单 | 极快 | 前端项目 |
| **自有服务器** | 付费 | ⭐⭐⭐ 复杂 | 取决于服务器 | 企业应用、完全控制 |

---

## 📝 部署后测试

部署完成后，请测试以下功能：

1. ✅ 页面能正常打开
2. ✅ 模型能正常加载（查看"模型加载成功"提示）
3. ✅ 可以上传图片
4. ✅ 识别功能正常工作
5. ✅ 控制台无错误信息

---

## ⚠️ 常见问题

### 1. 模型加载失败

**问题**：显示"❌ 模型加载失败"

**解决方案**：
- 检查 `model.json` 和 `model.weights.bin` 是否都已上传
- 检查文件路径中的空格（`plant model1/`）
- 确保文件大小未被截断

### 2. CORS 错误

**问题**：控制台显示跨域错误

**解决方案**：
- 使用正式的部署方案（不要直接打开本地 HTML 文件）
- 如果使用自己的服务器，确保 Nginx 配置正确

### 3. 加载速度慢

**问题**：模型加载时间过长

**解决方案**：
- 使用 CDN 部署方案（Netlify、Vercel）
- 启用 GZIP 压缩
- 考虑压缩模型文件

### 4. 移动端访问问题

**问题**：手机访问不正常

**解决方案**：
- 检查响应式设计
- 确保使用 HTTPS（某些功能需要安全上下文）

---

## 🎯 推荐流程

**对于初学者或快速演示：**
1. 使用 **Netlify 拖放部署** → 3 分钟完成
2. 或使用 **GitHub Pages** → 5 分钟完成

**对于长期项目：**
1. 使用 **Vercel** 或 **Netlify** + GitHub 集成
2. 每次代码更新自动部署

**对于企业应用：**
1. 使用自有服务器 + Nginx
2. 配置 HTTPS
3. 考虑 CDN 加速

---

## 📞 需要帮助？

如果遇到问题，可以检查：
- 浏览器控制台的错误信息
- 网络请求是否成功
- 文件路径是否正确

祝部署顺利！🎉

