import dataset from './data/questions.json';
import './styles/app.css';
import { realClock, realScheduler, realVisibility } from './platform/clock';
import { createErrorView } from './ui/errorView';
import { mountApp } from './ui/app';

const root = document.getElementById('app');

if (root) {
  try {
    mountApp(root, dataset, { clock: realClock, scheduler: realScheduler, visibility: realVisibility });
  } catch (error) {
    root.replaceChildren(createErrorView('Something went wrong', [String(error)]).element);
  }
}
