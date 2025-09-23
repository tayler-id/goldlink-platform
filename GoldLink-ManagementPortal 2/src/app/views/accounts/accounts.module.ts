import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


import { ChartsModule } from 'ng2-charts';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { CollapseModule } from 'ngx-bootstrap/collapse';

import { AccountsComponent } from './accounts.component';
import { AssetRefreshComponent } from './assetrefresh.component';
import { AssetGetErrorComponent } from './assetgeterror.component';
import { AssetGetNumbersComponent } from './assetgetnumbers.component';
import { AccountsRoutingModule } from './accounts-routing.module';
import { IconModule } from '@coreui/icons-angular';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AccountsRoutingModule,
    ChartsModule,
    BsDropdownModule,
    ButtonsModule.forRoot(),
    TooltipModule.forRoot(),
    CollapseModule.forRoot(),
    IconModule
  ],
  declarations: [ AccountsComponent, AssetRefreshComponent, AssetGetErrorComponent, AssetGetNumbersComponent ]
})
export class AccountsModule { }
