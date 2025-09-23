import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClientAddComponent } from './clientadd.component';
import { ClientViewComponent } from './clientview.component';
import { ClientEditComponent } from './clientedit.component';
import { ClientComponent } from './client.component';
import { ClientSchedulingComponent } from './clientscheduling.component';
import { ClientSchedulingComponentMobile } from './clientschedulingmobile.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Client'
    },
    children: [
      {
        path: '',
        redirectTo: 'dashboard/'
      },
      { // to enable redirect on /client/ to /clientview/, just add
        path: '',
        component: ClientComponent,
        data: {
          title: ''
        }
      },
      {
        path: 'add',
        component: ClientAddComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'view/:id',
        component: ClientViewComponent,
        data: {
          title: 'View'
        }
      },
      {
        path: 'edit/:id',
        component: ClientEditComponent,
        data: {
          title: 'Edit'
        }
      },
      {
        path: 'scheduling/:id',
        component: ClientSchedulingComponent,
        data: {
          title: 'Scheduling'
        }
      },
      {
        path: 'mobilescheduling/:id',
        component: ClientSchedulingComponentMobile,
        data: {
          title: 'Scheduling'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientRoutingModule {}
