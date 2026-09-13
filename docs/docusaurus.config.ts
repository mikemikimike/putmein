import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'PutmeIn Docs',
  tagline: 'Autonomous DevOps, Infrastructure Monitoring & Deployment Engine',
  favicon: 'img/favicon.ico',

  url: 'https://docs.putme.in',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/putme-in/putmein/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      logo: {
        alt: 'PutmeIn Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/putme-in/putmein',
          label: 'GitHub',
          position: 'right',
          className: 'header-github-link',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/',
            },
            {
              label: 'CLI Usage',
              to: '/usage',
            },
            {
              label: 'Configuration',
              to: '/settings',
            },
            {
              label: 'Troubleshooting',
              to: '/troubleshooting',
            },
          ],
        },
        {
          title: 'Community & Source',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/putme-in/putmein',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} PutMe.in. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'powershell', 'shell-session', 'json', 'yaml', 'ini'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
