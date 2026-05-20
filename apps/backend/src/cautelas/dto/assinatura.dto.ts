import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssinaturaDto {
  @IsString()
  @IsNotEmpty()
  assinatura_imagem: string;

  @IsString()
  @IsNotEmpty()
  assinatura_nome: string;

  @IsString()
  @IsOptional()
  assinatura_cargo?: string;
}
