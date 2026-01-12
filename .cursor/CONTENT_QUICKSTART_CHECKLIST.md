# Quick Start Checklist

A companion guide to `CONTENT_GENERATION_REPRODUCTION_PLAN.md` - use this for quick reference during execution.

## Pre-Flight Checklist

- [ ] `.env` file created with all required API keys
- [ ] Python dependencies installed (`pip install openai supabase python-dotenv`)
- [ ] Database schema created (`general_articles` table)
- [ ] CSV file prepared with `title,category` columns
- [ ] Log directory created (`scripts/articles/logs/`)

## Phase 1: Initial Upload

**Script**: `upload_100_articles.py`

- [ ] CSV file exists and is UTF-8 encoded
- [ ] Verify slug generation function uses NFD normalization
- [ ] Run upload script
- [ ] Check for duplicate slugs: `SELECT slug, COUNT(*) FROM general_articles GROUP BY slug HAVING COUNT(*) > 1;`
- [ ] Verify all articles have `status='draft_outline'`
- [ ] Spot-check slugs with accents (e.g., "é", "à", "ç")

**Common Issues**:
- ❌ Slugs with accents not normalized → Check `generate_slug()` function
- ❌ Encoding errors → Ensure CSV is UTF-8
- ❌ Duplicate slugs → Resolve conflicts manually

## Phase 2: Outline Generation

**Script**: `generate_outlines_v2.py`

- [ ] Verify `article_prompts.md` exists with outline prompts
- [ ] Check OpenAI API key is valid
- [ ] Run outline generation script
- [ ] Review 5-10 sample outlines manually
- [ ] Verify structure: 1 H1, 8-12 H2, required sections present
- [ ] Check all articles moved to `status='draft'`

**Quality Checks**:
- ✅ Outlines are specific (not generic)
- ✅ Required sections present: "Erreurs fréquentes", "Astuces de tuteur", "Mini-checklist"
- ✅ H3 subsections have explanatory sentences
- ✅ No geographical references (if not needed)

**If Issues**:
- Adjust prompts in `article_prompts.md`
- Re-run script (it will skip already-generated outlines)

## Phase 3: Content Generation

**Script**: `generate_articles_v2.py`

- [ ] Verify all articles have `draft_outline` populated
- [ ] Check OpenAI API key and rate limits
- [ ] Run content generation script (this takes 2-3 hours for 100 articles)
- [ ] Monitor log file for errors
- [ ] Review sample articles for quality
- [ ] Verify word counts (should be 1,000-2,000+ words)

**Quality Checks**:
- ✅ Word count acceptable (1,000+ words)
- ✅ H1 heading present
- ✅ H2 sections present (at least 3)
- ✅ No geographical references (if rule applied)
- ✅ Tone is conversational ("tu" form)
- ✅ Content is practical and specific

**If Issues**:
- Empty responses → Check `max_completion_tokens`, retry
- Low word count → Adjust prompt to emphasize length
- Quality issues → Review prompts, increase `reasoning_effort`

## Phase 4: Quality Control

**Script**: `quality_control_grammar.py`

- [ ] Run grammar check script
- [ ] Review corrections made
- [ ] Verify common errors fixed: "en la/le" → "en", "de le" → "du"

**Common Corrections**:
- "Optimiser sa réussite en la lecture" → "Optimiser sa réussite en lecture"
- "Secrets pour réussir en le marketing" → "Secrets pour réussir en marketing"
- "Approche pratique de le sommeil" → "Approche pratique du sommeil"

## Phase 5: Enrichment

### 5a: Internal Links

**Script**: `add_internal_links.py`

- [ ] Run script
- [ ] Verify `internal_links` JSONB field populated
- [ ] Spot-check links are contextual and relevant

### 5b: Related Articles

**Script**: `add_related_articles.py`

- [ ] Run script
- [ ] Verify `related_articles` UUID array has 5 articles
- [ ] Check related articles are actually related (same category/tags)

### 5c: External Links

**Script**: `add_external_links.py`

- [ ] Set up Perplexity API key (recommended) or use alternative
- [ ] Run script
- [ ] Verify `external_links` JSONB field populated
- [ ] Test URLs are accessible (not broken)

**Perplexity Setup**:
1. Sign up for Perplexity Pro ($20/month) at https://www.perplexity.ai/
2. Get API key from Settings > API Keys
3. Add `PERPLEXITY_API_KEY` to `.env`
4. Run script

## Phase 6: Publishing

**Script**: `publish_articles.py`

- [ ] Review articles ready for publishing
- [ ] Verify all required fields populated:
  - [ ] Content
  - [ ] H1
  - [ ] Meta description
  - [ ] Excerpt
  - [ ] Tags/keywords (optional)
- [ ] Run publish script
- [ ] Verify articles have `published=true` and `status='published'`
- [ ] Check `published_at` timestamp set

## Critical Technical Checks

### Encoding & Slugs

- [ ] All file operations use `encoding='utf-8'`
- [ ] Slug generation uses `unicodedata.normalize('NFD', ...)`
- [ ] Database connections handle UTF-8 correctly

### AI Model Parameters

- [ ] Outline generation: `reasoning_effort="minimal"`, `verbosity="medium"`
- [ ] Content generation: `reasoning_effort="high"`, `verbosity="medium"`
- [ ] Grammar check: `reasoning_effort="minimal"`, `verbosity="low"`, `response_format={"type": "json_object"}`

### Database Operations

- [ ] Using Supabase Python SDK (not raw SQL files)
- [ ] Batch processing (20-50 articles per batch)
- [ ] Rate limiting (delays between batches)
- [ ] Error handling (continue on individual failures)

## Cost Monitoring

**Expected Costs (per 100 articles)**:
- Outline generation: ~$0.04-0.07
- Content generation: ~$0.13-0.24
- Grammar check: ~$0.01-0.02
- External links: ~$0.10-0.20 (or FREE with Perplexity Pro)
- **Total**: ~$0.30-0.50

**Monitor**:
- Check OpenAI usage dashboard
- Review token usage in logs
- Track Perplexity API usage

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Slug mismatch | Use fuzzy matching or regenerate with NFD normalization |
| Empty API response | Increase `max_completion_tokens`, retry |
| Rate limit error | Add delays, reduce batch size, implement exponential backoff |
| Encoding error | Ensure UTF-8 encoding everywhere |
| Low word count | Adjust prompt to emphasize length requirement |
| Quality issues | Review prompts, increase `reasoning_effort` |
| Database timeout | Use smaller batches, add retry logic |

## Success Criteria

After completing all phases:

- [ ] All articles have content (not NULL)
- [ ] Word counts are acceptable (1,000+ words)
- [ ] Grammar check completed
- [ ] Internal/external links added
- [ ] Related articles assigned
- [ ] All articles published (`published=true`)
- [ ] No duplicate slugs
- [ ] All slugs properly normalized (no accent issues)
- [ ] Log files show no critical errors

## Next Steps After Publishing

1. Generate sitemap
2. Submit to search engines
3. Monitor analytics
4. Collect feedback
5. Iterate on prompts based on results

---

**Remember**: Always review sample outputs at each phase before proceeding to the next phase. Quality > Speed.

