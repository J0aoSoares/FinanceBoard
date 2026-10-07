import { IsNotEmpty, IsString } from 'class-validator';

export class ListRetainageReleasesQueryDto {
  @IsString({ message: 'Obra deve ser um identificador válido' })
  @IsNotEmpty({ message: 'Obra é obrigatória' })
  projectId!: string;
}
