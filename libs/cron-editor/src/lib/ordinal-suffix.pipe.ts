import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Useful for english translations of month days only
 */

@Pipe({
  name: 'ordinalSuffix',
  standalone: false
})
export class OrdinalSuffixPipe implements PipeTransform {
  constructor(private translateService: TranslateService) {}

  transform(value: string, language: string): string {
    if (language === 'en') {
      if (value.length > 1) {
        const secondToLastDigit = value.charAt(value.length - 2);
        if (secondToLastDigit === '1') {
          return `${value}th`;
        }
        if (value.length > 2) {
          return value;
        }
      }

      const lastDigit = value.charAt(value.length - 1);
      switch (lastDigit) {
        case '1':
          return `${value}st`;
        case '2':
          return `${value}nd`;
        case '3':
          return `${value}rd`;
        default:
          return `${value}th`;
      }
    }
    return value;
  }
}
