import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalVariables } from '../../app.globals';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'admlogin.component.html'
})
export class AdmLoginComponent implements OnInit { 
  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables) { }
  
  public responsetype: number = 0;
  public showHTTPSWarning: boolean = false;

  login()
  {
    let user = '', pass = '', code = '';
    let elem = <HTMLInputElement>document.getElementById("user");
    if(elem) user = elem.value;
    let elem2 = <HTMLInputElement>document.getElementById("pass");
    if(elem2) pass = elem2.value;
    let elem3 = <HTMLInputElement>document.getElementById("2fa");
    if(elem3) code = elem3.value;

    this.http.post(this.g.API + 'CLP',{user, pass, code},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          //console.log(data);
          if(data !== '') // If it's empty, don't even parse
          {
            if(data == 'N') this.responsetype = 1; // No username found
            else if(data == 'L') this.responsetype = 2; // Password does not match
            else if(data == '2') this.responsetype = 4; // 2FA code required
            else if(data == '3') this.responsetype = 5; // 2FA code did not match
            else if(data == '4') this.responsetype = 6; // 2FA required, no email or phone set on account
            else if(data == 'I') this.responsetype = 7; // account set inactive, can't login
            else if(data.length>2) {
              this.responsetype = 3; // Login successful
              this.g.AuthChecksum = parseInt(data);
              sessionStorage.setItem('BMUserChecksum', data);
              //localStorage.setItem('BMUserChecksum', data);
              document.cookie = "BMUserChecksum=" + data + "; path=/; domain=goldlink.live;"; // custom cookie, used to carry over to other subdomains
              this.g.IsAuthed = true;
              this.r.navigate(['clients']);
            }
          }
        },
        error => {
          console.log('CLP(): Error', error);
        }
    ); 
  }

  SwitchToSSL()
  {
    window.location.href = location.href.replace('http:', 'https:');
    this.showHTTPSWarning = false;
  }

  public getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    else return '';
  }

  ngOnInit()
  {
        // Enforce https one time when logging in per session, but do not enforce harshly (and check if we're on the live domain)
        if (!location.protocol.includes('https') && !sessionStorage.getItem('ProductPortal1Https') && location.hostname /*&& !location.hostname.includes("localhost")*/) 
        {
          this.showHTTPSWarning = true;
        }    

        // Autologin if the sessiondata or other cookie thing is present
        let cookieChecksum = '';
        cookieChecksum = this.getCookie('BMUserChecksum');
        if(cookieChecksum)
        {
              this.responsetype = 3; // Login successful
              setTimeout( ()=> {
                this.g.AuthChecksum = parseInt(cookieChecksum);
                sessionStorage.setItem('BMUserChecksum', cookieChecksum);
                document.cookie = "BMUserChecksum=" + cookieChecksum + "; path=/; domain=goldlink.live;"; // custom cookie, used to carry over to other subdomains
                this.g.IsAuthed = true;
                this.r.navigate(['clients']);
              }, 10);
        }
  }

}
