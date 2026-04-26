// @ts-check
const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'FoodBee Documentation',
  tagline: 'Hệ thống đặt và giao đồ ăn đa nền tảng tích hợp AI',
  favicon: 'img/favicon.svg',

  url: 'https://KLTN-03-2026.github.io',
  baseUrl: '/GR56/',

  organizationName: 'KLTN-03-2026',
  projectName: 'GR56',

  onBrokenLinks: 'ignore',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'vi',
    locales: ['vi'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/KLTN-03-2026/GR56/tree/master/foodbee-docs/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'FoodBee AI',
        logo: {
          alt: 'FoodBee Logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Tài liệu',
          },
          {
            href: 'https://github.com/KLTN-03-2026/GR56',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Tài liệu',
            items: [
              {label: 'Giới thiệu', to: '/docs/intro'},
              {label: 'Cài đặt', to: '/docs/getting-started'},
            ],
          },
          {
            title: 'Liên hệ',
            items: [
              {label: 'Website', href: 'https://foodbee.io.vn'},
              {label: 'GitHub', href: 'https://github.com/KLTN-03-2026/GR56'},
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} FoodBee Ecosystem. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

module.exports = config;
