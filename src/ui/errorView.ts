import { createEl, createHeading, type View } from './dom';

export function createErrorView(message: string, details: string[]): View {
  if (details.length > 0) console.error(message, details);
  const element = createEl('section', 'screen error-screen');
  element.setAttribute('role', 'alert');
  const heading = createHeading(message);
  element.append(heading, createEl('p', undefined, 'The quiz cannot be started. Please contact the quiz owner.'));
  return { element, heading };
}
