import { IsNotEmpty, IsString, IsEnum, IsPositive, IsInt, ValidateIf } from 'class-validator';
import { AccountType, Strategy } from './meta';

export class DelayedInvestDto {
  @IsNotEmpty()
  token: string;

  @ValidateIf(o => !o.dealId)
  @IsString()
  pair?: string;

  @ValidateIf(o => !o.dealId)
  @IsEnum(AccountType)
  account?: AccountType;

  @ValidateIf(o => !o.dealId)
  @IsEnum(Strategy)
  strategy?: Strategy;

  @ValidateIf(o => !o.pair && !o.account && !o.strategy)
  @IsInt()
  @IsPositive()
  dealId?: number;

  @IsNotEmpty()
  @IsPositive()
  amount: number;
}
