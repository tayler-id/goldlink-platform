import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalVariables } from '../../app.globals';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'startsession.component.html'
})
export class StartSessionComponent implements OnInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables) { }

  public clientID:string = '';
  public NoRedirect:boolean = false;
  public RedirectURL:string = '';

  // Go to video session, sent by Node API
  goToVideoSessionURL(ID): void
  {
    let Url = this.g.API + "GTR/" + ID;
    //window.open(Url, '_target'); // open in new tab/window
    window.location.assign(Url);
    //window.open(Url);

    /*setTimeout(() => {
      let a = document.createElement("a");
      document.body.appendChild(a);
      a.href = Url;
      a.click();
      document.body.removeChild(a);
    }, 400);*/
    setTimeout(() => {
      window.location.assign(Url);
    }, 200);

    let lastViewedClient = sessionStorage.getItem('BMLastClient');
    if(lastViewedClient) this.r.navigate(['/client/view/'+lastViewedClient]);
  }

  ngOnInit(): void 
  {
    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.clientID = id;
    if(this.clientID != 'startSession' && this.clientID != '') 
    {
      this.goToVideoSessionURL(this.clientID);
    }

    setTimeout(()=>{
      this.RedirectURL = this.g.API + "GTR/" + this.clientID;
      this.NoRedirect=true;
    }, 2500);
  }

 }
