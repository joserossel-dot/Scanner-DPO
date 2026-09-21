-- Vincula la declaración de "firmado" de una transferencia internacional con
-- el documento SCC/DPA realmente generado por la plataforma. Sin esto,
-- has_signed_scc / signature_status era una declaración libre del usuario,
-- sin ninguna evidencia de que el documento oficial se haya generado.
ALTER TABLE international_transfers
  ADD COLUMN IF NOT EXISTS signed_document_id UUID REFERENCES document_downloads(id) ON DELETE SET NULL;
