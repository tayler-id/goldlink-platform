import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UsersComponent } from './user.component';
import { UsersAddComponent } from './useradd.component';
import { UsersEditComponent } from './useredit.component';
import { UsersViewComponent } from './userview.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'View Users'
    },
    children: [
      {
        path: '',
        redirectTo: 'dashboard/'
      },
      { // to enable redirect on /user/ to /userview/, just add
        path: '',
        component: UsersComponent,
        data: {
          title: ''
        }
      },
      {
        path: 'add',
        component: UsersAddComponent,
        data: {
          title: 'Add'
        }
      },
      {
        path: 'view/:id',
        component: UsersViewComponent,
        data: {
          title: 'View'
        }
      },
      {
        path: 'edit/:id',
        component: UsersEditComponent,
        data: {
          title: 'Edit'
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsersRoutingModule {}
