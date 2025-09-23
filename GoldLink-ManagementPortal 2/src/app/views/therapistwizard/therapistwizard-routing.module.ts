import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TherapistWizardComponent } from './therapistwizard.component';


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Therapist Wizard'
    },
    children: [
      {
        path: '',
        component: TherapistWizardComponent,
      },
      {
        path: ':id',
        component: TherapistWizardComponent,
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TherapistWizardRoutingModule {}
