import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../shared/env';
import {
  MediaStorage,
  MediaStorageReadResult,
  MediaStorageWriteParams,
} from './media.storage';

@Injectable()
export class LocalMediaStorageService extends MediaStorage {
  private readonly rootDir = path.resolve(process.cwd(), env.MEDIA_LOCAL_DIR);

  private resolveObjectPath(objectKey: string) {
    return path.join(this.rootDir, objectKey);
  }

  async writeObject(params: MediaStorageWriteParams): Promise<void> {
    const objectPath = this.resolveObjectPath(params.objectKey);
    await fs.mkdir(path.dirname(objectPath), { recursive: true });
    await fs.writeFile(objectPath, params.body);
  }

  async readObject(objectKey: string): Promise<MediaStorageReadResult> {
    const objectPath = this.resolveObjectPath(objectKey);
    const body = await fs.readFile(objectPath);
    return { body };
  }

  async deleteObject(objectKey: string): Promise<void> {
    const objectPath = this.resolveObjectPath(objectKey);
    await fs.rm(objectPath, { force: true });
  }
}
