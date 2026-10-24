export interface View {
  element: HTMLElement;
  heading: HTMLElement;
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function createHeading(text: string): HTMLHeadingElement {
  const heading = createEl('h1', 'screen-heading', text);
  heading.tabIndex = -1;
  return heading;
}

export function createButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = createEl('button', className, label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

export const PLACEHOLDER_BANNER = 'Placeholder questions - sample content';

export function createPlaceholderBanner(): HTMLElement {
  return createEl('p', 'placeholder-banner', PLACEHOLDER_BANNER);
}
