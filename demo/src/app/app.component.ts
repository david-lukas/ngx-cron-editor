import { Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CronOptions } from '@david-lukas/ngx-cron-editor';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  public cronValue = '0 0 1/1 * *';

  public cronOptions: CronOptions = {
    hideMinutesTab: false,
    hideHourlyTab: false,
    hideDailyTab: false,
    hideWeeklyTab: false,
    hideMonthlyTab: false,
    hideYearlyTab: false,
    hideAdvancedTab: false,
    hideSpecificWeekDayTab: false,
    hideSpecificMonthWeekTab: false,
    use24HourTime: true,
    hideSeconds: false,
    cronFlavor: 'standard'
  };

  cronFlavorFC: UntypedFormControl;

  languageFC: UntypedFormControl;

  availableLanguages = ['en', 'it'];

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.translate.addLangs(this.availableLanguages);
    this.translate.use('en');
    this.cronFlavorFC = new UntypedFormControl(this.cronOptions.cronFlavor);
    this.languageFC = new UntypedFormControl(this.translate.currentLang);
  }

  seeCron(ev: string): void {
    this.cronValue = ev;
  }

  cronFlavorChange(event: any): void {
    this.cronOptions.cronFlavor = event.value;
  }

  changeLanguage(event: any): void {
    this.translate.use(event.value);
  }
}
