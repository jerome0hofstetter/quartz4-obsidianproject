/**
 * @typedef {import('hast').ElementContent} ElementContent
 * @typedef {import('hast').Root} Root
 * @typedef {import('vfile').VFile} VFile
 */

import { fromHtmlIsomorphic } from 'hast-util-from-html-isomorphic';
import { toText } from 'hast-util-to-text';
import { SKIP, visitParents } from 'unist-util-visit-parents';
import {TypstForObsidianCompiler} from './obsidian_specific_typst_compiler';

export interface Options {
  font_size:number;
  line_height:number;
  var_widths:number[];
}
/** @type {Readonly<Options>} */
const defaultOptions = {
  font_size:12,line_height:18,var_widths:[100,300,500,700]
};
/** @type {ReadonlyArray<unknown>} */
// @ts-ignore
const emptyClasses = [];

/**
 * Render elements with a `language-typst` (or `math-display`, `math-inline`)
 * class with typst wasm
 *
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export function rehypeTypstExtend(options:Options) {
  const settings = options || defaultOptions;
  let compiler = new TypstForObsidianCompiler(settings.font_size,settings.line_height,settings.var_widths );
  /** 
   * Transform.
   *
   * @param {Root} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */
  // @ts-ignore
  return async function (tree, file) {
    const matches: [any, any[]][] = [];
    await compiler.init();
    visitParents(tree, 'element', (...args) => {
      matches.push(args);
      return tree;
    });
    // @ts-ignore
    const visitor = async function (element, parents) {
      const classes = Array.isArray(element.properties.className)
        ? element.properties.className
        // @ts-ignore
        : emptyClasses;
      // This class can be generated from markdown with ` ```typst `.
      const languageMath = classes.includes('language-typst');
      // This class is used by `remark-math` for flow math (block, `$$\nmath\n$$`).
      const mathDisplay = classes.includes('math-display');
      // This class is used by `remark-math` for text math (inline, `$math$`).
      const mathInline = classes.includes('math-inline');

      // Any class is fine.
      if (!languageMath && !mathDisplay && !mathInline) {
        return;
      }

      let parent = parents[parents.length - 1];
      let scope = element;

      // If this was generated with ` ```math `, replace the `<pre>` and use
      // display.
      if (
        parent &&
        parent.type === 'element' &&
        parent.tagName === 'pre'
      ) {
        scope = parent;
        parent = parents[parents.length - 2];
      }

      /* c8 ignore next -- verbose to test. */
      if (!parent) return;

      const value = toText(scope, { whitespace: 'pre' });

      /** @type {Array<ElementContent> | string | undefined} */
      let result;
      let gothtml = false;
      try {
        result = compiler.transform_typst(value,null,languageMath,mathDisplay,mathInline)
        gothtml = true;
      } catch (error) {
        const cause = /** @type {Error} */ (error);
        file.message('Could not render math with typst', {
          ancestors: [...parents, element],
          cause,
          place: element.position,
          source: 'rehype-typst-extended',
        });

        result = [
          {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['typst-error'],
              style: 'color:' + ('#cc0000'),
              title: String(error),
            },
            children: [{ type: 'text', value }],
          },
        ];
      }

      if (gothtml) {
        // @ts-ignore
        const root = fromHtmlIsomorphic(result, { fragment: true });
        result = /** @type {Array<ElementContent>} */ (root.children);
      }

      const index = parent.children.indexOf(scope);
      // @ts-ignore
      parent.children.splice(index, 1, ...result);
      return SKIP;
    };
    const promises = matches.map(async args => {
      await visitor(...args);
    });
    await Promise.all(promises);
  };
}
