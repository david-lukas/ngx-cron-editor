import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'monthDayDisplay',
  standalone: false
})
export class MonthDayDisplayPipe implements PipeTransform {
  constructor(private translateService: TranslateService) {}

  transform(month: string): string {
    if (month === 'L') {
      return this.translateService.instant('cronEditor.lbl.lastDay');
    }
    return month;
  }
}
