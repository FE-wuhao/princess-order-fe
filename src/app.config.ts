const tabPages = [
  'pages/index/index',
  'pages/recipes/index',
  'pages/task-list/index',
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
  'pages/tag/index',
]

const pages =
  process.env.TARO_ENV === 'h5'
    ? ['pages/login/index', ...tabPages, ...sharedPages]
    : [...tabPages, 'pages/login/index', ...sharedPages]

export default {
  pages,
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '公主请点餐吧',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#666',
    selectedColor: '#ff6b9d',
    backgroundColor: '#fff',
    borderStyle: 'black',
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
        pagePath: 'pages/task-list/index',
        text: '任务',
        iconPath: 'assets/icons/task.png',
        selectedIconPath: 'assets/icons/task-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png',
      },
    ],
  },
}
