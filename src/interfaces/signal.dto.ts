import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AccountType, Strategy } from './meta';

export const OUTDATED_SIGNAL_AGE = 5 * 60 * 1000; // 5 min

@ValidatorConstraint({ async: false })
export class SignalOutdatedConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    const currentTime = new Date().getTime();
    const signalTime = new Date(value).getTime();

    return currentTime >= signalTime && currentTime - OUTDATED_SIGNAL_AGE <= signalTime;
  }

  defaultMessage() {
    return 'Signal $property is outdated';
  }
}

export class SignalDto {
  @IsNotEmpty()
  token: string;

  @IsNotEmpty()
  @IsString()
  pair: string;

  @IsNotEmpty()
  @IsString()
  price: string;

  @IsNotEmpty()
  @IsEnum(AccountType)
  account: AccountType;

  @IsNotEmpty()
  @IsEnum(Strategy)
  strategy: Strategy;

  @IsDateString()
  @IsNotEmpty()
  @Validate(SignalOutdatedConstraint)
  time: string;
}
