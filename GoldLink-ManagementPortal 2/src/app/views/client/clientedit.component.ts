import { Component, OnDestroy, OnInit } from '@angular/core';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  templateUrl: 'clientedit.component.html'
})
export class ClientEditComponent implements OnInit, OnDestroy {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;
  public emailresponsetype:number = 0;
  public clientresponsetype:number = 0;
  public downloadresponsetype:number = 0;
  public clientID:string = '';
  public isCollapsed:boolean = false;
  public isLoaded:boolean = false;
  public client:object = {};
  public accounts:object = {};

  GetClientInfo(id)
  {
      let checksum = this.g.AuthChecksum;
      this.clientresponsetype = 0;
      this.http.post(this.g.API + 'GCI',{checksum,id},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0 && data != 'N')
            {
              // Parse client data
              this.client = JSON.parse(data);
              this.client = this.client[0];

              // Set bitflags
              //this.client['hasSelfRegistered'] = (this.client['status'] & 8);
              //this.client['hasLeftFeedback'] = (this.client['status'] & 4);
              this.client['isStreaming'] = (this.client['status'] & 2);
              this.client['isActive'] = (this.client['status'] & 1);

              // Re-create address for client to access video room (hardcoded to save effort)
              this.client['emulatedVideoRoomURL'] = 'https://' + window.location.hostname + '/#/client/startSession/' + this.client['crcid'];

              // Set values into edit elements
              this.SetEditElements();

              // Email validation once loaded
              this.validateemail(this.client['email']);

              // Set succesful response
              this.clientresponsetype = 1;
              //console.log(this.client);
            }
            this.isLoaded = true;
          },
          error => {
            console.log('GetClientInfo(): Error', error);
          }
      ); 
  }
  
  EditClient()
  {
    let checksum = this.g.AuthChecksum;
    let id = this.clientID;
    let name = this.client['name'];
    let email = this.client['email'];
    let address = this.client['addr'];
    let phone = this.client['phone'];
    if(phone) phone = phone.replace(/\D/g, ""); // remove any dashes or formatting
    let notes = this.client['notes'];
    let compid = this.client['compid'];
    let medicarenum = this.client['medicarenum'];
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
    
    this.responsetype = 4; // An update is in progress

    this.http.post(this.g.API + 'CE',{checksum,id,name,email,address,phone,notes,compid},{
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
            else if(data == 'D') { this.responsetype = 4; } // Failed, duplicate or error
            else if(data == 'Y') { this.responsetype = 3; // Successfully editted
              this.client['name'] = name;  // Update the client object, so pressing reset will reset to the recent updated data
              this.client['email'] = email;
              this.client['addr'] = address;
              this.client['phone'] = phone;
              this.client['notes'] = notes;
              this.client['compid'] = compid;
              this.SetEditElements();
            } 
            else { this.responsetype = 2; } // default to 2
          }
        },
        error => {
          console.log('ClientEditExisting(): Error', error);
        }
    ); 
  }

  SetEditElements()
  {
    let elem = <HTMLInputElement>document.getElementById("name");
    if(elem) elem.value = this.client['name'];
    elem = <HTMLInputElement>document.getElementById("email");
    if(elem) elem.value = this.client['email'];
    elem = <HTMLInputElement>document.getElementById("address");
    if(elem) elem.value = this.client['addr'];
    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem) elem.value = this.client['phone'];
    elem = <HTMLInputElement>document.getElementById("notes");
    if(elem) elem.value = this.client['notes'];
    elem = <HTMLInputElement>document.getElementById("jurisdiction");
    if(elem) elem.value = this.client['compid'];
  }

  gotoView() {
    this.r.navigate(["/client/view/" + this.clientID]);
  }

  getUserData()
  {
    return this.g.userData;
  }

  public clientemailChanged: Subject<string> = new Subject<string>();
  private clientemailSubscription: Subscription
  public clientemail: string = '';
  public emailisvalid: boolean = false;
  public clientnameChanged: Subject<string> = new Subject<string>();
  private clientnameSubscription: Subscription
  public clientname: string = '';
  public nameisvalid: boolean = false;

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

  validateemail(newText:string){
    let filter = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
     if (!filter.test(newText) && newText) this.emailisvalid = false;
     else this.emailisvalid = true;
  }

  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.clientID = id;
    if(this.clientID != 'edit' && this.clientID != '') 
    {
      this.GetClientInfo(this.clientID);
    }

   // Email input/validation handling
   this.clientemailSubscription = this.clientemailChanged
   .pipe(
     debounceTime(100),
     distinctUntilChanged()
   )
   .subscribe(newText => {
     this.clientemail = newText;
     this.validateemail(newText);
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
