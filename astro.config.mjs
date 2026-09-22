// @ts-check
import { defineConfig } from 'astro/config';

/**
 * GitHub Pages (project pages) にデプロイする前提の設定。
 * 独自ドメインを当てる場合は base を '/' に戻し、public/CNAME を追加すること。
 * 変更する場合は docs/adr/0001-github-only-stack.md も更新する。
 */
export default defineConfig({
  site: 'https://je6hbc.github.io',
  base: '/HackersSalonPIANOMA',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
