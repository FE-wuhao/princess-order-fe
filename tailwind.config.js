/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // 使用下划线作为分隔符，避免小程序不支持反斜杠和冒号
  // 注意：使用插件后，类名需要使用下划线，如 w-1_3 而不是 w-1/3
  separator: '_',
  theme: {
    extend: {
      colors: {
        primary: '#ff6b9d',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // 禁用 Tailwind 的默认样式重置，避免与 Taro 冲突
  },
}

