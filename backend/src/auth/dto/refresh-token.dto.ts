import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token deve ser um texto' })
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refreshToken!: string;
}
