import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChartsModule } from 'ng2-charts';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { TooltipModule } from 'ngx-bootstrap/tooltip';

import { ChangePasswordComponent } from './changepassword.component';
import { ChangePasswordRoutingModule } from './changepassword-routing.module';
import { IconModule } from '@coreui/icons-angular';

@NgModule({
  imports: [
    FormsModule,
    ChangePasswordRoutingModule,
    ChartsModule,
    BsDropdownModule,
    ButtonsModule.forRoot(),
    TooltipModule.forRoot(),
    IconModule
  ],
  declarations: [ ChangePasswordComponent ]
})
export class ChangePasswordModule { }
