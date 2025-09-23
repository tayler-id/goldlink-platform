import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  templateUrl: 'accounts.component.html'
})
export class AccountsComponent implements OnInit {

  constructor(private r: Router) { }
  ngOnInit(): void {
    let lastViewedClient = sessionStorage.getItem('BMLastClient');
    if(lastViewedClient) this.r.navigate(['/client/view/'+lastViewedClient]);
  }
}
