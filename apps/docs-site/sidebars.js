// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '🌟 Giới thiệu',
    },
    {
      type: 'category',
      label: '📦 Hướng dẫn Cài đặt',
      collapsible: true,
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'getting-started',
          label: '🚀 Bắt đầu nhanh',
        },
        {
          type: 'doc',
          id: 'installation/backend',
          label: '⚙️ Cài đặt Backend',
        },
        {
          type: 'doc',
          id: 'installation/frontend',
          label: '🖥️ Cài đặt Frontend',
        },
        {
          type: 'doc',
          id: 'installation/mobile',
          label: '📱 Cài đặt Mobile',
        },
      ],
    },
    {
      type: 'category',
      label: '🏗️ Kiến trúc & Hệ thống',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'architecture/system-design',
          label: '🗺️ Tổng quan Hệ thống',
        },
        {
          type: 'doc',
          id: 'ai-chatbot',
          label: '🤖 Tích hợp AI Chatbot',
        },
      ],
    },
    {
      type: 'category',
      label: '📝 Quy định & Đóng góp',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'doc',
          id: 'GIT_COMMIT_RULE',
          label: '📜 Quy tắc Git Commit',
        },
      ],
    },
  ],
};

module.exports = sidebars;
