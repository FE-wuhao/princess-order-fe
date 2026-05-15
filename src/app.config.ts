const sharedPages = [
  'pages/group/index',
  'pages/member-form/index',
  'pages/recipe/index',
  'pages/recipe-form/index',
  'pages/order/index',
  'pages/task/index',
  'pages/task-list/index',
  'pages/tag/index',
  'pages/profile/index',
]

const pages =
  process.env.TARO_ENV === 'h5'
    ? ['pages/login/index', 'pages/index/index', ...sharedPages]
    : ['pages/index/index', 'pages/login/index', ...sharedPages]

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
        text: '分组',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png',
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
