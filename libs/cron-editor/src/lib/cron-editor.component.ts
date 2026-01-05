/* eslint-disable class-methods-use-this */
import {
  Component,
  Input,
  Output,
  OnInit,
  EventEmitter,
  forwardRef,
  OnDestroy
} from '@angular/core';
import { CronOptions } from './cron-options';
import { MonthWeeks, Tabs, Months } from './enums';
import { ControlValueAccessor, UntypedFormBuilder, UntypedFormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

/**
 * build the cron from this form.
 * <app-cron-editor 
    [options]="cronOptions"
    [cronStartingValue]="cronValue"
    (cronChange)="seeCron($event)">
   </app-cron-editor>
 */

export const CRON_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  // eslint-disable-next-line no-use-before-define
  useExisting: forwardRef(() => CronEditorComponent),
  multi: true
};

@Component({
  selector: 'app-cron-editor',
  templateUrl: './cron-editor.template.html',
  styleUrls: ['./cron-editor.component.css'],
  providers: [CRON_VALUE_ACCESSOR]
})
export class CronEditorComponent implements OnInit, ControlValueAccessor, OnDestroy {
  @Input() public options: CronOptions;

  @Input() cronStartingValue: string;

  @Output() cronChange = new EventEmitter<string>();

  /** what initial tab to show the cron on */
  public activeTab;

  /** build the options of the cron form */
  public selectOptions = this.getSelectOptions();

  public state: any;

  private isDirty: boolean;

  readonly MonthWeeks = MonthWeeks;

  readonly Months = Months;

  minutesForm: UntypedFormGroup;

  hourlyForm: UntypedFormGroup;

  dailyForm: UntypedFormGroup;

  weeklyForm: UntypedFormGroup;

  monthlyForm: UntypedFormGroup;

  yearlyForm: UntypedFormGroup;

  advancedForm: UntypedFormGroup;

  currentLanguage = 'en';

  /** it varies due to the option JSON */
  tabList: string[] = [];

  unsub$ = new Subject<void>();

  /** get the value from the input value and use it around the component */
  get cron(): string {
    return this.cronStartingValue;
  }

  /** set the cron around this component */
  set cron(value: string) {
    this.onChange(value);
    this.cronChange.emit(value);
  }

  get isCronFlavorQuartz(): boolean {
    return this.options.cronFlavor === 'quartz';
  }

  get isCronFlavorStandard(): boolean {
    return this.options.cronFlavor === 'standard';
  }

  get yearDefaultChar(): string {
    return this.options.cronFlavor === 'quartz' ? '*' : '';
  }

  get weekDayDefaultChar(): string {
    return this.options.cronFlavor === 'quartz' ? '?' : '*';
  }

  get monthDayDefaultChar(): string {
    return this.options.cronFlavor === 'quartz' ? '?' : '*';
  }

  get dailyEveryDaysGroup(): UntypedFormGroup {
    return this.dailyForm.get('everyDays') as UntypedFormGroup;
  }

  get dailyEveryWeekDayGroup(): UntypedFormGroup {
    return this.dailyForm.get('everyWeekDay') as UntypedFormGroup;
  }

  get monthlySpecificDayGroup(): UntypedFormGroup {
    return this.monthlyForm.get('specificDay') as UntypedFormGroup;
  }

  get monthlySpecificWeekDayGroup(): UntypedFormGroup {
    return this.monthlyForm.get('specificWeekDay') as UntypedFormGroup;
  }

  get yearlySpecificMonthDayGroup(): UntypedFormGroup {
    return this.yearlyForm.get('specificMonthDay') as UntypedFormGroup;
  }

  get yearlySpecificMonthWeekGroup(): UntypedFormGroup {
    return this.yearlyForm.get('specificMonthWeek') as UntypedFormGroup;
  }

  constructor(private fb: UntypedFormBuilder, private translateService: TranslateService) {}

  public ngOnInit(): void {
    this.currentLanguage = this.translateService.currentLang;

    // start with initial values of the whole form
    this.state = this.getInitialState();

    // tab list with the tabs passed in the options
    this.createTabList();

    // populate the state with cron passed in input
    this.handleModelChange(this.cron);

    // use the state created above for the form groups of different tabs
    if (!this.options.hideMinutesTab) {
      this.minutesForm = this.fb.group(this.state.minutes);
      this.minutesForm.valueChanges.subscribe((value) => this.computeMinutesCron(value));
    }

    if (!this.options.hideHourlyTab) {
      this.hourlyForm = this.fb.group(this.state.hourly);
      this.hourlyForm.valueChanges.subscribe((value) => this.computeHourlyCron(value));
    }

    if (!this.options.hideDailyTab) {
      this.dailyForm = this.fb.group({
        subTab: this.state.daily.subTab,
        everyDays: this.fb.group(this.state.daily.everyDays),
        everyWeekDay: this.fb.group(this.state.daily.everyWeekDay)
      });
      this.dailyForm.valueChanges.subscribe((value) => this.computeDailyCron(value));
    }

    if (!this.options.hideWeeklyTab) {
      this.weeklyForm = this.fb.group(this.state.weekly);
      this.weeklyForm.valueChanges.subscribe((next) => this.computeWeeklyCron(next));
    }

    if (!this.options.hideMonthlyTab) {
      this.monthlyForm = this.fb.group({
        subTab: this.state.monthly.subTab,
        specificDay: this.fb.group(this.state.monthly.specificDay),
        specificWeekDay: this.fb.group(this.state.monthly.specificWeekDay)
      });
      this.monthlyForm.valueChanges.subscribe((next) => this.computeMonthlyCron(next));
    }

    if (!this.options.hideYearlyTab) {
      this.yearlyForm = this.fb.group({
        subTab: this.state.yearly.subTab,
        specificMonthDay: this.fb.group(this.state.yearly.specificMonthDay),
        specificMonthWeek: this.fb.group(this.state.yearly.specificMonthWeek)
      });
      this.yearlyForm.valueChanges.subscribe((next) => this.computeYearlyCron(next));
    }

    if (!this.options.hideAdvancedTab) {
      this.advancedForm = this.fb.group({
        expression: [this.isCronFlavorQuartz ? this.cron : '15 10 2 * *']
      });
      this.advancedForm.controls.expression.valueChanges.subscribe((next) =>
        this.computeAdvancedExpression(next)
      );
    }

    // translate observable that emits on language changed
    this.translateService.onLangChange
      .pipe(takeUntil(this.unsub$))
      .subscribe((translate: { lang: string; translations: any }) => {
        this.currentLanguage = translate.lang;
      });
  }

  /**
   * Based on the hide... options create the list of tabs
   */
  private createTabList(): void {
    if (!this.options.hideMinutesTab) {
      this.tabList.push(Tabs.minutes);
    }
    if (!this.options.hideHourlyTab) {
      this.tabList.push(Tabs.hourly);
    }
    if (!this.options.hideDailyTab) {
      this.tabList.push(Tabs.daily);
    }
    if (!this.options.hideWeeklyTab) {
      this.tabList.push(Tabs.weekly);
    }
    if (!this.options.hideMonthlyTab) {
      this.tabList.push(Tabs.monthly);
    }
    if (!this.options.hideYearlyTab) {
      this.tabList.push(Tabs.yearly);
    }
    if (!this.options.hideAdvancedTab) {
      this.tabList.push(Tabs.advanced);
    }
  }

  private computeMinutesCron(state: any) {
    this.cron = `${this.isCronFlavorQuartz ? state.seconds : ''} 0/${state.minutes} * * * ${
      this.weekDayDefaultChar
    } ${this.yearDefaultChar}`.trim();
  }

  private computeHourlyCron(state: any) {
    this.cron = `${this.isCronFlavorQuartz ? state.seconds : ''} ${state.minutes} 0/${
      state.hours
    } * * ${this.weekDayDefaultChar} ${this.yearDefaultChar}`.trim();
  }

  private computeDailyCron(state: any) {
    switch (state.subTab) {
      case 'everyDays':
        this.cron = `${this.isCronFlavorQuartz ? state.everyDays.seconds : ''} ${
          state.everyDays.minutes
        } ${this.hourToCron(state.everyDays.hours, state.everyDays.hourType)} ${
          state.everyDays.from
        }/${state.everyDays.days} * ${this.weekDayDefaultChar} ${this.yearDefaultChar}`.trim();
        break;
      case 'everyWeekDay':
        this.cron = `${this.isCronFlavorQuartz ? state.everyWeekDay.seconds : ''} ${
          state.everyWeekDay.minutes
        } ${this.hourToCron(state.everyWeekDay.hours, state.everyWeekDay.hourType)} ${
          this.monthDayDefaultChar
        } * MON-FRI ${this.yearDefaultChar}`.trim();
        break;
      default:
        throw new Error('Invalid cron daily subtab selection');
    }
  }

  private computeWeeklyCron(state: any) {
    const days = this.selectOptions.days
      .reduce((acc, day) => (state[day] ? acc.concat([day]) : acc), [])
      .join(',');
    this.cron = `${this.isCronFlavorQuartz ? state.seconds : ''} ${state.minutes} ${this.hourToCron(
      state.hours,
      state.hourType
    )} ${this.monthDayDefaultChar} * ${days} ${this.yearDefaultChar}`.trim();
  }

  private computeMonthlyCron(state: any) {
    switch (state.subTab) {
      case 'specificDay':
        this.cron = `${this.isCronFlavorQuartz ? state.specificDay.seconds : ''} ${
          state.specificDay.minutes
        } ${this.hourToCron(state.specificDay.hours, state.specificDay.hourType)} ${
          state.specificDay.day
        } 1/${state.specificDay.months} ${this.weekDayDefaultChar} ${this.yearDefaultChar}`.trim();
        break;
      case 'specificWeekDay':
        this.cron = `${this.isCronFlavorQuartz ? state.specificWeekDay.seconds : ''} ${
          state.specificWeekDay.minutes
        } ${this.hourToCron(state.specificWeekDay.hours, state.specificWeekDay.hourType)} ${
          this.monthDayDefaultChar
        } 1/${state.specificWeekDay.months} ${
          this.getSelectOptions().days.indexOf(state.specificWeekDay.day) + 1
        }${state.specificWeekDay.monthWeek} ${this.yearDefaultChar}`.trim();
        break;
      default:
        throw new Error('Invalid cron montly subtab selection');
    }
  }

  private computeYearlyCron(state: any) {
    switch (state.subTab) {
      case 'specificMonthDay':
        this.cron = `${this.isCronFlavorQuartz ? state.specificMonthDay.seconds : ''} ${
          state.specificMonthDay.minutes
        } ${this.hourToCron(state.specificMonthDay.hours, state.specificMonthDay.hourType)} ${
          state.specificMonthDay.day
        } ${state.specificMonthDay.month} ${this.weekDayDefaultChar} ${
          this.yearDefaultChar
        }`.trim();
        break;
      case 'specificMonthWeek':
        this.cron = `${this.isCronFlavorQuartz ? state.specificMonthWeek.seconds : ''} ${
          state.specificMonthWeek.minutes
        } ${this.hourToCron(state.specificMonthWeek.hours, state.specificMonthWeek.hourType)} ${
          this.monthDayDefaultChar
        } ${state.specificMonthWeek.month} ${
          this.getSelectOptions().days.indexOf(state.specificMonthWeek.day) + 1
        }${state.specificMonthWeek.monthWeek} ${this.yearDefaultChar}`.trim();
        break;
      default:
        throw new Error('Invalid cron yearly subtab selection');
    }
  }

  private computeAdvancedExpression(expression: any) {
    this.cron = expression;
  }

  private getAmPmHour(hour: number) {
    return this.options.use24HourTime ? hour : ((hour + 11) % 12) + 1;
  }

  private getHourType(hour: number) {
    if (this.options.use24HourTime) {
      return undefined;
    }
    if (hour >= 12) {
      return 'PM';
    }
    return 'AM';
  }

  private hourToCron(hour: number, hourType: string) {
    if (this.options.use24HourTime) {
      return hour;
    }
    if (hourType === 'AM') {
      return hour === 12 ? 0 : hour;
    }
    if (hour === 12) {
      return 12;
    }
    return hour + 12;
  }

  /**
   * Populate the state with the cron expression
   * passed as input to this component
   *
   * @param cron cronExpression coming from the input
   */
  private handleModelChange(cron: string): void {
    if (this.isDirty) {
      this.isDirty = false;
      return;
    }

    this.isDirty = false;

    if (!this.cronIsValid(cron)) {
      if (this.isCronFlavorQuartz) {
        throw new Error('Invalid cron expression, there must be 6 or 7 segments');
      }
      if (this.isCronFlavorStandard) {
        throw new Error('Invalid cron expression, there must be 5 segments');
      }
    }
    this.populateTab(cron);
  }

  /**
   * Check cron expression and see what tab to populate
   *
   * @param cron cron expression
   * @returns nothing
   */
  private populateTab(cron: string): void {
    const origCron: string = cron;
    if (cron.split(' ').length === 5 && this.isCronFlavorStandard) {
      // eslint-disable-next-line no-param-reassign
      cron = `0 ${cron} *`;
    }
    if (cron.match(/\d+ 0\/\d+ \* \* \* [?*] \*/)) {
      this.minutes(cron);
      return;
    }
    if (cron.match(/\d+ \d+ 0\/\d+ \* \* [?*] \*/)) {
      this.hourly(cron);
      return;
    }
    if (cron.match(/\d+ \d+ \d+ \d+\/\d+ \* [?*] \*/)) {
      this.dailyEveryDays(cron);
      return;
    }
    if (cron.match(/\d+ \d+ \d+ [?*] \* MON-FRI \*/)) {
      this.dailyEveryWeekDay(cron);
      return;
    }
    if (
      cron.match(
        /\d+ \d+ \d+ [?*] \* (MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN))* \*/
      )
    ) {
      this.weekly(cron);
      return;
    }
    if (cron.match(/\d+ \d+ \d+ (\d+|L|LW|1W) 1\/\d+ [?*] \*/)) {
      this.monthlySpecificDay(cron);
      return;
    }
    if (cron.match(/\d+ \d+ \d+ [?*] 1\/\d+ ([1-7])((#[1-5])|L) \*/)) {
      this.monthlySpecificWeekDay(cron);
      return;
    }
    if (cron.match(/\d+ \d+ \d+ (\d+|L|LW|1W) \d+ [?*] \*/)) {
      this.yearlySpecificMonthDay(cron);
      return;
    }
    if (cron.match(/\d+ \d+ \d+ [?*] \d+ ([1-7])((#[1-5])|L) \*/)) {
      this.yearlySpecificMonthWeek(cron);
      return;
    }
    // ADVANCED TAB
    this.activeTab = this.tabList.indexOf(Tabs.advanced);
    this.state.advanced.expression = origCron;
  }

  private minutes(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.minutes);
    const [seconds, minutes] = cron.split(' ');
    this.state.minutes.minutes = parseInt(minutes.substring(2), 10);
    this.state.minutes.seconds = parseInt(seconds, 10);
  }

  private hourly(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.hourly);
    const [seconds, minutes, hours] = cron.split(' ');
    this.state.hourly.hours = parseInt(hours.substring(2), 10);
    this.state.hourly.minutes = parseInt(minutes, 10);
    this.state.hourly.seconds = parseInt(seconds, 10);
  }

  private dailyEveryDays(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.daily);
    const [seconds, minutes, hours, dayOfMonth] = cron.split(' ');
    this.state.daily.subTab = 'everyDays';
    const [from, days] = dayOfMonth.split('/').map((n) => parseInt(n, 10));
    this.state.daily.everyDays.from = from;
    this.state.daily.everyDays.days = days;
    const parsedHours = parseInt(hours, 10);
    this.state.daily.everyDays.hours = this.getAmPmHour(parsedHours);
    this.state.daily.everyDays.hourType = this.getHourType(parsedHours);
    this.state.daily.everyDays.minutes = parseInt(minutes, 10);
    this.state.daily.everyDays.seconds = parseInt(seconds, 10);
  }

  private dailyEveryWeekDay(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.daily);
    const [seconds, minutes, hours] = cron.split(' ');
    this.state.daily.subTab = 'everyWeekDay';
    const parsedHours = parseInt(hours, 10);
    this.state.daily.everyWeekDay.hours = this.getAmPmHour(parsedHours);
    this.state.daily.everyWeekDay.hourType = this.getHourType(parsedHours);
    this.state.daily.everyWeekDay.minutes = parseInt(minutes, 10);
    this.state.daily.everyWeekDay.seconds = parseInt(seconds, 10);
  }

  private weekly(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.weekly);
    const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = cron.split(' ');
    this.selectOptions.days.forEach((weekDay) => {
      this.state.weekly[weekDay] = false;
    });
    dayOfWeek.split(',').forEach((weekDay) => {
      this.state.weekly[weekDay] = true;
    });
    const parsedHours = parseInt(hours, 10);
    this.state.weekly.hours = this.getAmPmHour(parsedHours);
    this.state.weekly.hourType = this.getHourType(parsedHours);
    this.state.weekly.minutes = parseInt(minutes, 10);
    this.state.weekly.seconds = parseInt(seconds, 10);
  }

  private monthlySpecificDay(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.monthly);
    const [seconds, minutes, hours, dayOfMonth, month] = cron.split(' ');
    this.state.monthly.subTab = 'specificDay';
    this.state.monthly.specificDay.day = dayOfMonth;
    this.state.monthly.specificDay.months = parseInt(month.substring(2), 10);
    const parsedHours = parseInt(hours, 10);
    this.state.monthly.specificDay.hours = this.getAmPmHour(parsedHours);
    this.state.monthly.specificDay.hourType = this.getHourType(parsedHours);
    this.state.monthly.specificDay.minutes = parseInt(minutes, 10);
    this.state.monthly.specificDay.seconds = parseInt(seconds, 10);
  }

  private monthlySpecificWeekDay(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.monthly);
    const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = cron.split(' ');
    const day = dayOfWeek[0];
    const monthWeek = dayOfWeek.slice(1);
    this.state.monthly.subTab = 'specificWeekDay';
    this.state.monthly.specificWeekDay.monthWeek = monthWeek;
    this.state.monthly.specificWeekDay.day = this.getSelectOptions().days[+day - 1];
    this.state.monthly.specificWeekDay.months = parseInt(month.substring(2), 10);
    const parsedHours = parseInt(hours, 10);
    this.state.monthly.specificWeekDay.hours = this.getAmPmHour(parsedHours);
    this.state.monthly.specificWeekDay.hourType = this.getHourType(parsedHours);
    this.state.monthly.specificWeekDay.minutes = parseInt(minutes, 10);
    this.state.monthly.specificWeekDay.seconds = parseInt(seconds, 10);
  }

  private yearlySpecificMonthDay(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.yearly);
    const [seconds, minutes, hours, dayOfMonth, month] = cron.split(' ');
    this.state.yearly.subTab = 'specificMonthDay';
    this.state.yearly.specificMonthDay.month = parseInt(month, 10);
    this.state.yearly.specificMonthDay.day = dayOfMonth;
    const parsedHours = parseInt(hours, 10);
    this.state.yearly.specificMonthDay.hours = this.getAmPmHour(parsedHours);
    this.state.yearly.specificMonthDay.hourType = this.getHourType(parsedHours);
    this.state.yearly.specificMonthDay.minutes = parseInt(minutes, 10);
    this.state.yearly.specificMonthDay.seconds = parseInt(seconds, 10);
  }

  private yearlySpecificMonthWeek(cron: string): void {
    this.activeTab = this.tabList.indexOf(Tabs.yearly);
    const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = cron.split(' ');
    const day = dayOfWeek[0];
    const monthWeek = dayOfWeek.slice(1);
    this.state.yearly.subTab = 'specificMonthWeek';
    this.state.yearly.specificMonthWeek.monthWeek = monthWeek;
    this.state.yearly.specificMonthWeek.day = this.getSelectOptions().days[+day - 1];
    this.state.yearly.specificMonthWeek.month = parseInt(month, 10);
    const parsedHours = parseInt(hours, 10);
    this.state.yearly.specificMonthWeek.hours = this.getAmPmHour(parsedHours);
    this.state.yearly.specificMonthWeek.hourType = this.getHourType(parsedHours);
    this.state.yearly.specificMonthWeek.minutes = parseInt(minutes, 10);
    this.state.yearly.specificMonthWeek.seconds = parseInt(seconds, 10);
  }

  private cronIsValid(cron: string): boolean {
    if (cron) {
      const cronParts = cron.split(' ');
      return (
        (this.isCronFlavorQuartz && (cronParts.length === 6 || cronParts.length === 7)) ||
        (this.isCronFlavorStandard && cronParts.length === 5)
      );
    }
    return false;
  }

  /**
   * Initialize state of the schedulation
   * with hard coded values
   *
   */
  private getInitialState() {
    const defaultHours = 0;
    const defaultMinutes = 0;
    const defaultSeconds = 0;
    const defaultStartDay = 1;
    return {
      minutes: {
        minutes: 1,
        seconds: 0
      },
      hourly: {
        hours: 1,
        minutes: 0,
        seconds: 0
      },
      daily: {
        subTab: 'everyDays',
        everyDays: {
          days: 1,
          hours: this.getAmPmHour(defaultHours),
          minutes: defaultMinutes,
          seconds: defaultSeconds,
          hourType: this.getHourType(defaultHours),
          from: defaultStartDay
        },
        everyWeekDay: {
          hours: this.getAmPmHour(defaultHours),
          minutes: defaultMinutes,
          seconds: defaultSeconds,
          hourType: this.getHourType(defaultHours)
        }
      },
      weekly: {
        MON: true,
        TUE: false,
        WED: false,
        THU: false,
        FRI: false,
        SAT: false,
        SUN: false,
        hours: this.getAmPmHour(defaultHours),
        minutes: defaultMinutes,
        seconds: defaultSeconds,
        hourType: this.getHourType(defaultHours)
      },
      monthly: {
        subTab: 'specificDay',
        specificDay: {
          day: '1',
          months: 1,
          hours: this.getAmPmHour(defaultHours),
          minutes: defaultMinutes,
          seconds: defaultSeconds,
          hourType: this.getHourType(defaultHours)
        },
        specificWeekDay: {
          monthWeek: '#1',
          day: 'MON',
          months: 1,
          hours: this.getAmPmHour(defaultHours),
          minutes: defaultMinutes,
          seconds: defaultSeconds,
          hourType: this.getHourType(defaultHours)
        }
      },
      yearly: {
        subTab: 'specificMonthDay',
        specificMonthDay: {
          month: 1,
          day: '1',
          hours: this.getAmPmHour(defaultHours),
          minutes: defaultMinutes,
          seconds: defaultSeconds,
          hourType: this.getHourType(defaultHours)
        },
        specificMonthWeek: {
          monthWeek: '#1',
          day: 'MON',
          month: 1,
          hours: this.getAmPmHour(defaultHours),
          minutes: defaultMinutes,
          seconds: defaultSeconds,
          hourType: this.getHourType(defaultHours)
        }
      },
      advanced: {
        expression: this.isCronFlavorQuartz ? '0 15 10 L-2 * ? *' : '15 10 2 * *'
      }
    };
  }

  private getSelectOptions() {
    return {
      months: this.getRange(1, 12),
      monthWeeks: ['#1', '#2', '#3', '#4', '#5', 'L'],
      days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      minutes: this.getRange(1, 59),
      fullMinutes: this.getRange(0, 59),
      seconds: this.getRange(1, 59),
      hours: this.getRange(1, 23),
      monthDays: this.getRange(1, 31),
      monthDaysWithLasts: [...[...this.getRange(1, 31).map(String)], 'L'],
      monthDaysWithOutLasts: [...[...this.getRange(1, 31).map(String)]],
      hourTypes: ['AM', 'PM']
    };
  }

  /**
   * Create ranges for the different edge numbers
   *
   * @param start start from
   * @param end end to
   * @returns
   */
  private getRange(start: number, end: number): number[] {
    if (start === end) {
      return [start];
    }
    return Array.from({ length: end - start + 1 }, (_, i) => i + start);
  }

  /*
   * ControlValueAccessor
   */
  onChange = (_: any) => {};

  onTouched = () => {};

  writeValue(obj: string): void {
    this.cron = obj;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /** Update the cron output to that of the selected tab
   */
  public onTabFocus(idx: number): void {
    switch (idx) {
      case 0:
        if (!this.options.hideMinutesTab) {
          this.minutesForm.setValue(this.minutesForm.value);
        }
        break;
      case 1:
        if (!this.options.hideHourlyTab) {
          this.hourlyForm.setValue(this.hourlyForm.value);
        }
        break;
      case 2:
        if (!this.options.hideDailyTab) {
          this.dailyForm.setValue(this.dailyForm.value);
        }
        break;
      case 3:
        if (!this.options.hideWeeklyTab) {
          this.weeklyForm.setValue(this.weeklyForm.value);
        }
        break;
      case 4:
        if (!this.options.hideMonthlyTab) {
          this.monthlyForm.setValue(this.monthlyForm.value);
        }
        break;
      case 5:
        if (!this.options.hideYearlyTab) {
          this.yearlyForm.setValue(this.yearlyForm.value);
        }
        break;
      case 6:
        if (!this.options.hideAdvancedTab) {
          this.advancedForm.setValue(this.advancedForm.value);
        }
        break;
      default:
        throw new Error('Invalid tab selected');
    }
  }

  ngOnDestroy(): void {
    this.unsub$.next(null);
  }
}
