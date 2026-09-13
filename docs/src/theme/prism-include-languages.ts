import siteConfig from '@generated/docusaurus.config';
import type * as PrismNamespace from 'prismjs';

export default function prismIncludeLanguages(
  PrismObject: typeof PrismNamespace,
): void {
  const {
    themeConfig: {prism},
  } = siteConfig;
  const {additionalLanguages} = prism as {additionalLanguages: string[]};

  const PrismBefore = (globalThis as any).Prism;
  (globalThis as any).Prism = PrismObject;

  additionalLanguages.forEach((lang) => {
    if (lang === 'php') {
      // eslint-disable-next-line global-require
      require('prismjs/components/prism-markup-templating.js');
    }
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require(`prismjs/components/prism-${lang}`);
  });

  // Enhance Bash with CLI commands, flags, and URLs
  if (PrismObject.languages.bash) {
    PrismObject.languages.insertBefore('bash', 'keyword', {
      'cli-command': {
        pattern: /(^|[\s;|&`$(])(?:curl|bash|npm|pnpm|yarn|ray|cohen|git|node|docker|pm2|sudo|brew|apt|chmod|chown|systemctl|service)\b/,
        lookbehind: true,
        alias: 'function',
      },
      'cli-subcommand': {
        pattern: /(^|\s)(?:start|stop|restart|status|logs|starter|cohen|clone|install|run|build|test|add|remove|update)\b/,
        lookbehind: true,
        alias: 'builtin',
      },
      'cli-flag': {
        pattern: /(^|\s)(?:--[a-zA-Z0-9_-]+|-[a-zA-Z0-9]+)\b/,
        lookbehind: true,
        alias: 'parameter',
      },
      'cli-url': {
        pattern: /https?:\/\/[^\s"'`)]+/,
        alias: 'url',
      },
    });
  }

  // Enhance PowerShell with cmdlets, CLI commands, and URLs
  if (PrismObject.languages.powershell) {
    PrismObject.languages.insertBefore('powershell', 'keyword', {
      'cli-command': {
        pattern: /(^|[\s;|&`$(])(?:irm|iex|powershell|pwsh|ray|npm|pnpm|yarn|git|node|docker)\b/i,
        lookbehind: true,
        alias: 'function',
      },
      'cli-url': {
        pattern: /https?:\/\/[^\s"'`)]+/,
        alias: 'url',
      },
    });
  }

  delete (globalThis as any).Prism;
  if (typeof PrismBefore !== 'undefined') {
    (globalThis as any).Prism = PrismObject;
  }
}
