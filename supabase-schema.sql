-- Ejecuta este SQL en tu proyecto de Supabase (SQL Editor)
-- 1. Habilitar la extensión pgvector
create extension if not exists vector;

-- 2. Crear la tabla de chunks de documentos
create table document_chunks (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  embedding vector(384),
  source_filename text not null,
  chunk_index integer not null,
  storage_path text,
  created_at timestamptz default now()
);

-- 3. Crear índice para búsqueda vectorial
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. Función de búsqueda por similitud (vector - requiere embeddings)
create or replace function search_documents(
  query_embedding text,
  match_count int default 10,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  content text,
  source_filename text,
  chunk_index integer,
  similarity float
)
language plpgsql
as $$
begin
  return query
    select
      dc.id,
      dc.content,
      dc.source_filename,
      dc.chunk_index,
      1 - (dc.embedding <=> query_embedding::vector) as similarity
    from document_chunks dc
    where 1 - (dc.embedding <=> query_embedding::vector) > match_threshold
    order by dc.embedding <=> query_embedding::vector
    limit match_count;
end;
$$;

-- 4b. Función de búsqueda por texto completo (no requiere embeddings)
-- EJECUTAR EN SUPABASE SQL EDITOR:
create or replace function search_documents_text(
  search_query text,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  source_filename text,
  chunk_index integer,
  rank real
)
language plpgsql
as $$
begin
  return query
    select
      dc.id,
      dc.content,
      dc.source_filename,
      dc.chunk_index,
      ts_rank(
        to_tsvector('spanish', dc.content),
        to_tsquery('spanish', search_query)
      ) as rank
    from document_chunks dc
    where to_tsvector('spanish', dc.content) @@ to_tsquery('spanish', search_query)
    order by rank desc
    limit match_count;
end;
$$;

-- 4c. Índice GIN para búsqueda de texto (acelera las búsquedas)
create index if not exists idx_document_chunks_fts
  on document_chunks
  using gin (to_tsvector('spanish', content));

-- 5. Tabla de tesis guardadas del SJF
create table tesis_guardadas (
  id uuid default gen_random_uuid() primary key,
  registro text unique,
  epoca text,
  instancia text,
  tipo text,
  rubro text not null,
  texto text not null,
  embedding vector(384),
  fuente text default 'SJF-SCJN',
  created_at timestamptz default now()
);

-- 6. Índice vectorial para tesis
create index on tesis_guardadas using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 7. Función de búsqueda semántica sobre tesis guardadas
create or replace function search_tesis(
  query_embedding text,
  match_count int default 10,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  registro text,
  epoca text,
  instancia text,
  tipo text,
  rubro text,
  texto text,
  fuente text,
  similarity float
)
language plpgsql
as $$
begin
  return query
    select
      tg.id,
      tg.registro,
      tg.epoca,
      tg.instancia,
      tg.tipo,
      tg.rubro,
      tg.texto,
      tg.fuente,
      1 - (tg.embedding <=> query_embedding::vector) as similarity
    from tesis_guardadas tg
    where 1 - (tg.embedding <=> query_embedding::vector) > match_threshold
    order by tg.embedding <=> query_embedding::vector
    limit match_count;
end;
$$;

-- 8. Crear bucket de storage para documentos
-- (Esto se hace desde el dashboard de Supabase > Storage > New bucket)
-- Nombre: documentos
-- Public: false

-- 9. Políticas RLS
alter table document_chunks enable row level security;
alter table tesis_guardadas enable row level security;

create policy "Allow public read" on document_chunks
  for select using (true);

create policy "Allow public insert" on document_chunks
  for insert with check (true);

create policy "Allow public read tesis" on tesis_guardadas
  for select using (true);

create policy "Allow public insert tesis" on tesis_guardadas
  for insert with check (true);
