import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Getting Started',
    },
    {
      type: 'category',
      label: 'CLI Usage & Commands',
      link: {
        type: 'doc',
        id: 'usage/index',
      },
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'usage/commands',
          label: 'Command Reference',
        },
        {
          type: 'doc',
          id: 'usage/lifecycle',
          label: 'Service Lifecycle',
        },
      ],
    },
    {
      type: 'category',
      label: 'Settings & Configuration',
      link: {
        type: 'doc',
        id: 'settings/index',
      },
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'settings/environment-variables',
          label: 'Environment Variables',
        },
        {
          type: 'doc',
          id: 'settings/config-file',
          label: 'Configuration Files',
        },
      ],
    },
    {
      type: 'category',
      label: 'Developer Guide',
      link: {
        type: 'doc',
        id: 'developer/index',
      },
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'developer/prerequisites',
          label: 'Prerequisites',
        },
        {
          type: 'doc',
          id: 'developer/setup',
          label: 'Setting up the Project',
        },
      ],
    },
    {
      type: 'doc',
      id: 'troubleshooting',
      label: 'Troubleshooting',
    },
  ],
};

export default sidebars;
