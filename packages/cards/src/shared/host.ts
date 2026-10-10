/*
 * Where the wall's pieces live: inside the dashboard panel's shadow root, next to `hui-root`, so the look's tokens
 * (declared on the panel in the `dashboards` scope) reach them; the page's body when no dashboard panel is found
 * (the playground, an unexpected page).
 */

const deepFind = (root: ParentNode, tag: string, depth = 0): Element | undefined => {
  if (depth > 12) return undefined;
  for (const element of root.querySelectorAll('*')) {
    if (element.localName === tag) return element;
    if (element.shadowRoot) {
      const found = deepFind(element.shadowRoot, tag, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
};

export function wallHost(doc: Document): ParentNode {
  const panel = deepFind(doc, 'ha-panel-lovelace');
  return panel?.shadowRoot ?? doc.body;
}
