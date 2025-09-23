import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PlaidComponent } from './plaid.component';


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Plaid Integration'
    },
    children: [
      {
        path: '',
        component: PlaidComponent,
      },
      {
        path: ':id',
        component: PlaidComponent,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PlaidRoutingModule {}
