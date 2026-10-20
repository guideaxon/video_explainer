import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

/** Rendered Markdown. The HTML is sanitized, so pasted or uploaded text cannot run scripts. */
export default function MarkdownPreview({ text }: { text: string }) {
  const html = useMemo(() => DOMPurify.sanitize(marked.parse(text, { async: false }) as string), [text]);
  if (!text.trim()) return <div className="md muted">Preview appears here as you type.</div>;
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}
