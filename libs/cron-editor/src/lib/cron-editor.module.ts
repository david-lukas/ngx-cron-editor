import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { provideChildTranslateService, TranslatePipe } from '@ngx-translate/core';
import { CronEditorComponent } from './cron-editor.component';
import { TimePickerComponent } from './cron-time-picker.component';
import { MonthDayDisplayPipe } from './month-day-display.pipe';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { OrdinalSuffixPipe } from './ordinal-suffix.pipe';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatListModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatRadioModule,
    MatCheckboxModule,
    TranslatePipe
  ],
  providers: [...provideChildTranslateService()],
  declarations: [TimePickerComponent, CronEditorComponent, MonthDayDisplayPipe, OrdinalSuffixPipe],
  exports: [TimePickerComponent, CronEditorComponent]
})
export class CronEditorModule {}
