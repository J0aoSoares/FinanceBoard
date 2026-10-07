import { request } from '../lib/http';
import type { Bank } from './types';

export const listBanks = () => request<Bank[]>('/banks');
