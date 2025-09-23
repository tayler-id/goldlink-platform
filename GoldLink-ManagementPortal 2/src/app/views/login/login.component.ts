import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalVariables } from '../../app.globals';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'login.component.html'
})
export class LoginComponent implements OnInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables) { }

  GotoPlaid()
  {
    this.r.navigate(['plaid']);
  }

  GoToClientPanel()
  {
    this.r.navigate(['clients']);
  }

  SendForgotPassword()
  {
    let email='';
    let elem = <HTMLInputElement>document.getElementById("emaillogin");
    if(elem) email = elem.value;
    if(email.length == 0)
    {
      alert("Please enter an email");
    }
    else
    {
      let filter = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if (!filter.test(email)) alert("Please enter a valid email (e.g. xxxx@yyyy.com)");
      else {
        if(confirm("Do you want to send passcode to " + email + "?")) { console.log("send"); }
        else console.log("cancel");
      }
    }
  }

  ngOnInit()
  {
    let IsViewed = sessionStorage.getItem('ViewedPlaid');
    if(IsViewed !== undefined && IsViewed != 'true') 
    {
      this.http.post(this.g.API + 'IV.php',{},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            sessionStorage.setItem('ViewedPlaid', 'true');
          },
          error => {
            console.log('IncrementViews(): Error', error);
          }
      ); 
    }
  }

 }
