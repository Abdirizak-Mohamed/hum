export interface StorageClient {
  save(clientId: string, contentId: string, data: Buffer, ext: string): Promise<string>;
  getUrl(path: string): string;
  delete(path: string): Promise<void>;
}
