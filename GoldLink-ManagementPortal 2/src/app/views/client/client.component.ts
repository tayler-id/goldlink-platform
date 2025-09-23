import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  templateUrl: 'client.component.html'
})
export class ClientComponent implements OnInit {
  constructor(private r: Router) { }
  ngOnInit(): void {
    let lastViewedClient = sessionStorage.getItem('BMLastClient');
    if(lastViewedClient) this.r.navigate(['/client/view/'+lastViewedClient]);
  }
}
