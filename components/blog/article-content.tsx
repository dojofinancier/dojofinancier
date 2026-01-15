"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

interface ArticleContentProps {
  content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
  return (
    <div className="prose prose-lg max-w-none mb-12
      prose-headings:font-bold prose-headings:text-gray-900
      prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
      prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
      prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
      prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
      prose-strong:text-gray-900 prose-strong:font-semibold
      prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4
      prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4
      prose-li:mb-2
      prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic
      prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
      prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:overflow-x-auto
      prose-img:rounded-lg prose-img:shadow-lg prose-img:my-6
      prose-table:w-full prose-table:border-collapse prose-table:my-6
      prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-th:text-left prose-th:font-semibold
      prose-td:border prose-td:border-gray-300 prose-td:p-2
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom link component to handle internal/external links
          a: ({ href, children, ...props }) => {
            if (!href) return <span {...props}>{children}</span>;
            
            const isInternal = href.startsWith("/");
            
            if (isInternal) {
              return (
                <Link href={href} className="text-primary hover:underline" {...props}>
                  {children}
                </Link>
              );
            }
            
            return (
              <a
                href={href}
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
