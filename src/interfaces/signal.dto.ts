import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export enum SignalAccount {
  BINANCE_SPOT = 'binance_spot',
  BINANCE_FUTURES = 'binance_futures',
}

export enum SignalStrategy {
  LONG = 'long',
  SHORT = 'short',
}

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

  @IsString()
  @IsNotEmpty()
  pair: string;

  @IsString()
  @IsNotEmpty()
  price: string;

  @IsEnum(SignalAccount)
  @IsNotEmpty()
  account: SignalAccount;

  @IsEnum(SignalStrategy)
  @IsNotEmpty()
  strategy: SignalStrategy;

  @IsDateString()
  @IsNotEmpty()
  @Validate(SignalOutdatedConstraint)
  time: string;
}
