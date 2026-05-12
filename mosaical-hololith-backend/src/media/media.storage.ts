import { Buffer } from 'node:buffer';

export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');

export type MediaStorageWriteParams = {
  objectKey: string;
  body: Buffer;
};

export type MediaStorageReadResult = {
  body: Buffer;
};

export abstract class MediaStorage {
  abstract writeObject(params: MediaStorageWriteParams): Promise<void>;
  abstract readObject(objectKey: string): Promise<MediaStorageReadResult>;
  abstract deleteObject(objectKey: string): Promise<void>;
}
