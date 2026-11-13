import { Fragment } from "react";

/** Renders the tiny markdown subset used in guide content: paragraphs, "- " bullets, "### " headings, **bold**. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function RichText({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return (
    <div className="prose-atlas">
      {blocks.map((b, i) => {
        const lines = b.split("\n").map((l) => l.trimEnd());
        if (lines[0]!.startsWith("### ")) {
          const rest = lines.slice(1).join("\n");
          return (
            <Fragment key={i}>
              <h3 className={lines[0]!.toLowerCase().includes("official requirement") ? "text-brand-2" : lines[0]!.toLowerCase().includes("travel advice") ? "text-accent" : undefined}>{lines[0]!.slice(4)}</h3>
              {rest && <RichText body={rest} />}
            </Fragment>
          );
        }
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        if (lines.some((l) => l.trim().startsWith("- "))) {
          const para = lines.filter((l) => !l.trim().startsWith("- "));
          const items = lines.filter((l) => l.trim().startsWith("- "));
          return (
            <Fragment key={i}>
              {para.length > 0 && <p>{inline(para.join(" "))}</p>}
              <ul>{items.map((l, j) => <li key={j}>{inline(l.trim().slice(2))}</li>)}</ul>
            </Fragment>
          );
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
