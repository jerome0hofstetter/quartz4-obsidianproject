# Quartz v4 (forked)

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.
Quartz v4 features a from-the-ground rewrite focusing on end-user extensibility and ease-of-use.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Differences to original at creation
configs (to adjust to my needs)

### TypstObsidian - custom quartz4 plugin
custom new plugin TypstObsidian that handles mathblocks and code-typst blocks like the obsidian typst render plugin. If in content there is an obsidian vault (careful it just assumes) then it will take the preamables and render any inline, math and typst code blocks as the obsidian render plugin would. for mathblocks and codetypst blocks will render them at multiple widths and only show one of them based on width.

### bugfixes
implemented fix to [Issue #2141](https://github.com/jackyzha0/quartz/issues/2141) involving svg rendering correctly in the preview

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
