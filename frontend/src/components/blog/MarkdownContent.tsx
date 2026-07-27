import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function MarkdownLink({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const external = /^https?:\/\//.test(href);

  return (
    <a
      href={href}
      {...props}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="font-medium text-accent underline decoration-accent/35 underline-offset-4 transition hover:decoration-accent"
    >
      {children}
    </a>
  );
}

export function markdownIncludesImage(content: string, imageUrl: string | null) {
  if (!imageUrl) return false;
  return Array.from(content.matchAll(/!\[[^\]]*]\(([^)\s]+)/g)).some(
    (match) => match[1] === imageUrl
  );
}

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="min-w-0 break-words text-[15px] leading-7 text-white/85 sm:text-base sm:leading-8">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mb-5 mt-12 break-keep text-3xl font-semibold tracking-[-0.04em] text-white first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="mb-4 mt-12 break-keep border-b border-white/10 pb-4 text-2xl font-semibold tracking-[-0.035em] text-white first:mt-0 sm:text-3xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-3 mt-9 break-keep text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-3 mt-7 break-keep text-lg font-semibold text-white">{children}</h4>
          ),
          p: ({ children }) => <p className="my-5">{children}</p>,
          a: MarkdownLink,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="text-white/95">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-5 list-disc space-y-2 pl-6 marker:text-accent">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-5 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-accent">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-7 border-l-2 border-accent bg-white/[0.035] px-5 py-1 text-white/65">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-white/10" />,
          img: ({ src, alt }) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ''}
                loading="lazy"
                className="my-8 h-auto max-h-[80svh] w-full rounded-2xl border border-white/10 bg-white/[0.025] object-contain"
              />
            ) : null,
          table: ({ children }) => (
            <div className="my-7 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/[0.07] text-white">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-white/10 px-4 py-3 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/[0.07] px-4 py-3 align-top last:border-b-0">
              {children}
            </td>
          ),
          pre: ({ children }) => (
            <pre className="my-7 overflow-x-auto rounded-2xl border border-white/10 bg-black/45 p-5 text-[13px] leading-6 text-white/80">
              {children}
            </pre>
          ),
          code: ({ className, children }) => {
            const block = Boolean(className);
            return (
              <code
                className={
                  block
                    ? className
                    : 'rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-orange-100'
                }
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
