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

-- 4. Función de búsqueda por similitud
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

-- 5. Crear bucket de storage para documentos
-- (Esto se hace desde el dashboard de Supabase > Storage > New bucket)
-- Nombre: documentos
-- Public: false

-- 6. Política RLS (Row Level Security) - permitir lectura pública por ahora
alter table document_chunks enable row level security;

create policy "Allow public read" on document_chunks
  for select using (true);

create policy "Allow public insert" on document_chunks
  for insert with check (true);
