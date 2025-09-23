import { Component, OnDestroy, OnInit } from '@angular/core';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  templateUrl: 'useredit.component.html'
})
export class UserEditComponent implements OnInit, OnDestroy {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;
  public emailresponsetype:number = 0;
  public userresponsetype:number = 0;
  public userID:string = '';
  public isCollapsed:boolean = false;
  public isLoaded:boolean = false;
  public user:object = {};

  GetUserInfo(id)
  {
      let checksum = this.g.AuthChecksum;
      this.userresponsetype = 0;
      this.http.post(this.g.API + 'GUI',{checksum,id},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0 && data != 'N')
            {
              // Parse user data
              this.user = JSON.parse(data);
              this.user = this.user[0];

              // Set values into edit elements
              this.SetEditElements();

              // Email validation once loaded
              this.validateemail(this.user['email']);

              // Set succesful response
              this.userresponsetype = 1;
              //console.log(this.user);
            }
            this.isLoaded = true;
          },
          error => {
            console.log('GetUserInfo(): Error', error);
          }
      ); 
  }
  
  EditUser()
  {
    let checksum = this.g.AuthChecksum;
    let uid = this.userID;
    let fname = this.user['displaynamefirst'];
    let email = this.user['email'];
    let lname = this.user['displaynamelast'];
    let phone = this.user['phone'];
    let status = this.user['status'];
    if(phone) phone = phone.replace(/\D/g, ""); // remove any dashes or formatting
    let elem = <HTMLInputElement>document.getElementById("fname");
    if(elem) fname = elem.value;
    elem = <HTMLInputElement>document.getElementById("email");
    if(elem) email = elem.value;
    elem = <HTMLInputElement>document.getElementById("lname");
    if(elem) lname = elem.value;
    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem) phone = elem.value;
    elem = <HTMLInputElement>document.getElementById("status");
    if(elem) status = elem.value;

    this.responsetype = 4; // An update is in progress
    this.http.post(this.g.API + 'EU',{checksum,uid,fname,email,phone,lname,status},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'U') { this.responsetype = 1; } // Not authorized
            else if(data == 'N') { this.responsetype = 2; } // Failed to update or nothing was changed
            else if(data == 'D') { this.responsetype = 4; } // Failed to update or nothing was changed
            else if(data == 'Y') { this.responsetype = 3; // Successfully editted
              this.user['displaynamefirst'] = fname;  // Update the user object, so pressing reset will reset to the recent updated data
              this.user['displaynamelast'] = lname;
              this.user['email'] = email;
              this.user['phone'] = phone;
              this.user['status'] = status;
            } 
          }
          if(this.responsetype == 0) { this.responsetype = 2; } // default to 2

        },
        error => {
          console.log('EditUser(): Error', error);
        }
    ); 
  }

  SetEditElements()
  {
    let elem = <HTMLInputElement>document.getElementById("fname");
    if(elem) elem.value = this.user['displaynamefirst'];
    elem = <HTMLInputElement>document.getElementById("email");
    if(elem) elem.value = this.user['email'];
    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem) elem.value = this.user['phone'];
    elem = <HTMLInputElement>document.getElementById("lname");
    if(elem) elem.value = this.user['displaynamelast'];

    let status = this.user['status'];
    let statusname = '0';
    if(status&1) statusname = '1'; // inactive
    elem = <HTMLInputElement>document.getElementById("status");
    if(elem) elem.value = statusname;
  }

  gotoView() {
    this.r.navigate(["/users/view/" + this.userID]);
  }

  public useremailChanged: Subject<string> = new Subject<string>();
  private useremailSubscription: Subscription
  public useremail: string = '';
  public emailisvalid: boolean = true;

  public usernameChanged: Subject<string> = new Subject<string>();
  private usernameSubscription: Subscription
  public username: string = '';
  public nameisvalid: boolean = false;

  public usernameChanged2: Subject<string> = new Subject<string>();
  private usernameSubscription2: Subscription
  public username2: string = '';
  public nameisvalid2: boolean = false;

  useremailvalid(){
    let elem = <HTMLInputElement>document.getElementById("email");
    if(elem) this.useremail = elem.value;
    this.useremailChanged.next(this.useremail);
  }
  fnamevalid(){
    let elem = <HTMLInputElement>document.getElementById("fname");
    if(elem) this.username = elem.value;
    this.usernameChanged.next(this.username);
  }
  lnamevalid(){
    let elem = <HTMLInputElement>document.getElementById("nlame");
    if(elem) this.username2 = elem.value;
    this.usernameChanged2.next(this.username2);
  }

  validateemail(newText:string){
    let filter = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
     if (!filter.test(newText) && newText) this.emailisvalid = false;
     else this.emailisvalid = true;
  }

  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.userID = id;
    if(this.userID != 'edit' && this.userID != '') 
    {
      this.GetUserInfo(this.userID);
    }

    // Email input/validation handling
    this.useremailSubscription = this.useremailChanged
      .pipe(
        debounceTime(100),
        distinctUntilChanged()
      ).subscribe(newText => {
        this.useremail = newText;
        let filter = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!filter.test(newText) && newText) this.emailisvalid = false;
        else this.emailisvalid = true;
      });

    // Name input/validation handling
    this.usernameSubscription = this.usernameChanged
    .pipe(
      debounceTime(100),
      distinctUntilChanged()
    ).subscribe(newText => {
      this.username = newText;
      let filter = /^[A-Za-z0-9 ]*$/;
      if (!filter.test(newText) && newText) this.nameisvalid = false;
      else this.nameisvalid = true;
    });

    // Name input/validation handling
    this.usernameSubscription2 = this.usernameChanged2
    .pipe(
      debounceTime(100),
      distinctUntilChanged()
    ).subscribe(newText => {
      this.username2 = newText;
      let filter = /^[A-Za-z0-9 ]*$/;
      if (!filter.test(newText) && newText) this.nameisvalid2 = false;
      else this.nameisvalid2 = true;
    });

  }
  ngOnDestroy(): void {
    this.useremailSubscription.unsubscribe();
    this.usernameSubscription.unsubscribe();
    this.usernameSubscription2.unsubscribe();
  }
}
