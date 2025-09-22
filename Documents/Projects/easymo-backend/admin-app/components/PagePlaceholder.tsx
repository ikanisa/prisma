export interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p>{description}</p>
      <ul>
        <li>Loading, empty, and error states will be wired during data modeling tasks.</li>
        <li>API interactions will be routed through the forthcoming admin API layer.</li>
        <li>Visual polish and widgets will arrive in the appropriate future phases.</li>
      </ul>
    </section>
  );
}
