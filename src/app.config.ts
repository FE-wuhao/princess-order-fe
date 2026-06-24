const tabPages = [
  'pages/index/index',
  'pages/recipes/index',
  'pages/profile/index',
]

const sharedPages = [
  'pages/workspace-entry/index',
  'pages/notifications/index',
  'pages/profile-edit/index',
  'pages/group/index',
  'pages/member-form/index',
  'pages/recipe/index',
  'pages/recipe-form/index',
  'pages/order/index',
  'pages/task/index',
  'pages/task-list/index',
  'pages/tag/index',
]

const pages =
  process.env.TARO_ENV === 'h5'
    ? ['pages/login/index', ...tabPages, ...sharedPages]
    : [...tabPages, 'pages/login/index', ...sharedPages]

const baseTabBar = {
  color: '#9b8981',
  selectedColor: '#a92f4c',
  backgroundColor: '#fffdf8',
  borderStyle: 'black' as const,
  list: [
    {
      pagePath: 'pages/index/index',
      text: '首页',
      iconPath: 'assets/icons/home.png',
      selectedIconPath: 'assets/icons/home-active.png',
    },
    {
      pagePath: 'pages/recipes/index',
      text: '菜谱',
      iconPath: 'assets/icons/recipe.png',
      selectedIconPath: 'assets/icons/recipe-active.png',
    },
    {
      pagePath: 'pages/profile/index',
      text: '我的',
      iconPath: 'assets/icons/profile.png',
      selectedIconPath: 'assets/icons/profile-active.png',
    },
  ],
}

export default {
  pages,
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f7f0e4',
    navigationBarTitleText: '公主请点餐吧',
    navigationBarTextStyle: 'black',
  },
  ...(process.env.TARO_ENV === 'h5'
    ? {}
    : {
        tabBar: {
          ...baseTabBar,
          custom: true,
        },
      }),
}
