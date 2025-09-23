import { Component, OnInit } from '@angular/core';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  templateUrl: 'useradd.component.html'
})
export class UsersAddComponent implements OnInit {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;
  public CreatedUser = {user: '', pass: ''};

  public CreateUser() // CreateUser
  {
    let checksum = this.g.AuthChecksum;
    let fname = '', lname = '', email = '', phone = '', usrtitle = '';
    this.responsetype = 0;
    
    let elem = <HTMLInputElement>document.getElementById("fname");
    if(elem) fname = elem.value;
    elem = <HTMLInputElement>document.getElementById("lname");
    if(elem) lname = elem.value;
    elem = <HTMLInputElement>document.getElementById("email");
    if(elem) email = elem.value;
    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem) phone = elem.value;
    elem = <HTMLInputElement>document.getElementById("usrtitle");
    if(elem) usrtitle = elem.value;

    this.http.post(this.g.API + 'AU',{checksum,fname,lname,email,phone,usrtitle},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      ).subscribe(
        data => {
          if(data !== '') // If it's empty, don't even parse
          {
            let response = JSON.parse(data);

            if(response.status == 'N') this.responsetype = 1; // Failed to insert user
            else if(response.status == 'Y') // Added user successfully
            {
              this.responsetype = 2;
              this.CreatedUser.user = response.user;
              this.CreatedUser.pass = response.pass;
              //setTimeout( ()=> { this.r.navigate(['/clients']) }, 1000);
            }
          }
          //console.log(data);
        },
        error => {
          console.log('CreateUser(): Error', error);
        }
    ); 
  }

  public ResetForm() // Helper function to reset the form
  { 
    let elem = <HTMLInputElement>document.getElementById("fname");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("email");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("lname");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("usrtitle");
    if(elem) elem.value = '';
  }

  gotoUsers()
  {
    this.r.navigate(['users/']);
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

  ngOnInit(): void {

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
