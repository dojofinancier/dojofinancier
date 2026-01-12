# Content Generation Reproduction Plan

## Overview

This comprehensive plan documents the complete content generation process for reproducing similar workflows on different websites with similar architecture. It integrates all learnings from trials, including outline generation, encoding handling, AI model selection, parameter configuration, and bulk database operations.

---

## Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Database Schema Design](#database-schema-design)
3. [Phase 1: Initial Data Upload](#phase-1-initial-data-upload)
4. [Phase 2: Outline Generation](#phase-2-outline-generation)
5. [Phase 3: Content Generation](#phase-3-content-generation)
6. [Phase 4: Quality Control](#phase-4-quality-control)
7. [Phase 5: Enrichment (Links & Related Content)](#phase-5-enrichment-links--related-content)
8. [Phase 6: Publishing](#phase-6-publishing)
9. [Critical Technical Considerations](#critical-technical-considerations)
10. [Error Handling & Recovery](#error-handling--recovery)
11. [Cost Optimization](#cost-optimization)
12. [Monitoring & Logging](#monitoring--logging)

---

## Prerequisites & Setup

### Required Environment Variables

Create a `.env` file with:

```bash
# OpenAI API (for content generation)
OPENAI_API_KEY=sk-...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# OR use service role key for admin operations:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Perplexity API (for external links with web search)
PERPLEXITY_API_KEY=pplx-...
```

### Python Dependencies

```bash
pip install openai supabase python-dotenv
```

### File Structure

```
scripts/articles/
├── README.md                          # Process documentation
├── CONTENT_GENERATION_REPRODUCTION_PLAN.md  # This file
├── article_prompts.md                 # All AI prompts
├── articles_250_real_titles.csv      # Input CSV (title, category)
│
├── upload_100_articles.py            # Phase 1: Upload initial data
├── generate_outlines_v2.py           # Phase 2: Generate outlines
├── generate_articles_v2.py           # Phase 3: Generate full content
├── quality_control_grammar.py        # Phase 4: Grammar check
├── add_internal_links.py             # Phase 5: Internal links
├── add_related_articles.py           # Phase 5: Related articles
├── add_external_links.py             # Phase 5: External links
├── publish_articles.py               # Phase 6: Publish
│
└── logs/                              # Log files
    ├── outline_generation.log
    ├── article_generation.log
    ├── quality_control_grammar.log
    └── ...
```

---

## Database Schema Design

### Table: `general_articles`

```sql
CREATE TABLE general_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    
    -- Content fields
    draft_outline TEXT,
    content TEXT,
    h1 TEXT,
    excerpt TEXT,
    meta_description TEXT,
    
    -- SEO fields
    tags TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    
    -- Links
    internal_links JSONB DEFAULT '[]',
    external_links JSONB DEFAULT '[]',
    related_articles UUID[] DEFAULT '{}',
    
    -- Metadata
    word_count INTEGER,
    status TEXT DEFAULT 'draft_outline',
    published BOOLEAN DEFAULT FALSE,
    is_indexable BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_general_articles_slug ON general_articles(slug);
CREATE INDEX idx_general_articles_status ON general_articles(status);
CREATE INDEX idx_general_articles_published ON general_articles(published);
CREATE INDEX idx_general_articles_category ON general_articles(category);
```

### Status Flow

```
draft_outline → draft → content_generated → links_added → published
```

---

## Phase 1: Initial Data Upload

### Objective
Upload article titles and categories from CSV to database with proper slug generation.

### Critical: Slug Generation with Accent Handling

**ALWAYS use Unicode normalization (NFD) to handle accents correctly:**

```python
import unicodedata
import re

def generate_slug(title: str) -> str:
    """
    Generate SEO-friendly slug from title.
    
    CRITICAL: Uses NFD normalization to properly handle accents:
    - é, è, ê, ë → e
    - à, â, ä → a
    - ù, û, ü → u
    - ç → c
    - etc.
    """
    # Step 1: Normalize to NFD (decomposed form)
    # This separates base characters from diacritics
    slug = unicodedata.normalize('NFD', title)
    
    # Step 2: Remove combining marks (diacritics)
    # This converts é to e, à to a, etc.
    slug = ''.join(c for c in slug if unicodedata.category(c) != 'Mn')
    
    # Step 3: Convert to lowercase
    slug = slug.lower()
    
    # Step 4: Replace spaces and special chars with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    
    # Step 5: Remove leading/trailing hyphens
    slug = re.sub(r'^-+|-+$', '', slug)
    
    # Step 6: Limit length (important for URLs)
    return slug[:100]
```

**Why NFD normalization?**
- Ensures consistent slug generation across different systems
- Prevents encoding issues (UTF-8 vs Latin-1)
- Handles all Unicode accents uniformly
- Critical for French content (é, è, ê, à, ç, etc.)

### CSV Format

```csv
title,category
"Comment réussir ses examens de finance","Études"
"Gérer son stress pendant les examens","Bien-être"
```

### Upload Script Key Points

1. **Batch Processing**: Process 20 articles per batch
2. **Duplicate Handling**: Check for existing slugs before insert
3. **Error Recovery**: Continue on individual failures, log errors
4. **Encoding**: Always use `encoding='utf-8'` when reading CSV

### Example Upload Script Structure

```python
def upload_articles(articles: List[Dict[str, str]]) -> Dict[str, int]:
    """Upload articles to database. Returns stats."""
    stats = {'created': 0, 'updated': 0, 'errors': 0}
    
    batch_size = 20
    for i in range(0, len(articles), batch_size):
        batch = articles[i:i+batch_size]
        
        for article in batch:
            slug = generate_slug(article['title'])  # CRITICAL: Use proper slug function
            
            # Check if exists
            existing = supabase.from_('general_articles')\
                .select('id')\
                .eq('slug', slug)\
                .execute()
            
            if existing.data:
                # Update existing
                update_data = {
                    'title': article['title'],
                    'category': article['category'],
                    'status': 'draft_outline',
                    'updated_at': datetime.utcnow().isoformat()
                }
                result = supabase.from_('general_articles')\
                    .update(update_data)\
                    .eq('slug', slug)\
                    .execute()
            else:
                # Create new
                insert_data = {
                    'slug': slug,
                    'title': article['title'],
                    'category': article['category'],
                    'status': 'draft_outline',
                    'published': False,
                    'is_indexable': False,
                    'tags': [],
                    'keywords': [],
                    'internal_links': [],
                    'related_articles': [],
                    'external_links': [],
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
                result = supabase.from_('general_articles')\
                    .insert(insert_data)\
                    .execute()
        
        time.sleep(0.5)  # Rate limiting
    
    return stats
```

### Verification After Upload

1. Check slug uniqueness: `SELECT slug, COUNT(*) FROM general_articles GROUP BY slug HAVING COUNT(*) > 1;`
2. Verify encoding: Check a few articles with accents in titles
3. Confirm status: All should be `status='draft_outline'`

---

## Phase 2: Outline Generation

### Objective
Generate detailed article outlines using AI, then review and validate before proceeding.

### AI Model Selection

**Use `gpt-5-nano` for outline generation:**
- **Cost**: ~33% cheaper than gpt-4o-mini
- **Quality**: Sufficient for structured outline generation
- **Speed**: Fast response times
- **Cost per outline**: ~$0.0004-0.0007 per article (with improvement step)

### Two-Step Process

#### Step 2a: Initial Outline Generation

**Model**: `gpt-5-nano`

**Parameters**:
```python
response = client.chat.completions.create(
    model="gpt-5-nano",
    messages=[
        {
            "role": "system",
            "content": "Tu es un expert en stratégie de contenu..."
        },
        {
            "role": "user",
            "content": prompt_with_title_and_goal
        }
    ],
    max_completion_tokens=2000,      # Sufficient for outlines
    reasoning_effort="minimal",       # Prioritize speed/cost
    verbosity="medium"                # Medium verbosity for structured content
    # Note: gpt-5-nano doesn't support custom temperature (uses default 1)
)
```

**Prompt Structure**:
- Load from `article_prompts.md` (first prompt section)
- Replace `{{ARTICLE_TITLE}}` with actual title
- Replace `{{ARTICLE_GOAL}}` with generated goal
- Add style instructions (avoid geographical references, etc.)

#### Step 2b: Outline Improvement (Recommended)

**Model**: `gpt-5-nano` (same as Step 2a)

**Parameters**: Same as Step 2a

**Purpose**: Refine and improve outline quality
- Remove generic/vague sections
- Add missing practical elements
- Strengthen headlines
- Ensure all requirements met

**Decision**: Always improve for first batch, then evaluate quality to decide.

### Outline Validation

Before saving, validate:

```python
def validate_outline(outline: str) -> Tuple[bool, str]:
    """Validate outline structure."""
    # Check for exactly 1 H1
    h1_count = len(re.findall(r'^#\s+', outline, re.MULTILINE))
    if h1_count != 1:
        return False, f"Expected 1 H1, found {h1_count}"
    
    # Check for 8-12 H2 sections
    h2_count = len(re.findall(r'^##\s+', outline, re.MULTILINE))
    if h2_count < 8 or h2_count > 12:
        return False, f"Expected 8-12 H2 sections, found {h2_count}"
    
    # Check for required sections
    required_sections = [
        "Erreurs fréquentes",
        "Astuces de tuteur",
        "Mini-checklist"
    ]
    outline_lower = outline.lower()
    for section in required_sections:
        if section.lower() not in outline_lower:
            return False, f"Missing required section: {section}"
    
    # Check for H3 subsections (at least 1 per H2)
    h3_count = len(re.findall(r'^###\s+', outline, re.MULTILINE))
    if h3_count < h2_count:
        return False, f"Not enough H3 subsections: {h3_count} for {h2_count} H2s"
    
    return True, "Valid"
```

### Batch Processing

- **Batch Size**: 5-10 articles per batch
- **Rate Limiting**: 1-1.5 second delay between API calls
- **Error Handling**: Continue processing remaining articles if one fails

### Database Update

```python
def update_article_outline(slug: str, outline: str) -> bool:
    """Update article with generated outline."""
    update_data = {
        'draft_outline': outline,
        'status': 'draft',  # Move to next stage
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.from_('general_articles')\
        .update(update_data)\
        .eq('slug', slug)\
        .execute()
    
    return bool(result.data)
```

### Slug Mismatch Handling

**Critical Issue**: Encoding differences can cause slug mismatches.

**Solution**: Use fuzzy string matching (Levenshtein distance):

```python
from difflib import SequenceMatcher

def find_closest_slug(target_slug: str, all_slugs: List[str]) -> Optional[str]:
    """Find closest matching slug using fuzzy matching."""
    best_match = None
    best_ratio = 0.0
    
    for slug in all_slugs:
        ratio = SequenceMatcher(None, target_slug.lower(), slug.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = slug
    
    # Only return if similarity is high enough (e.g., > 0.8)
    return best_match if best_ratio > 0.8 else None
```

### Review Process

**After outline generation:**
1. Review 5-10 sample outlines manually
2. Check structure (H1, H2, H3 counts)
3. Verify required sections present
4. Assess quality (specificity, practicality)
5. Adjust prompts if needed before proceeding

---

## Phase 3: Content Generation

### Objective
Generate full article content (1,500-2,000 words) from validated outlines.

### AI Model Selection

**Use `gpt-5-nano` for content generation:**
- **Cost**: ~$0.0013-0.0024 per article (with improvement)
- **Quality**: High quality with proper prompts
- **Parameters**: Supports high reasoning effort for better adherence

### Two-Step Process

#### Step 3a: Initial Article Generation

**Model**: `gpt-5-nano`

**Parameters**:
```python
response = client.chat.completions.create(
    model="gpt-5-nano",
    messages=[
        {
            "role": "system",
            "content": "Tu es un expert... RÈGLE ABSOLUE: Ne jamais mentionner 'Québec'..."
        },
        {
            "role": "user",
            "content": prompt_with_title_and_outline
        }
    ],
    max_completion_tokens=50000,      # High limit for long articles + reasoning
    reasoning_effort="high",          # HIGH for better quality and instruction adherence
    verbosity="medium"                # Medium verbosity balances quality/tokens
)
```

**Critical Prompt Instructions**:
- Load from `article_prompts.md` (third prompt section)
- Replace `{{ARTICLE_TITLE}}` with title
- Replace `{{OUTLINE_HERE}}` with outline
- **CRITICAL**: Add strict rule about avoiding geographical references
- Emphasize word count (1,500-2,000 words)
- Specify tone (tu form, conversational, practical)

#### Step 3b: Article Improvement (Recommended)

**Model**: `gpt-5-nano` (same as Step 3a)

**Parameters**: Same as Step 3a

**Purpose**: Refine and improve article quality
- Remove generic/vague sections
- Add missing practical elements
- Strengthen explanations
- Add concrete examples
- Ensure tone consistency

### Content Validation

```python
def validate_article(article_content: str, metadata: Dict) -> Tuple[bool, str]:
    """Validate article quality."""
    # Check word count (should be 1,500-2,000, but allow flexibility)
    word_count = metadata['word_count']
    if word_count < 1000:
        return False, f"Article too short: {word_count} words (expected at least 1000)"
    
    # Check for H1
    h1_count = len(re.findall(r'^#\s+', article_content, re.MULTILINE))
    if h1_count == 0:
        return False, "No H1 heading found"
    
    # Check for H2 sections (should have structure)
    h2_count = len(re.findall(r'^##\s+', article_content, re.MULTILINE))
    if h2_count < 3:
        return False, f"Not enough H2 sections: {h2_count} (expected at least 3)"
    
    return True, "Valid"
```

### Metadata Extraction

```python
def extract_metadata(article_content: str, title: str) -> Dict[str, any]:
    """Extract metadata from article content."""
    # Extract H1 (first heading)
    h1_match = re.search(r'^#\s+(.+)$', article_content, re.MULTILINE)
    h1 = h1_match.group(1).strip() if h1_match else title
    
    # Generate meta description (first 150 chars, cleaned)
    content_clean = re.sub(r'[#*`\[\]()]', '', article_content)
    meta_desc = content_clean[:150].strip()
    if len(meta_desc) == 150:
        meta_desc += "..."
    
    # Generate excerpt (first 200 chars)
    excerpt = content_clean[:200].strip()
    if len(excerpt) == 200:
        excerpt += "..."
    
    # Count words
    word_count = count_words(article_content)
    
    return {
        'h1': h1,
        'meta_description': meta_desc,
        'excerpt': excerpt,
        'word_count': word_count,
        'tags': [],  # Can be generated separately
        'keywords': []  # Can be generated separately
    }
```

### Batch Processing

- **Batch Size**: 5-10 articles per batch
- **Rate Limiting**: 2-2.5 second delay between API calls (longer for larger content)
- **Error Handling**: Retry logic with exponential backoff
- **Checkpointing**: Save progress every 10 articles

### Database Update

```python
def update_article_content(slug: str, article_content: str, metadata: Dict) -> bool:
    """Update article with generated content and metadata."""
    update_data = {
        'content': article_content,
        'h1': metadata['h1'],
        'meta_description': metadata['meta_description'],
        'excerpt': metadata['excerpt'],
        'tags': metadata['tags'],
        'keywords': metadata['keywords'],
        'word_count': metadata['word_count'],
        'status': 'draft',  # Keep as draft until links added
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.from_('general_articles')\
        .update(update_data)\
        .eq('slug', slug)\
        .execute()
    
    return bool(result.data)
```

### Retry Logic

```python
def generate_article(title: str, outline: str, base_prompt: str, max_retries: int = 2) -> Dict:
    """Generate article with retry logic."""
    for attempt in range(max_retries + 1):
        try:
            if attempt > 0:
                logger.info(f"Retry attempt {attempt}/{max_retries}")
                time.sleep(2)
            
            response = client.chat.completions.create(...)
            
            # Check for empty response
            if not response.choices or not response.choices[0].message.content:
                if attempt < max_retries:
                    continue  # Retry
                else:
                    return {'success': False, 'error': 'Empty response'}
            
            # Success
            return {'success': True, 'content': response.choices[0].message.content}
        
        except Exception as e:
            if attempt < max_retries:
                continue  # Retry
            else:
                return {'success': False, 'error': str(e)}
```

---

## Phase 4: Quality Control

### Objective
Check and correct grammatical errors in titles, H1, meta descriptions, and excerpts.

### AI Model Selection

**Use `gpt-5-nano` for grammar checking:**
- **Cost**: Very low (~$0.0001-0.0002 per article)
- **Quality**: Excellent for grammar correction
- **Speed**: Fast

### Grammar Check Process

**Model**: `gpt-5-nano`

**Parameters**:
```python
response = client.chat.completions.create(
    model="gpt-5-nano",
    messages=[...],
    max_completion_tokens=500,        # Small response (just corrections)
    reasoning_effort="minimal",       # Fast grammar check
    verbosity="low",                  # Low verbosity for simple corrections
    response_format={"type": "json_object"}  # Structured output
)
```

**Common Corrections**:
- "en la/le" → "en" (e.g., "en la lecture" → "en lecture")
- "de le" → "du"
- "de la" → "de la" (when appropriate)
- Other French grammar errors

### Batch Processing

- **Batch Size**: 20 articles per batch
- **Rate Limiting**: 0.5 second delay between API calls
- **Update Only Changed Fields**: Only update database if corrections were made

### Database Update

```python
def update_article_grammar(slug: str, corrections: Dict[str, str]) -> bool:
    """Update article with grammar corrections."""
    update_data = {
        **corrections,  # Only include fields that changed
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.from_('general_articles')\
        .update(update_data)\
        .eq('slug', slug)\
        .execute()
    
    return bool(result.data)
```

---

## Phase 5: Enrichment (Links & Related Content)

### Phase 5a: Internal Links

**Objective**: Add contextual internal links within article content.

**Process**:
1. Analyze article content
2. Identify keywords/phrases that match other articles
3. Insert contextual links naturally
4. Update `internal_links` JSONB field

**Model**: Can use `gpt-5-nano` or simple keyword matching

### Phase 5b: Related Articles

**Objective**: Find 5 related articles based on category, tags, and keywords.

**Process**:
1. Query articles with same category
2. Match tags and keywords
3. Select top 5 most relevant
4. Update `related_articles` UUID array

**No AI needed**: Use database queries and similarity matching

### Phase 5c: External Links

**Objective**: Add relevant external resource links with real URLs.

**AI Model Selection**:

**For web search (finding real URLs):**
- **Use Perplexity AI** (not OpenAI)
- **Model**: `sonar` (basic) or `sonar-pro` (better quality)
- **Cost**: ~$0.001-0.002 per article (or FREE with $20/month Pro plan)
- **Why**: Has real-time internet access, can find actual URLs

**For content generation (no web search needed):**
- **Use `gpt-5-nano`** (cheaper, sufficient for link suggestions)

**Perplexity API Usage**:
```python
import requests

def find_external_links(article_title: str, article_content: str) -> List[Dict]:
    """Find external links using Perplexity AI."""
    response = requests.post(
        'https://api.perplexity.ai/chat/completions',
        headers={
            'Authorization': f'Bearer {PERPLEXITY_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'model': 'sonar',  # or 'sonar-pro' for better quality
            'messages': [
                {
                    'role': 'user',
                    'content': f'Find 3-5 relevant external resources (with URLs) for this article: {article_title}\n\n{article_content[:500]}'
                }
            ]
        }
    )
    
    # Extract URLs from response (Perplexity includes citations)
    # Parse and validate URLs
    # Return list of {title, url, description}
```

**Alternative (if Perplexity not available)**:
- Use `gpt-5-nano` to suggest link topics
- Manually find URLs or use web scraping
- Less reliable but cheaper

---

## Phase 6: Publishing

### Objective
Review and publish articles to production.

### Publishing Process

```python
def publish_articles(article_slugs: List[str]) -> Dict[str, int]:
    """Publish articles to production."""
    stats = {'published': 0, 'errors': 0}
    
    for slug in article_slugs:
        update_data = {
            'published': True,
            'status': 'published',
            'published_at': datetime.now(timezone.utc).isoformat(),
            'is_indexable': True,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.from_('general_articles')\
            .update(update_data)\
            .eq('slug', slug)\
            .execute()
        
        if result.data:
            stats['published'] += 1
        else:
            stats['errors'] += 1
    
    return stats
```

### Pre-Publishing Checklist

- [ ] All articles have content (not NULL)
- [ ] Word count is acceptable (1,000+ words)
- [ ] Grammar check completed
- [ ] Internal/external links added
- [ ] Related articles assigned
- [ ] Meta descriptions and excerpts populated
- [ ] H1 headings present
- [ ] Status is 'draft' or 'links_added'

---

## Critical Technical Considerations

### 1. Encoding & Accent Handling

**ALWAYS use UTF-8 encoding:**

```python
# Reading files
with open('file.csv', 'r', encoding='utf-8') as f:
    ...

# Writing files
with open('file.log', 'w', encoding='utf-8') as f:
    ...

# Database connections
# Supabase Python SDK handles UTF-8 automatically
```

**Slug generation MUST use NFD normalization:**

```python
import unicodedata

slug = unicodedata.normalize('NFD', title)  # CRITICAL
slug = ''.join(c for c in slug if unicodedata.category(c) != 'Mn')
```

### 2. Large Volume Database Operations

**Use Supabase Python SDK (NOT raw SQL files):**

**Why SDK over SQL files:**
- Handles encoding automatically
- Better error handling
- Supports batch operations
- Easier to maintain

**Batch Insert/Update:**

```python
# Good: Batch processing with SDK
batch_size = 20
for i in range(0, len(articles), batch_size):
    batch = articles[i:i+batch_size]
    for article in batch:
        supabase.from_('general_articles').insert(article).execute()
    time.sleep(0.5)  # Rate limiting

# Bad: Individual SQL files (don't do this)
# Creates hundreds of SQL files, encoding issues, hard to maintain
```

**For very large volumes (1000+ articles):**
- Process in batches of 20-50
- Add delays between batches (0.5-1 second)
- Use checkpointing (save progress every N articles)
- Monitor for rate limits

### 3. AI Model Selection Summary

| Task | Model | Reasoning Effort | Verbosity | Cost/Article |
|------|-------|------------------|-----------|--------------|
| Outline Generation | `gpt-5-nano` | minimal | medium | ~$0.0004-0.0007 |
| Content Generation | `gpt-5-nano` | high | medium | ~$0.0013-0.0024 |
| Grammar Check | `gpt-5-nano` | minimal | low | ~$0.0001-0.0002 |
| External Links (web search) | Perplexity `sonar` | N/A | N/A | ~$0.001-0.002 |

**Why `gpt-5-nano`?**
- 33% cheaper than gpt-4o-mini
- Quality sufficient for content generation
- Fast response times
- Supports high reasoning effort for better instruction adherence

**Why Perplexity for external links?**
- Real-time internet access
- Can find actual, accessible URLs
- Includes citations
- Cost-effective ($20/month Pro plan includes $5 credit = FREE for 500+ articles)

### 4. Parameter Settings

**For `gpt-5-nano`:**

```python
# Outline Generation
{
    'max_completion_tokens': 2000,
    'reasoning_effort': 'minimal',  # Speed/cost priority
    'verbosity': 'medium'           # Structured content
}

# Content Generation
{
    'max_completion_tokens': 50000,  # High limit for long articles + reasoning
    'reasoning_effort': 'high',      # Quality priority
    'verbosity': 'medium'            # Balance quality/tokens
}

# Grammar Check
{
    'max_completion_tokens': 500,
    'reasoning_effort': 'minimal',  # Fast check
    'verbosity': 'low',             # Simple corrections
    'response_format': {'type': 'json_object'}  # Structured output
}
```

**Note**: `gpt-5-nano` doesn't support custom `temperature` parameter (uses default 1).

### 5. Prompt Management

**Store prompts in `article_prompts.md`:**

```markdown
# PROMPT TO GENERATE OUTLINE
[Prompt content here]

# PROMPT TO IMPROVE OUTLINE
[Prompt content here]

# PROMPT TO DRAFT THE ARTICLE
[Prompt content here]

# PROMPT TO IMPROVE THE DRAFT ARTICLE
[Prompt content here]
```

**Load prompts programmatically:**

```python
def load_prompt_from_file(prompt_name: str) -> str:
    """Load a specific prompt from article_prompts.md."""
    with open('article_prompts.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract prompt between markers
    start_marker = f"# {prompt_name}"
    # Find and extract...
    return prompt_text
```

**Critical prompt instructions:**
- Avoid geographical references (if not needed)
- Specify word count requirements
- Define tone and style
- Include examples of good/bad content

---

## Error Handling & Recovery

### Common Issues & Solutions

#### 1. Slug Mismatch

**Problem**: Encoding differences cause slug lookups to fail.

**Solution**:
```python
def find_article_by_slug_fuzzy(slug: str) -> Optional[Dict]:
    """Find article using fuzzy matching if exact match fails."""
    # Try exact match first
    result = supabase.from_('general_articles')\
        .select('*')\
        .eq('slug', slug)\
        .execute()
    
    if result.data:
        return result.data[0]
    
    # Try fuzzy match
    all_articles = supabase.from_('general_articles')\
        .select('id, slug')\
        .execute()
    
    closest = find_closest_slug(slug, [a['slug'] for a in all_articles.data])
    if closest:
        return supabase.from_('general_articles')\
            .select('*')\
            .eq('slug', closest)\
            .execute()\
            .data[0]
    
    return None
```

#### 2. API Rate Limits

**Problem**: Too many requests cause rate limit errors.

**Solution**:
- Implement exponential backoff
- Reduce batch size
- Add delays between requests
- Monitor rate limit headers

```python
import time

def api_call_with_retry(func, max_retries=3):
    """Wrapper for API calls with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return func()
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                time.sleep(wait_time)
                continue
            raise
```

#### 3. Empty API Responses

**Problem**: API returns empty content.

**Solution**:
- Retry logic (up to 2-3 attempts)
- Log empty responses for review
- Check `finish_reason` in response
- Increase `max_completion_tokens` if truncated

#### 4. Database Connection Issues

**Problem**: Database connection fails or times out.

**Solution**:
- Retry with exponential backoff
- Save articles to local file as backup
- Resume from last successful article (checkpointing)
- Use connection pooling if available

#### 5. Validation Failures

**Problem**: Generated content doesn't meet validation criteria.

**Solution**:
- Log failed articles to file for review
- Allow manual fixes
- Re-run generation with adjusted prompts
- Consider relaxing validation if too strict

### Checkpointing

**Save progress regularly:**

```python
def save_checkpoint(processed_slugs: List[str], checkpoint_file: str = 'checkpoint.json'):
    """Save progress checkpoint."""
    with open(checkpoint_file, 'w', encoding='utf-8') as f:
        json.dump({
            'processed_slugs': processed_slugs,
            'timestamp': datetime.now().isoformat()
        }, f)

def load_checkpoint(checkpoint_file: str = 'checkpoint.json') -> List[str]:
    """Load progress checkpoint."""
    try:
        with open(checkpoint_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('processed_slugs', [])
    except FileNotFoundError:
        return []
```

---

## Cost Optimization

### Cost Breakdown (Per Article)

| Phase | Cost | Notes |
|-------|------|-------|
| Outline Generation | $0.0004-0.0007 | With improvement step |
| Content Generation | $0.0013-0.0024 | With improvement step |
| Grammar Check | $0.0001-0.0002 | Very cheap |
| External Links | $0.001-0.002 | Perplexity (or FREE with Pro plan) |
| **Total** | **~$0.003-0.005** | Per article |

### For 100 Articles

- **Total Cost**: ~$0.30-0.50
- **With Perplexity Pro Plan**: ~$0.30-0.50 (external links FREE with $5 credit)

### Cost-Saving Tips

1. **Skip improvement step** if quality is acceptable (saves ~50% on outline/content)
2. **Use Perplexity Pro plan** ($20/month) for external links (includes $5 credit = FREE for 500+ articles)
3. **Batch processing** reduces overhead
4. **Monitor token usage** and adjust `max_completion_tokens` if needed
5. **Cache prompts** (don't reload from file every time)

---

## Monitoring & Logging

### Logging Setup

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('process.log', encoding='utf-8'),
        logging.StreamHandler()  # Also log to console
    ]
)
logger = logging.getLogger(__name__)
```

### Log Files

- `outline_generation.log` - Outline generation progress
- `article_generation.log` - Content generation progress
- `quality_control_grammar.log` - Grammar check results
- `upload_articles.log` - Initial upload progress

### Progress Tracking

```python
def log_progress(current: int, total: int, stats: Dict):
    """Log progress with statistics."""
    percentage = (current / total) * 100
    logger.info(f"Progress: {current}/{total} ({percentage:.1f}%)")
    logger.info(f"Success: {stats['success']}, Failed: {stats['failed']}")
    if stats['success'] > 0:
        avg_time = stats['total_time'] / stats['success']
        logger.info(f"Average time per article: {avg_time:.2f}s")
```

### Monitoring Checklist

- [ ] Check log files regularly for errors
- [ ] Monitor API rate limits
- [ ] Track token usage and costs
- [ ] Verify database updates (spot check)
- [ ] Review sample outputs for quality
- [ ] Monitor processing time per article

---

## Complete Workflow Summary

### Step-by-Step Execution

1. **Setup**
   - Create `.env` file with API keys
   - Install Python dependencies
   - Set up database schema

2. **Phase 1: Upload Initial Data**
   ```bash
   python scripts/articles/upload_100_articles.py
   ```
   - Verify slugs generated correctly
   - Check for duplicates

3. **Phase 2: Generate Outlines**
   ```bash
   python scripts/articles/generate_outlines_v2.py
   ```
   - Review 5-10 sample outlines
   - Adjust prompts if needed
   - Verify all outlines generated

4. **Phase 3: Generate Content**
   ```bash
   python scripts/articles/generate_articles_v2.py
   ```
   - Monitor word counts
   - Check for empty responses
   - Review sample articles

5. **Phase 4: Quality Control**
   ```bash
   python scripts/articles/quality_control_grammar.py
   ```
   - Verify corrections made
   - Review changed fields

6. **Phase 5: Add Links**
   ```bash
   python scripts/articles/add_internal_links.py
   python scripts/articles/add_related_articles.py
   python scripts/articles/add_external_links.py
   ```

7. **Phase 6: Publish**
   ```bash
   python scripts/articles/publish_articles.py
   ```

### Estimated Timeline

For 100 articles:
- **Phase 1**: 5-10 minutes
- **Phase 2**: 30-45 minutes (with API delays)
- **Phase 3**: 2-3 hours (with API delays)
- **Phase 4**: 15-20 minutes
- **Phase 5**: 30-45 minutes
- **Phase 6**: 5 minutes

**Total**: ~4-5 hours (mostly waiting for API responses)

---

## Key Takeaways

1. **Always use NFD normalization for slug generation** - Critical for accent handling
2. **Use Supabase Python SDK** - Not raw SQL files for large volumes
3. **Use `gpt-5-nano` for content generation** - Cost-effective and high quality
4. **Use Perplexity AI for external links** - Real web search capability
5. **Implement retry logic** - Handle API failures gracefully
6. **Use checkpointing** - Enable resumption after interruptions
7. **Monitor and log everything** - Essential for debugging
8. **Review samples** - Quality check before proceeding to next phase
9. **Batch processing** - Balance efficiency and error recovery
10. **Always use UTF-8 encoding** - Prevent encoding issues

---

## Troubleshooting Guide

### Issue: Slugs don't match after generation

**Solution**: Use fuzzy matching or regenerate slugs with proper normalization

### Issue: API returns empty content

**Solution**: Increase `max_completion_tokens`, check `finish_reason`, retry

### Issue: Database updates fail

**Solution**: Check slug encoding, use UUID instead of slug for updates, verify connection

### Issue: Cost higher than expected

**Solution**: Review token usage logs, adjust `max_completion_tokens`, skip improvement step if quality acceptable

### Issue: Content quality low

**Solution**: Review prompts, increase `reasoning_effort`, add more specific instructions, review sample outputs

---

## Conclusion

This plan provides a complete, production-ready workflow for reproducing content generation processes. Follow each phase sequentially, review outputs at each stage, and adjust prompts/parameters based on your specific needs.

For questions or issues, refer to the individual script documentation and log files.

