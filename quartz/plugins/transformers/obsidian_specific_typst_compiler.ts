import typstInit, * as typst from './pkg'
import fs from "fs";
import path from "path";


const wasm_path_string = "./quartz/plugins/transformers/pkg/obsidian_typst_bg.wasm"

const wasmPath = path.resolve(wasm_path_string);


function figure_out_breakpoints(svg_list:string[],breakpoints:number[]) :number[]{
    //each svg was generated with given width from breakpoints
    //but they tend to be bigger so there is a need to figure out what now the proper breakpoints are

    return breakpoints.map(bp=>bp*1.15+60 );
}
const parentDivClass = "responsive-svg-typst";
const svg_class ="svg_option";
const show_svg_styling = "{\n  display: block;\n}\n"
const svg_div_name = (index:number) => `${svg_class}_${index}`;


function generateSvgSwitching(svgList:string[],breakpoints:number[]) {
    //given a list of svgs, same content but rendered at different widths, at the widths given by the breakpoints
    //creates a html element of a div containing some style and all the svgs, where only one is shown based on the available width
    if (svgList.length != breakpoints.length) {
        throw Error("both lists should have the same length");
    }
    if (svgList.length==1) {
        return svgList.at(0);
    }
    breakpoints = figure_out_breakpoints(svgList,breakpoints);
    //TODO maybe set the first breakpoint as minwidth of container
    let svgContainer = "";
    svgList.forEach((svg:string, i:number) => {
        svgContainer += `  <div class="${svg_div_name(i)}">\n${svg}\n  </div>\n`;
    });
    let styling = `.${parentDivClass} {container-type: inline-size;}`;
    styling += `.${parentDivClass} > div { display: none; }\n`;

    styling += `@container (max-width: ${breakpoints.at(1)}px) {\n .${parentDivClass} > .${svg_div_name(0)} ${show_svg_styling}}`

    breakpoints.slice(1,-1).forEach((bp,is) => {
        const i = is +2;
        styling += `@container (min-width: ${breakpoints.at(i-1)!+1}px) and (max-width: ${breakpoints.at(i)}px) {\n .${parentDivClass} > .${svg_div_name(i-1)} ${show_svg_styling}}`
    });
    const lastIndex = breakpoints.length -1;
    styling += `@container (min-width: ${breakpoints.at(lastIndex)!+1}px) {\n .${parentDivClass} > .${svg_div_name(lastIndex)} ${show_svg_styling}}`

    let html = `<div class="${parentDivClass}">\n<style>\n${styling}\n</style>\n${svgContainer}</div>`;

    return html;
}
function setSvgWidthTo100(svgString:string) {
  // Replace any existing width="..."
  let updated = svgString.replace(/width="[^"]*"/, 'width="100%"');

  return updated;
}
function addInlineStyleToSvg(svg: string): string {
  const style = "vertical-align: middle; display: inline-block;"
  // Match the opening <svg ...> tag
  return svg.replace(
    /<svg([^>]*)class="([^"]*)"/,
    `<svg$1class="$2" style="${style}"`
  );
}

export class TypstForObsidianCompiler {
  wasmBytes: Buffer;
  packagePath: string;
  importPath: string;
  sharedpreamable: string;
  mathpreamable: string;
  codepreamable: string;
  font_size: number;
  line_height: number;
  var_widths: number[];
  compiler: typst.Compiler|null=null;
  theme: "dark" | "light";

  //TODO fix absolute path
  constructor(
    font_size: number,
    line_height: number,
    var_widths: number[],
    theme: "dark" | "light" = "dark",
    wasmpath :string =wasmPath ,
    obsidian_typst_plugin_folder: string = "S:/Coding_Gits/quartz/content/.obsidian/plugins/typst"
  ) {
    this.wasmBytes = fs.readFileSync(wasmpath);
    this.packagePath = path.join(obsidian_typst_plugin_folder,"packages");
    this.importPath = path.resolve("./content"); //TODO make more flexible
    const plugin_settings_path = path.resolve(obsidian_typst_plugin_folder,"data.json");
    const data = fs.readFileSync(plugin_settings_path, 'utf-8');
    const jsonData = JSON.parse(data);
    this.sharedpreamable = jsonData.preamable.shared;
    this.mathpreamable = jsonData.preamable.math;
    this.codepreamable = jsonData.preamable.code;

    this.font_size = font_size;
    this.line_height = line_height;
    if (var_widths.length==0) {
        throw Error("var widths should atleast contain one integer")
    } 
    this.var_widths = var_widths;
    this.theme = theme;
  }
  

  async init() {
    if (this.compiler != null) {
      return this;
    }
    const packagePath = this.packagePath;
    const importPath = this.importPath;
    function requestData(requested:string) {
      try {
        if (requested.startsWith("@")) {
          // remove the leading @
          const relPath = requested.slice(1);
          const fullPath = path.join(packagePath, relPath);

          if (fs.existsSync(fullPath)) {
            if (fs.statSync(fullPath).isDirectory()) {
                return fullPath;
            }
            return fs.readFileSync(fullPath, "utf8");
          }
          throw new Error(`Package file not found: ${requested}`);
        } else {
          let fullPath = requested;
          if (!path.isAbsolute(requested)) {
            fullPath = path.join(importPath, requested);
          }
          if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, "utf8");
          }
          throw new Error(`File not found: ${requested} at path ${fullPath}`);
        }
      } catch (e) {
        console.error("requestData error:", e);
        throw e;
      }
    }
    await typstInit({module_or_path:this.wasmBytes});
    this.compiler = new typst.Compiler("", requestData);
    return this;
  }

  null_or_pts(val:string|number|null) {
    return val==null ? "auto": `${val}pt`;
  }
  get_sizing_string(width:number|null,height:number|null) {
    return  `#let (WIDTH, HEIGHT, SIZE, THEME) = (${ this.null_or_pts(width)}, ${this.null_or_pts(height)}, ${this.font_size}pt, "${this.theme}")\n#set page(fill: none)`;
  }

  transform_svg_mathblock(source:string,path:string|null) {
    const source_with_preamable = `${this.mathpreamable}\n$ ${source} $`;
    return this.create_var_width_typstblock(source_with_preamable,path);
  }

  transform_svg_code(source:string,path:string|null) {
    const source_with_preamable = `${this.codepreamable}\n${source}`;
    return this.create_var_width_typstblock(source_with_preamable,path);
  }

  transform_svg_inline(source:string) {
    const sizing = this.get_sizing_string(null,this.line_height);
    const final_source = `${sizing}\n${this.sharedpreamable}\n${this.mathpreamable}\n$${source}$`;
    let svg = this.compile_svg(final_source);
    svg = addInlineStyleToSvg(svg);
    return svg;
  }

  transform_typst(source:string,path:string|null,is_language:boolean,is_display:boolean,is_inline:boolean) {
    if (is_inline) {
        return this.transform_svg_inline(source);
    } else if (is_language) {
        return this.transform_svg_code(source,path);
    } else if (is_display) {
        return this.transform_svg_mathblock(source,path);
    } else {
        throw Error("one of the conditions needs to be true");
    }
  }


  create_var_width_typstblock(source:string,path:string|null) {
    const sizing_missing_source = `${this.sharedpreamable}\n${source}`;
    let svg_list :string[] = [];
    for (const width of this.var_widths) {
      const sizing = this.get_sizing_string(width,null);
      const final_source = `${sizing}\n${sizing_missing_source}`;
      const generated_svg = this.compile_svg(final_source,path);
      svg_list.push(setSvgWidthTo100(generated_svg));
    }
    if (this.var_widths.length==1) {
        return svg_list.at(0);
    }
    return generateSvgSwitching(svg_list,this.var_widths);
  }


  compile_svg(source:string,path:string |null =null) {
    path ??="/586f8912-f3a8-4455-8a4a-3729469c2cc1.typ";
    return this.compiler!.compile_svg(source, path);
  }
}
