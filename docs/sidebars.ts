import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Getting Started',
    },
    {
      type: 'doc',
      id: 'usage',
      label: 'CLI Usage & Commands',
    },
    {
      type: 'doc',
      id: 'settings',
      label: 'Settings & Configuration',
    },
    {
      type: 'doc',
      id: 'troubleshooting',
      label: 'Troubleshooting',
    },
  ],
};

export default sidebars;
