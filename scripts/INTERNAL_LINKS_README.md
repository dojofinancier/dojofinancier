# Internal Links Generation - Semantic Approach

This system uses OpenAI embeddings and pgvector to automatically generate contextual internal links between blog articles based on semantic similarity.

## Prerequisites

1. **OpenAI API Key**: Set `OPENAI_API_KEY` in your `.env` file
2. **Database Migration**: The embedding column and index have been created
3. **Published Articles**: Articles must be published and have content

## Workflow

### Step 1: Generate Embeddings for All Articles

First, generate embeddings for all published articles. This only needs to be done once (or when articles are updated).

```bash
# Generate embeddings for all articles
npx tsx scripts/generate-article-embeddings.ts

# Or with options:
npx tsx scripts/generate-article-embeddings.ts --limit=50 --offset=0

# Resume mode (only process articles without embeddings)
npx tsx scripts/generate-article-embeddings.ts --resume
```

**What it does:**
- Processes all published articles with content
- Generates embeddings using OpenAI `text-embedding-3-small`
- Stores embeddings in the database (pgvector)
- Shows progress and summary

**Cost**: ~$0.00001-0.00002 per article (very affordable)

### Step 2: Generate Internal Links

Once embeddings are generated, run the link generation script:

```bash
# Generate links for all articles (target: 3 links per article)
npx tsx scripts/add-internal-links.ts

# Dry run (preview without saving)
npx tsx scripts/add-internal-links.ts --dry-run

# Process single article
npx tsx scripts/add-internal-links.ts --article-id=<article-id>

# Custom target links count
npx tsx scripts/add-internal-links.ts --target-links=5
```

**What it does:**
- For each article, splits content into sentences
- Generates embeddings for each sentence
- Uses vector similarity search to find related articles
- Inserts 3-5 contextual links (configurable)
- Stores link metadata for analytics

**Link Selection Criteria:**
- Minimum similarity score: 0.65 (adjustable)
- Bonuses for: same category (+0.1), tag overlap (+0.05 per tag), same target market (+0.1), recent articles (+0.05)
- Avoids over-linking (max 1 link per article target)
- Natural anchor text extraction

## How It Works

1. **Embedding Generation**: Each article's title, excerpt, and first 500 words are converted to a 1536-dimensional vector
2. **Sentence Analysis**: Article content is split into sentences, each sentence gets its own embedding
3. **Semantic Search**: For each sentence, find the most semantically similar articles using cosine similarity
4. **Link Insertion**: Insert markdown links at natural positions in the content
5. **Metadata Storage**: Track all inserted links for analytics and maintenance

## Example

**Before:**
```markdown
Les courtiers en valeurs mobilières jouent un rôle essentiel dans le système financier canadien.
```

**After:**
```markdown
Les [courtiers en valeurs mobilières](/article/ccvm-1-roles-et-types-de-courtiers) jouent un rôle essentiel dans le système financier canadien.
```

## Maintenance

### Regenerate Embeddings

If articles are updated, regenerate embeddings:

```bash
npx tsx scripts/generate-article-embeddings.ts --resume
```

### Refresh Links

To refresh links for updated articles:

```bash
npx tsx scripts/add-internal-links.ts
```

## Troubleshooting

### "No embedding found" error

Run the embedding generation script first:
```bash
npx tsx scripts/generate-article-embeddings.ts
```

### Low similarity scores

- Ensure articles have sufficient content (at least 200 words)
- Check that embeddings were generated correctly
- Consider lowering the similarity threshold (currently 0.65)

### Rate Limiting

The scripts include delays to avoid OpenAI rate limits. If you encounter rate limits:
- Reduce batch size with `--limit`
- Add longer delays in the scripts

## Cost Estimates

- **Embedding Generation**: ~$0.002-0.004 for 189 articles
- **Link Detection**: Minimal (uses stored embeddings)
- **Total**: Very affordable for the quality improvement

## Next Steps

1. Run embedding generation for all articles
2. Review sample articles with `--dry-run`
3. Generate links for all articles
4. Monitor link quality and adjust similarity threshold if needed
