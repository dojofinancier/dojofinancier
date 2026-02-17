-- Schema for knowledge base tables on target (run before data copy)
-- Requires: CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS syllabus_elements (
  element_id text NOT NULL PRIMARY KEY,
  section_id text NOT NULL,
  section_title text,
  title text NOT NULL,
  description text,
  cognitive_level text,
  sub_points jsonb,
  keywords_fr text[],
  keywords_en text[],
  exam_weight integer,
  status text DEFAULT 'todo',
  coverage_score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  language text DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS sources (
  source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_url text NOT NULL UNIQUE,
  domain text,
  title text,
  tier text,
  source_type text,
  language text DEFAULT 'en',
  reliability_score integer,
  status text DEFAULT 'pending',
  first_seen_at timestamptz DEFAULT now(),
  last_fetched_at timestamptz
);

CREATE TABLE IF NOT EXISTS documents (
  document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES sources(source_id),
  version integer DEFAULT 1,
  content_hash text NOT NULL,
  raw_path text,
  extracted_text text,
  extracted_text_path text,
  text_length integer,
  content_type text,
  http_status integer,
  retrieved_at timestamptz DEFAULT now(),
  language text DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS primary_store_notes (
  note_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id text REFERENCES syllabus_elements(element_id),
  content_md text NOT NULL,
  metadata jsonb,
  version integer DEFAULT 1,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  language text DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS search_queries (
  query_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id text REFERENCES syllabus_elements(element_id),
  query text NOT NULL,
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_num integer NOT NULL,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamp DEFAULT now(),
  course varchar(50) NOT NULL,
  language text DEFAULT 'en',
  UNIQUE(course, module_num, chunk_index)
);

CREATE TABLE IF NOT EXISTS csc_chunks (
  chunk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course text DEFAULT 'csc',
  source_file text,
  chunk_text text,
  embedding vector(1536),
  token_count integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  language text DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS primary_store_chunks (
  chunk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_text text NOT NULL,
  chunk_index integer NOT NULL,
  embedding vector(1536),
  token_count integer,
  section_path text,
  document_id text,
  content_hash text,
  source_type text,
  http_status integer,
  retrieved_at timestamptz,
  version integer DEFAULT 1,
  source_id text NOT NULL,
  canonical_url text NOT NULL,
  final_url text,
  title text,
  tier text,
  reliability_score numeric(5,2),
  language text DEFAULT 'en',
  status text,
  course text NOT NULL DEFAULT 'erci',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source_id, content_hash, chunk_index)
);

CREATE TABLE IF NOT EXISTS chunk_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL,
  element_id text NOT NULL REFERENCES syllabus_elements(element_id),
  relevance_score numeric(5,2),
  discovered_via text,
  discovered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  language text DEFAULT 'en',
  UNIQUE(chunk_id, element_id)
);

CREATE TABLE IF NOT EXISTS element_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id text REFERENCES syllabus_elements(element_id),
  source_id uuid REFERENCES sources(source_id),
  coverage_score integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  language text DEFAULT 'en',
  UNIQUE(element_id, source_id)
);

CREATE TABLE IF NOT EXISTS note_sections (
  section_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id text NOT NULL REFERENCES syllabus_elements(element_id),
  note_id uuid REFERENCES primary_store_notes(note_id),
  section_header text NOT NULL,
  section_content text NOT NULL,
  section_index integer NOT NULL,
  section_level integer NOT NULL,
  section_path text,
  embedding vector(1536),
  token_count integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  language text DEFAULT 'en',
  UNIQUE(element_id, section_index)
);

CREATE TABLE IF NOT EXISTS source_candidates (
  candidate_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id text REFERENCES syllabus_elements(element_id),
  query_id uuid REFERENCES search_queries(query_id),
  url text NOT NULL,
  title text,
  snippet text,
  rank integer,
  priority text,
  found_at timestamptz DEFAULT now(),
  provider text DEFAULT 'perplexity',
  query text,
  component_scores jsonb,
  reliability_score numeric(5,2),
  tier text,
  status text DEFAULT 'pending',
  scored_at timestamptz,
  language text DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS volatile_facts (
  fact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id text REFERENCES syllabus_elements(element_id),
  note_id uuid,
  fact_text text NOT NULL,
  fact_context text,
  source_url text,
  source_tier text,
  retrieved_at timestamptz,
  next_review_at timestamptz,
  review_frequency text DEFAULT 'quarterly',
  status text DEFAULT 'active',
  reviewed_at timestamptz,
  review_notes text,
  language text DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE,
  question_number integer,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  embedding vector(1536),
  source varchar(100) DEFAULT 'erci_practice_exam',
  created_at timestamp DEFAULT now(),
  language text DEFAULT 'en'
);
