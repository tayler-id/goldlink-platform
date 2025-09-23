import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RoutesRecognized } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs/operators';
import { GlobalVariables } from '../../app.globals';

@Component({
  selector: 'app-twizard',
  templateUrl: 'therapistwizard.component.html'
})
export class TherapistWizardComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables, private activatedRoute: ActivatedRoute) { }

  public responsetype: number = 0;
  public filloptionalfields: any = [];
  public currentstep: number = 0;
  public emailstepone: string;
  public emailisvalid: boolean;
  public emailsteponeChanged: Subject<string> = new Subject<string>();
  private emailsteponeSubscription: Subscription
  public accountsarelinked : boolean = false;
  public prepopID: string = '';
  public numAccounts: number = 0;
  public loadingToken: boolean = false;
  public loadingOptionalFields: boolean = false;

  NextLinkStep()
  {
    if(this.emailisvalid) this.currentstep = 1;
    
    if(this.filloptionalfields.length>0)
    {
      let email = this.emailstepone;
      let name = '', addr = '', phone = '';
      let elem = <HTMLInputElement>document.getElementById("name");
      if(elem) name = elem.value;
      elem = <HTMLInputElement>document.getElementById("email");
      if(elem) email = elem.value;
      elem = <HTMLInputElement>document.getElementById("address");
      if(elem) addr = elem.value;
      elem = <HTMLInputElement>document.getElementById("phone");
      if(elem) phone = elem.value;
      if(phone) phone = phone.replace(/[^0-9]/g, ''); // remove dashes or other symbols

      this.http.post(this.g.API + 'SCOF.php',{email, name, addr, phone},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0)
            {
              //console.log(data); // simply returns 'x' number of fields updated
            }
          },
          error => {
            console.log('SetClientOptionalFields(): Error', error);
          }
      ); 
    }
  }

  NextLinkFinalStep()
  {
    if(this.accountsarelinked) 
    {
      this.currentstep = 2;
    }
  }

  OpenPlaidForCustomers()
  {
    window.open("https://plaid.com/how-it-works-for-consumers/", "_target");
  }

  steponevalidation(){
      let elem = <HTMLInputElement>document.getElementById("emailstepone");
      if(elem) this.emailstepone = elem.value;
      this.emailsteponeChanged.next(this.emailstepone);
  }

  stepsoptionalvalidation(){
    let elem = <HTMLInputElement>document.getElementById("name");
    if(elem)
    {
      if(elem.value.length>2 && elem.value.length<64)
      {
        elem.value = elem.value.replace(/[^a-zA-Z0-9 ]/g, '');
        if(elem.value.match("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$")) elem.classList.add("is-valid");
      }
      else elem.classList.remove("is-valid");
    }

    elem = <HTMLInputElement>document.getElementById("address");
    if(elem)
    {
      if(elem.value.length>4 && elem.value.length<64)
      {
        elem.value = elem.value.replace(/[^a-zA-Z0-9 ]/g, '');
        if(elem.value.match("^[A-Za-z0-9 _]*[A-Za-z0-9][A-Za-z0-9 _]*$")) elem.classList.add("is-valid");
      }
      else elem.classList.remove("is-valid");
    }

    elem = <HTMLInputElement>document.getElementById("phone");
    if(elem)
    {
      let tempvalue = elem.value.replace(/[^0-9]/g, '');
      if(tempvalue.length>9 && tempvalue.length<17)
      {
        elem.classList.add("is-valid");
      }
      else elem.classList.remove("is-valid");
    }
}


  private clientemailcheck: boolean = false;
  clientEmailCheck(email: string) // for a: "You have linked an account in the past, feel free to add more! (Your past information will never be sent)" else "As this is your first time: click here for customer details about Plaid"
  {
    this.http.post(this.g.API + 'cec.php',{email},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data !== '') // If it's empty, don't even parse
          {
            
          }
        },
        error => {
          console.log('CEC(): Error', error);
        }
    ); 
  }


  /* ng Handlers start */
  ngAfterViewInit() {
  }

  ngOnInit() {
    // Check for prepopulate ID (from email or link), fill out step1 automatically
    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.prepopID = id;
    if(this.prepopID != 'plaid' && this.prepopID != '') 
    {
      let id = this.prepopID;
      this.http.post(this.g.API + 'GPPE.php',{id},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0 && data != 'N' && data != 'U')
            {
              let elem = <HTMLInputElement>document.getElementById("emailstepone");
              if(elem) 
              {
                elem.value = data;
                this.emailstepone = data;
                this.emailisvalid = true;
              }
            }
          },
          error => {
            console.log('Getprepopemail(): Error', error);
          }
      ); 

      let elem = <HTMLInputElement>document.getElementById("emailstepone");
      if(elem) elem.value = this.prepopID;
    }

    // Increment viewcount if it's not already been done in this session
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

    // Email input/validation handling
    this.emailsteponeSubscription = this.emailsteponeChanged
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(newText => {
        // Clear responses/values
        this.responsetype = 0;
        this.filloptionalfields.splice(0,this.filloptionalfields.length);

        // Do email validation and check for responses
        let elem = <HTMLInputElement>document.getElementById("emailstepone");
        this.emailstepone = newText;
        let filter = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!filter.test(newText)) { this.emailisvalid = false; if(elem) elem.classList.remove("is-valid"); }
        else  // clientside check 'ok'
        {
          //this.emailisvalid = true;
          if(elem) elem.classList.add("is-valid");

          let email = this.emailstepone;
          this.loadingOptionalFields = true;
          this.http.post(this.g.API + 'CE.php',{email},{
            headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
            responseType:'text'
            },
            )
            .subscribe(
              data => {
                if(data.length>0)
                {
                  if(data=='N') this.responsetype = 1;
                  else if(data=='S') this.responsetype = 2;
                  else if(data=='R') this.responsetype = 3;
                  else if(data.length>3)
                  {
                    let parseddata = JSON.parse(data);
                    if(parseddata)
                    {
                      // Push any blank fields that can be optionally filled out to the array
                      /*if(!parseddata['name']) this.filloptionalfields.push(1); 
                      if(!parseddata['addr']) this.filloptionalfields.push(2); 
                      if(!parseddata['phone']) this.filloptionalfields.push(3);*/
                      // disabled, we can possibly skip this whole thing by just grabbing from the account data later (name, addr, phone)
                      // just keeping the step to see the email is valid or not
                    }
                    this.emailisvalid = true;
                  }
                }
                this.loadingOptionalFields = false;
              },
              error => {
                console.log('CheckEmail(): Error', error);
                this.loadingOptionalFields = false;
              }
          ); 
          
        }
      });
  }
  ngOnDestroy() {
    this.emailsteponeSubscription.unsubscribe();
  }
  /* ng Handlers end */

}
