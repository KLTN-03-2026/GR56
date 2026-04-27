import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/GR56/markdown-page',
    component: ComponentCreator('/GR56/markdown-page', '514'),
    exact: true
  },
  {
    path: '/GR56/docs',
    component: ComponentCreator('/GR56/docs', 'a43'),
    routes: [
      {
        path: '/GR56/docs',
        component: ComponentCreator('/GR56/docs', 'e00'),
        routes: [
          {
            path: '/GR56/docs',
            component: ComponentCreator('/GR56/docs', '2f2'),
            routes: [
              {
                path: '/GR56/docs/ai-chatbot',
                component: ComponentCreator('/GR56/docs/ai-chatbot', '8ac'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/GR56/docs/architecture/system-design',
                component: ComponentCreator('/GR56/docs/architecture/system-design', '298'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/GR56/docs/getting-started',
                component: ComponentCreator('/GR56/docs/getting-started', '947'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/GR56/docs/GIT_COMMIT_RULE',
                component: ComponentCreator('/GR56/docs/GIT_COMMIT_RULE', '64c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/GR56/docs/installation/backend',
                component: ComponentCreator('/GR56/docs/installation/backend', 'cbd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/GR56/docs/installation/frontend',
                component: ComponentCreator('/GR56/docs/installation/frontend', '27c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/GR56/docs/installation/mobile',
                component: ComponentCreator('/GR56/docs/installation/mobile', '16d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/GR56/docs/intro',
                component: ComponentCreator('/GR56/docs/intro', 'ee9'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/GR56/',
    component: ComponentCreator('/GR56/', '0a4'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
