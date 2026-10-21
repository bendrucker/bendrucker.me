import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { Options as VueOptions } from "@vitejs/plugin-vue";
import { ElementTypes, NodeTypes } from "@vue/compiler-core";
import { SOURCE_ATTRIBUTE } from "./source";

type NodeTransform = NonNullable<
  NonNullable<VueOptions["template"]>["compilerOptions"]
>["nodeTransforms"] extends (infer T)[] | undefined
  ? T
  : never;

interface ConfigureOptions {
  command: string;
  root: string;
  injectScript: (stage: "page", content: string) => void;
}

/**
 * Agentation's visual feedback toolbar, under `astro dev` or a build run with
 * `AGENTATION=1`. Agentation finds source files by walking React's fiber tree,
 * which a Vue page doesn't have, so `sourceTransform` stamps every Vue template
 * element with its file and line instead, and the toolbar captures that.
 */
export function feedback(): {
  integration: AstroIntegration;
  sourceTransform: NodeTransform;
  configure: (options: ConfigureOptions) => void;
} {
  let enabled = false;
  let root = process.cwd();

  const configure = ({
    command,
    root: projectRoot,
    injectScript,
  }: ConfigureOptions) => {
    enabled = command === "dev" || process.env.AGENTATION === "1";
    if (!enabled) return;
    root = projectRoot;
    injectScript("page", `import "/src/feedback/toolbar.ts";`);
  };

  return {
    configure,
    integration: {
      name: "feedback",
      hooks: {
        "astro:config:setup": ({ command, config, injectScript }) => {
          configure({
            command,
            root: fileURLToPath(config.root),
            injectScript,
          });
        },
      },
    },
    sourceTransform: (node, context) => {
      if (
        !enabled ||
        node.type !== NodeTypes.ELEMENT ||
        node.tagType !== ElementTypes.ELEMENT
      ) {
        return;
      }
      const file = path.relative(root, context.filename);
      const content = `${file}:${node.loc.start.line}`;
      node.props.push({
        type: NodeTypes.ATTRIBUTE,
        name: SOURCE_ATTRIBUTE,
        nameLoc: node.loc,
        value: { type: NodeTypes.TEXT, content, loc: node.loc },
        loc: node.loc,
      });
    },
  };
}
