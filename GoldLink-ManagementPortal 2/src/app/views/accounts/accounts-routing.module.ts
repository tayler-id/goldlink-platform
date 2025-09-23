import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AccountsComponent } from './accounts.component';
import { AssetRefreshComponent } from './assetrefresh.component';
import { AssetGetErrorComponent } from './assetgeterror.component';
import { AssetGetNumbersComponent } from './assetgetnumbers.component';

const routes: Routes = [
  { // to enable redirect on /accounts/ to /clientview/ or elsewhere
    path: '',
    component: AccountsComponent,
    data: {
      title: ''
    }
  },
  {
    path: 'assetrefresh/:id',
    component: AssetRefreshComponent,
    data: {
      title: 'Asset Refresh'
    }
  },
  {
    path: 'asseterrors/:id',
    component: AssetGetErrorComponent,
    data: {
      title: 'Asset Errors'
    }
  },
  {
    path: 'numbers/:id',
    component: AssetGetNumbersComponent,
    data: {
      title: 'Numbers'
    }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountsRoutingModule {}
