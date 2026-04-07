# 公主请点餐吧 - 小程序前端

## 技术栈

- Taro 3.x
- React
- TypeScript
- SCSS

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

项目使用 SCSS 作为样式方案。当前全局样式入口是：

- `src/app.scss`

说明：

- 小程序端已移除 Tailwind，避免生成 WXSS 不兼容的选择器和 CSS 变量。
- 页面里暂时保留了一些类似工具类的 `className`，但这些类现在由 `src/app.scss` 手写维护，不再依赖 Tailwind 生成。

