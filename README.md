# 公主请点餐吧 - 小程序前端

## 技术栈

- Taro 3.x
- React
- TypeScript
- Tailwind CSS

## 开发

```bash
# 安装依赖
npm install

# 开发模式（微信小程序）
npm run dev:weapp

# 构建（微信小程序）
npm run build:weapp
```

## 样式方案

项目使用 Tailwind CSS 作为样式方案，所有样式都通过 Tailwind 工具类实现。

### 自定义颜色

- `primary`: #ff6b9d（主题色）

### 配置文件

- `tailwind.config.js`: Tailwind 配置
- `postcss.config.js`: PostCSS 配置（包含 pxtransform 用于单位转换）

