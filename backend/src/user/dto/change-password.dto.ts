import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import {
  PASSWORD_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../../auth/password-policy';

export class ChangePasswordDto {
  @IsString({ message: 'Senha atual deve ser um texto' })
  @IsNotEmpty({ message: 'Senha atual é obrigatória' })
  currentPassword!: string;

  @IsString({ message: 'Nova senha deve ser um texto' })
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
