import type { LessonFigureSpec } from "../content/lessonFigures";

export function LessonFigure({ figure }: { figure: LessonFigureSpec }) {
  return (
    <figure className="lesson-figure">
      <div className="lesson-figure__canvas">
        <img src={figure.src} alt={figure.alt} loading="lazy" decoding="async" />
      </div>
      <figcaption>{figure.caption}</figcaption>
    </figure>
  );
}
