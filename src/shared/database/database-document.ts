export interface DatabaseDocument {
  _id?: string;
  _rev?: string;
  _deleted?: boolean;
  _conflicts?: string[];
}
