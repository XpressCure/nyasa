export function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="page-header">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
