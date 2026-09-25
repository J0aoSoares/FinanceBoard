import { Injectable } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

const HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

const DUMMY_PASSWORD = 'financeboard-dummy-password-for-timing';

@Injectable()
export class PasswordService {
  private dummyHash: string | null = null;

  async hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, HASH_OPTIONS);
  }

  async verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    try {
      return await verify(passwordHash, plainPassword, HASH_OPTIONS);
    } catch {
      return false;
    }
  }

  async burnTime(): Promise<void> {
    if (!this.dummyHash) {
      this.dummyHash = await this.hash(DUMMY_PASSWORD);
    }
    await this.verify(this.dummyHash, DUMMY_PASSWORD);
  }
}
