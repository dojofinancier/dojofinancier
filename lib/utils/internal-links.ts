/**
 * Utilities for detecting and inserting internal links into markdown content
 */

export interface LinkOpportunity {
  keyword: string;
  targetSlug: string;
  targetTitle: string;
  position: number; // Character position in content
  context: string; // Surrounding sentence/paragraph
  similarityScore: number; // Cosine similarity (0.0-1.0)
  relevanceScore: number; // Combined score with bonuses
}

/**
 * Split markdown content into sentences
 * Handles French punctuation and common sentence endings
 */
export function splitIntoSentences(content: string): Array<{
  text: string;
  startIndex: number;
  endIndex: number;
}> {
  const sentences: Array<{ text: string; startIndex: number; endIndex: number }> = [];
  
  // Remove markdown code blocks first (they shouldn't be split)
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks: Array<{ start: number; end: number }> = [];
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({ start: match.index, end: match.index + match[0].length });
  }

  // Sentence ending patterns (French + English)
  const sentenceEndRegex = /[.!?…]\s+/g;
  let lastIndex = 0;
  let currentIndex = 0;

  while ((match = sentenceEndRegex.exec(content)) !== null) {
    // Check if we're inside a code block
    const inCodeBlock = codeBlocks.some(
      (block) => match!.index >= block.start && match!.index < block.end
    );

    if (!inCodeBlock) {
      const sentence = content.substring(lastIndex, match.index + match[0].length).trim();
      if (sentence.length > 10) {
        // Only include sentences with at least 10 characters
        sentences.push({
          text: sentence,
          startIndex: lastIndex,
          endIndex: match.index + match[0].length,
        });
      }
      lastIndex = match.index + match[0].length;
    }
  }

  // Add remaining content as last sentence
  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex).trim();
    if (remaining.length > 10) {
      sentences.push({
        text: remaining,
        startIndex: lastIndex,
        endIndex: content.length,
      });
    }
  }

  return sentences;
}

/**
 * Extract the most relevant keyword/phrase from context that matches the target title
 * Tries to find a natural phrase that would work as anchor text
 */
export function extractKeywordFromContext(
  context: string,
  targetTitle: string
): string | null {
  // Remove markdown formatting from context
  const cleanContext = context
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");

  // Extract key words from target title (2-4 word phrases)
  const titleWords = targetTitle
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3); // Only meaningful words

  // Try to find matching phrases in context (2-4 words)
  for (let phraseLength = 4; phraseLength >= 2; phraseLength--) {
    for (let i = 0; i <= titleWords.length - phraseLength; i++) {
      const phrase = titleWords.slice(i, i + phraseLength).join(" ");
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      
      if (regex.test(cleanContext)) {
        // Find the actual phrase in context (preserve original casing)
        const match = cleanContext.match(regex);
        if (match) {
          return match[0];
        }
      }
    }
  }

  // Fallback: try single significant words
  for (const word of titleWords) {
    if (word.length > 5) {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(cleanContext)) {
        const match = cleanContext.match(regex);
        if (match) {
          return match[0];
        }
      }
    }
  }

  return null;
}

/**
 * Insert links into markdown content at specified positions
 * Inserts in reverse order to maintain position accuracy
 */
export function insertLinksIntoMarkdown(
  content: string,
  links: LinkOpportunity[]
): string {
  if (links.length === 0) {
    return content;
  }

  // Sort links by position (descending) to insert from end to start
  const sortedLinks = [...links].sort((a, b) => b.position - a.position);

  let updatedContent = content;

  for (const link of sortedLinks) {
    const { keyword, targetSlug, position } = link;

    // Find the keyword at the specified position
    const beforePosition = updatedContent.substring(0, position);
    const afterPosition = updatedContent.substring(position);

    // Try to find the keyword near the position
    const keywordIndex = afterPosition.toLowerCase().indexOf(keyword.toLowerCase());

    if (keywordIndex === -1) {
      // If exact keyword not found, try to find a similar phrase
      console.warn(`Keyword "${keyword}" not found at position ${position}, skipping link`);
      continue;
    }

    const actualPosition = position + keywordIndex;
    const beforeKeyword = updatedContent.substring(0, actualPosition);
    const keywordText = updatedContent.substring(
      actualPosition,
      actualPosition + keyword.length
    );
    const afterKeyword = updatedContent.substring(actualPosition + keyword.length);

    // Check if already linked (avoid double-linking)
    if (beforeKeyword.endsWith("[") || afterKeyword.startsWith("](")) {
      continue;
    }

    // Check if inside a code block or heading
    const beforeContext = beforeKeyword.slice(-50);
    if (
      beforeContext.includes("```") ||
      beforeContext.match(/^#{1,6}\s+[^\n]*$/m)
    ) {
      continue;
    }

    // Insert markdown link
    const linkMarkdown = `[${keywordText}](/article/${targetSlug})`;
    updatedContent = beforeKeyword + linkMarkdown + afterKeyword;
  }

  return updatedContent;
}

/**
 * Validate that a link opportunity is safe to insert
 */
export function validateLinkOpportunity(
  opportunity: LinkOpportunity,
  content: string
): boolean {
  // Check position is within content bounds
  if (opportunity.position < 0 || opportunity.position >= content.length) {
    return false;
  }

  // Check similarity threshold
  if (opportunity.similarityScore < 0.65) {
    return false;
  }

  // Check that keyword exists in context
  const contextLower = opportunity.context.toLowerCase();
  const keywordLower = opportunity.keyword.toLowerCase();
  if (!contextLower.includes(keywordLower)) {
    return false;
  }

  return true;
}
