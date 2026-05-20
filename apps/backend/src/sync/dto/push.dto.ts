import { IsArray, IsIn, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncItemDto {
  @IsString()
  entidade: string;

  @IsString()
  entidade_id: string;

  @IsString()
  @IsIn(['create', 'update', 'delete'])
  operacao: 'create' | 'update' | 'delete';

  @IsObject()
  payload: Record<string, any>;
}

export class PushDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncItemDto)
  operacoes: SyncItemDto[];
}
