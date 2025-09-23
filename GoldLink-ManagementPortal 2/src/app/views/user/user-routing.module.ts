import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UserComponent } from './user.component';
import { UserAddComponent } from './useradd.component';
import { UserEditComponent } from './useredit.component';
import { UserSchedulingComponent } from './userscheduling.component';
import { UserViewComponent } from './userview.component';
import { UserSettingsComponent } from './usersettings.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: ''
    },
    children: [
      {
        path: '',
        redirectTo: 'dashboard/'
      },
      { // to enable redirect on /user/ to /userview/, just add
        path: '',
        component: UserComponent,
        data: {
          title: ''
        }
      },
      {
        path: 'scheduling',
        component: UserSchedulingComponent,
        data: {
          title: 'Appointment Calendar'
        }
      },
      {
        path: 'scheduling/:id',
        component: UserSchedulingComponent,
        data: {
          title: 'Appointment Calendar'
        }
      },
      {
        path: 'settings',
        component: UserSettingsComponent,
        data: {
          title: 'Account Settings'
        }
      },
      {
        path: 'settings/:area',
        component: UserSettingsComponent,
        data: {
          title: 'Account Settings'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule {}
