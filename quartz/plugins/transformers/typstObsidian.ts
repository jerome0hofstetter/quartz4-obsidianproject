import remarkMath from "remark-math"

import { QuartzTransformerPlugin } from "../types"
import {rehypeTypstExtend,Options} from "./rehype_typst_extended"


export const TypstObsidian: QuartzTransformerPlugin<Partial<Options>> = (opts) => {
  return {
    name: "TypstObsidian",
    textTransform(_ctx, src) {
      src = src.replace(/([^\n])\$\$/g, (match, p1) => {
          return p1 + "\n\$\$";
      }); 
      src = src.replace(/\$\$\n{0,1}([^\n])/g, (match, p1) => {
          return "\$\$\n\n"+ p1;
      }); 
      return src;
    },
    markdownPlugins() {
      return [remarkMath]
    },
    htmlPlugins() {
      return [[rehypeTypstExtend, opts ]]
    },
  }
}
