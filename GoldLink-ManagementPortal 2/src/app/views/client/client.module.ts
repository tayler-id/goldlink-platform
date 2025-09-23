import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { ModalModule  } from 'ngx-bootstrap/modal';
import { PopoverModule } from 'ngx-bootstrap/popover';


import { ClientAddComponent } from './clientadd.component';
import { ClientViewComponent } from './clientview.component';
import { ClientEditComponent } from './clientedit.component';
import { ClientComponent } from './client.component';
import { ClientRoutingModule } from './client-routing.module';
import { IconModule } from '@coreui/icons-angular';
import { ClientSchedulingComponent } from './clientscheduling.component';
import { ClientSchedulingComponentMobile } from './clientschedulingmobile.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ClientRoutingModule,
    TabsModule,
    CollapseModule.forRoot(),
    ButtonsModule.forRoot(),
    TooltipModule.forRoot(),
    ModalModule.forRoot(),
    PopoverModule.forRoot(),
    IconModule
  ],
  declarations: [ ClientAddComponent, ClientViewComponent, ClientEditComponent, ClientSchedulingComponent, ClientSchedulingComponentMobile, ClientComponent ]
})
export class ClientModule { }
