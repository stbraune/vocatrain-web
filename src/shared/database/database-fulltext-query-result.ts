export interface DatabaseFulltextQueryResult<TEntity> {
  current?: boolean;
  doc_count?: number;
  digest?: string;
  disk_size?: number;
  doc_del_count?: number;
  fields?: string[];
  ref_count?: number;
  uuid?: string;
  version?: number;
  q?: string;
  fetch_duration?: number;
  total_rows?: number;
  limit?: number;
  search_duration?: number;
  etag?: string;
  skip?: number;
  rows?: {
    score: number,
    doc?: TEntity,
    id: string
  }[];
}
