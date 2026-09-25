import { SetMetadata } from '@nestjs/common';

export const SELF_SERVICE_KEY = 'auth:selfService';

export const SelfService = () => SetMetadata(SELF_SERVICE_KEY, true);
