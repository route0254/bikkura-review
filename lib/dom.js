export function requiredElement(selector, root = document) {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Required DOM element not found: ${selector}`);
  return element;
}

export function requiredElements(selector, root = document) {
  const elements = [...root.querySelectorAll(selector)];
  if (!elements.length) throw new Error(`Required DOM elements not found: ${selector}`);
  return elements;
}
