-- Adds a unique constraint to ensure each knowledge_web_sources row has a unique URL.
alter table knowledge_web_sources
  add constraint knowledge_web_sources_url_key unique (url);
