import type { Clock, Scheduler, VisibilitySource } from '../platform/clock';
import { Controller } from '../quiz/controller';
import type { Dataset, QuizStatus } from '../quiz/types';
import { validateDataset } from '../quiz/validateDataset';
import { createEl, type View } from './dom';
import { createErrorView } from './errorView';
import { createQuizView, type QuizView } from './quizView';
import { createResultsView } from './resultsView';
import { createStartView } from './startView';

export interface AppDeps {
  clock: Clock;
  scheduler: Scheduler;
  visibility: VisibilitySource;
}

export function mountApp(root: HTMLElement, data: unknown, deps: AppDeps): () => void {
  root.replaceChildren();
  const announcer = createEl('div', 'visually-hidden');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  const screen = createEl('main', 'app');
  root.append(announcer, screen);

  function show(view: View, moveFocus: boolean): void {
    announcer.textContent = '';
    screen.replaceChildren(view.element);
    if (moveFocus) view.heading.focus();
  }

  const problems = validateDataset(data);
  if (problems.length > 0) {
    show(createErrorView('Quiz data is invalid', problems), false);
    return () => {};
  }

  const dataset = data as Dataset;
  const controller = new Controller(dataset, {
    ...deps,
    announce: (text) => {
      announcer.textContent = text;
    },
  });

  let shownStatus: QuizStatus = 'idle';
  let quizView: QuizView | null = null;

  const saved = controller.getSavedAttemptStatus();
  const resumeMessage =
    saved.status === 'corrupt'
      ? 'A previously saved attempt could not be loaded and was cleared.'
      : saved.status === 'expired'
        ? 'A previously saved attempt has expired.'
        : saved.status === 'incompatible'
          ? 'A previously saved attempt is not compatible with the current quiz.'
          : saved.status === 'unavailable'
            ? 'Saved progress is unavailable in this browser context.'
            : undefined;

  show(
    createStartView(
      dataset,
      {
        onStart: () => controller.start(),
        onResume: () => controller.resume(),
        onStartOver: () => controller.startOver(),
      },
      { showResume: controller.hasSavedAttempt(), resumeMessage },
    ),
    false,
  );

  controller.subscribe((state, remainingMs) => {
    if (state.status !== shownStatus) {
      shownStatus = state.status;
      quizView = null;
      if (state.status === 'active') {
        quizView = createQuizView(dataset, {
          onSelect: (questionId, optionId) => controller.select(questionId, optionId),
          onSubmit: () => controller.submit(),
        });
        quizView.update(state, remainingMs);
        show(quizView, true);
      } else if (state.result) {
        show(createResultsView(state.result, () => controller.restart()), true);
      } else if (state.status === 'idle') {
        // Returning to start screen (e.g. Start Over)
        show(
          createStartView(
            dataset,
            {
              onStart: () => controller.start(),
              onResume: () => controller.resume(),
              onStartOver: () => controller.startOver(),
            },
            { showResume: controller.hasSavedAttempt() },
          ),
          true,
        );
      }
    } else if (quizView && state.status === 'active') {
      quizView.update(state, remainingMs);
    }
  });

  return () => controller.dispose();
}
