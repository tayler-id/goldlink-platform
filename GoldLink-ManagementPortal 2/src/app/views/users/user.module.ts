import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { ModalModule  } from 'ngx-bootstrap/modal';

import { UsersAddComponent } from './useradd.component';
import { UsersViewComponent } from './userview.component';
import { UsersEditComponent } from './useredit.component';
import { UsersComponent } from './user.component';
import { UsersRoutingModule } from './user-routing.module';
import { IconModule } from '@coreui/icons-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    UsersRoutingModule,
    TabsModule,
    CollapseModule.forRoot(),
    ButtonsModule.forRoot(),
    TooltipModule.forRoot(),
    ModalModule.forRoot(),
    IconModule
  ],
  declarations: [ UsersAddComponent, UsersViewComponent, UsersEditComponent, UsersComponent ]
})
export class UsersModule { }
