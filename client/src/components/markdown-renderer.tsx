import React from 'react'
import ReactMarkdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      components={{
        // Customize markdown components to match your design
        p: ({ children }) => <p className="mb-2 text-white">{children}</p>,
        h1: ({ children }) => <h1 className="mb-2 text-xl font-bold text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold text-white">{children}</h2>,
        h3: ({ children }) => (
          <h3 className="mb-1 text-base font-semibold text-white">{children}</h3>
        ),
        h4: ({ children }) => <h4 className="mb-1 text-sm font-semibold text-white">{children}</h4>,
        h5: ({ children }) => <h5 className="mb-1 text-xs font-semibold text-white">{children}</h5>,
        h6: ({ children }) => <h6 className="mb-1 text-xs font-semibold text-white">{children}</h6>,
        ul: ({ children }) => (
          <ul className="mb-2 list-inside list-disc space-y-1 text-white">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-inside list-decimal space-y-1 text-white">{children}</ol>
        ),
        li: ({ children }) => <li className="text-white">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-white">{children}</em>,
        code: ({ children }) => (
          <code className="rounded bg-gray-700 px-1 py-0.5 text-sm text-white">{children}</code>
        ),
        pre: ({ children }) => (
          <pre className="mb-2 overflow-x-auto rounded bg-gray-700 p-2 text-white">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-2 border-l-4 border-pink-500 pl-4 italic text-white">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-gray-600" />,
        a: ({ children, href }) => (
          <a
            href={href}
            className="text-pink-400 underline hover:text-pink-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <table className="mb-2 w-full border-collapse border border-gray-600">{children}</table>
        ),
        thead: ({ children }) => <thead className="bg-gray-700">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-gray-600">{children}</tr>,
        th: ({ children }) => (
          <th className="border border-gray-600 px-2 py-1 text-left font-semibold text-white">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-600 px-2 py-1 text-white">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
