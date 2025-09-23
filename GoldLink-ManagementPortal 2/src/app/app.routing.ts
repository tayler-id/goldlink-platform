import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Import Containers
import { DefaultLayoutComponent } from './containers';

import { P404Component } from './views/error/404.component';
import { P500Component } from './views/error/500.component';
import { LoginComponent } from './views/login/login.component';
import { LogoutComponent } from './views/logout/logout.component';
import { RegisterComponent } from './views/register/register.component';
import { OnlyAuthedService, RoleGuardService } from './app.isauthed';
import { AdmLoginComponent } from './views/adminlogin/admlogin.component';
import { PlaidComponent } from './views/plaid/plaid.component';
import { StartSessionComponent } from './views/startsession/startsession.component';
import { StartSessionOldComponent } from './views/startsessionold/startsessionold.component';
import { TherapistWizardComponent } from './views/therapistwizard/therapistwizard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'clients', pathMatch: 'full' },
  //{ path: '404', component: P404Component, data: { title: 'Page 404' } },
  //{ path: '500', component: P500Component, data: { title: 'Page 500' } },
  { path: 'login', component: AdmLoginComponent, data: { title: 'Login Page' } },
  { path: 'logout', component: LogoutComponent, data: { title: 'Logging out..' } },
  { path: 'admin', component: AdmLoginComponent, data: { title: 'Login Page' } },
  { path: 'register', component: RegisterComponent, data: { title: 'Register Page' } },
  { path: 'startSession/:id', component: StartSessionComponent, data: { title: 'Start a Video Session' } },
  { path: 'startSessionOld/:id', component: StartSessionOldComponent, data: { title: 'Start a Video Session(depreciated)' } },
  { 
    path: 'wizard', component: TherapistWizardComponent, data: { title: 'Therapist Wizard' }, 
    loadChildren: () => import('./views/therapistwizard/therapistwizard.module').then(m => m.TherapistWizardModule)
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    data: {
      title: ''
    },
    children: [
      {
        path: 'clients',
        loadChildren: () => import('./views/dashboard/dashboard.module').then(m => m.DashboardModule),
        canActivate: [OnlyAuthedService] 
      },
      {
        path: 'client',
        loadChildren: () => import('./views/client/client.module').then(m => m.ClientModule),
        canActivate: [OnlyAuthedService]
      },
      {
        path: 'changepassword',
        loadChildren: () => import('./views/changepassword/changepassword.module').then(m => m.ChangePasswordModule),
        canActivate: [OnlyAuthedService] 
      },
      {
        path: 'settings',
        loadChildren: () => import('./views/settings/settings.module').then(m => m.SettingsModule),
        canActivate: [OnlyAuthedService] 
      },
      {
        path: 'users',
        loadChildren: () => import('./views/users/user.module').then(m => m.UsersModule),
        canActivate: [OnlyAuthedService,RoleGuardService] 
      },
      {
        path: 'user',
        loadChildren: () => import('./views/user/user.module').then(m => m.UserModule),
        canActivate: [OnlyAuthedService] 
      },
      /*{
        path: 'base',
        loadChildren: () => import('./views/base/base.module').then(m => m.BaseModule),
        canActivate: [OnlyAuthedService]
      },
      {
        path: 'buttons',
        loadChildren: () => import('./views/buttons/buttons.module').then(m => m.ButtonsModule),
        canActivate: [OnlyAuthedService]
      },
      {
        path: 'charts',
        loadChildren: () => import('./views/chartjs/chartjs.module').then(m => m.ChartJSModule),
        canActivate: [OnlyAuthedService]
      },
      {
        path: 'icons',
        loadChildren: () => import('./views/icons/icons.module').then(m => m.IconsModule),
        canActivate: [OnlyAuthedService]
      },
      {
        path: 'notifications',
        loadChildren: () => import('./views/notifications/notifications.module').then(m => m.NotificationsModule),
        canActivate: [OnlyAuthedService]
      },
      {
        path: 'theme',
        loadChildren: () => import('./views/theme/theme.module').then(m => m.ThemeModule),
        canActivate: [OnlyAuthedService]
      },
      {
        path: 'widgets',
        loadChildren: () => import('./views/widgets/widgets.module').then(m => m.WidgetsModule),
        canActivate: [OnlyAuthedService]
      }*/
    ]
  },
  { path: '**', component: P404Component }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' }) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
