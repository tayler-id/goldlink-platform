import { Component, OnInit } from '@angular/core';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  templateUrl: 'clientadd.component.html'
})
export class ClientAddComponent implements OnInit {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;

  public CreateClient() // CreateClient
  {
    let checksum = this.g.AuthChecksum;
    let name = '', email = '', address = '', phone = '', notes = '', compid='';
    this.responsetype = 0;
    
    let elem = <HTMLInputElement>document.getElementById("name");
    if(elem) name = elem.value;
    elem = <HTMLInputElement>document.getElementById("email");
    if(elem) email = elem.value;
    elem = <HTMLInputElement>document.getElementById("address");
    if(elem) address = elem.value;
    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem) phone = elem.value;
    if(phone) phone = phone.replace(/[^0-9]/g, ''); // remove dashes or other symbols
    elem = <HTMLInputElement>document.getElementById("notes");
    if(elem) notes = elem.value;
    elem = <HTMLInputElement>document.getElementById("jurisdiction");
    if(elem) compid = elem.value;
    if(!compid) { this.responsetype = 5; return; }

    this.http.post(this.g.API + 'AC2',{checksum,name,email,address,phone,notes,compid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data !== '') // If it's empty, don't even parse
          {
            if(data == 'N') this.responsetype = 1; // Failed to insert client (maybe email exists?)
            else if(data == 'Y') { this.responsetype = 2; // Added client successfully
            setTimeout( ()=> { this.r.navigate(['/clients']) }, 1000);
            }
            else if(data == 'S') this.responsetype = 3; // Added client successfully + Sent Email
          }
          //console.log(data);
        },
        error => {
          console.log('CreateClient(): Error', error);
        }
    ); 
  }

  public ResetForm() // Helper function to reset the form
  { 
    let elem = <HTMLInputElement>document.getElementById("name");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("email");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("address");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("notes");
    if(elem) elem.value = '';
    elem = <HTMLInputElement>document.getElementById("jurisdiction");
    if(elem) 
    {
      elem.value = '';
      this.jurisdictionisvalid = false;
      //let userdata = this.getUserData();
      //if(userdata && userdata.compid !== undefined) elem.value = userdata.compid;
    }
  }

  public clientemailChanged: Subject<string> = new Subject<string>();
  private clientemailSubscription: Subscription
  public clientemail: string = '';
  public emailisvalid: boolean = true;

  public clientnameChanged: Subject<string> = new Subject<string>();
  private clientnameSubscription: Subscription
  public clientname: string = '';
  public nameisvalid: boolean = false;

  public jurisdictionisvalid: boolean = false;

  clientemailvalid(){
    let elem = <HTMLInputElement>document.getElementById("email");
    if(elem) this.clientemail = elem.value;
    this.clientemailChanged.next(this.clientemail);
  }
  clientnamevalid(){
    let elem = <HTMLInputElement>document.getElementById("name");
    if(elem) this.clientname = elem.value;
    this.clientnameChanged.next(this.clientname);
  }

  gotoClients()
  {
    this.r.navigate(['/clients']);
  }

  getUserData()
  {
    return this.g.userData;
  }

  jurisdictionChanged(event)
  {
    let jurisdiction = event.target.value;
    if(!jurisdiction) this.jurisdictionisvalid = false;
    else this.jurisdictionisvalid = true;
  }
  
  ngOnInit(): void {

    // Email input/validation handling
    this.clientemailSubscription = this.clientemailChanged
      .pipe(
        debounceTime(100),
        distinctUntilChanged()
      )
      .subscribe(newText => {
        this.clientemail = newText;
        let filter = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!filter.test(newText) && newText) this.emailisvalid = false;
        else this.emailisvalid = true;
      });

      // Name input/validation handling
      this.clientnameSubscription = this.clientnameChanged
      .pipe(
        debounceTime(100),
        distinctUntilChanged()
      )
      .subscribe(newText => {
        this.clientname = newText;
        let filter = /^[A-Za-z0-9 ]*$/;
        if (!filter.test(newText) && newText) this.nameisvalid = false;
        else this.nameisvalid = true;
      });
  }

  ngOnDestroy(): void {
    this.clientemailSubscription.unsubscribe();
    this.clientnameSubscription.unsubscribe();
  }
}
