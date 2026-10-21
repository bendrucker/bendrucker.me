import { createElement, type FunctionComponent } from "react";
import { createRoot } from "react-dom/client";
import { Agentation, type AgentationProps } from "agentation";
import { SOURCE_ATTRIBUTE } from "./source";

// The default port of `agentation-mcp server`, which `.mcp.json` starts with
// each Claude Code session.
const ENDPOINT = "http://localhost:4747";

// Agentation is declared returning a portal, which no `createElement`
// overload infers props from until it is named as a function component.
const Toolbar: FunctionComponent<AgentationProps> = Agentation;

const host = document.createElement("div");
const root = createRoot(host);

// The client router replaces `<body>` on every navigation, taking the host and
// the toolbar's portal with it, so both are reattached to the new page. The
// first `astro:page-load` can fire before this module has loaded, so it mounts
// once on its own too. Moving a host that is already attached would close the
// toolbar's popover, so it is only appended when the swap removed it.
function mount(): void {
  if (!host.isConnected) document.body.appendChild(host);
  root.render(
    createElement(Toolbar, {
      key: location.pathname,
      endpoint: ENDPOINT,
      portalContainer: host,
      identifyingAttributes: [SOURCE_ATTRIBUTE, "data-testid"],
    }),
  );
}

mount();
document.addEventListener("astro:page-load", mount);
