import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { ModalModule  } from 'ngx-bootstrap/modal';
import { PopoverModule } from 'ngx-bootstrap/popover';

import { UserAddComponent } from './useradd.component';
import { UserViewComponent } from './userview.component';
import { UserEditComponent } from './useredit.component';
import { UserComponent } from './user.component';
import { UserRoutingModule } from './user-routing.module';
import { IconModule } from '@coreui/icons-angular';
import { UserSchedulingComponent } from './userscheduling.component';
import { UserSettingsComponent } from './usersettings.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UserRoutingModule,
    TabsModule,
    CollapseModule.forRoot(),
    ButtonsModule.forRoot(),
    TooltipModule.forRoot(),
    ModalModule.forRoot(),
    PopoverModule.forRoot(),
    IconModule
  ],
  declarations: [ UserAddComponent, UserViewComponent, UserEditComponent, UserComponent, UserSchedulingComponent, UserSettingsComponent ]
})
export class UserModule { }
