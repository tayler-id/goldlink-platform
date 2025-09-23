import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RoutesRecognized } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, skip } from 'rxjs/operators';
import { GlobalVariables } from '../../app.globals';
import { PlaidErrorMetadata,PlaidErrorObject,PlaidEventMetadata,PlaidOnEventArgs,PlaidOnExitArgs,PlaidOnSuccessArgs,PlaidSuccessMetadata,PlaidConfig,NgxPlaidLinkService,PlaidLinkHandler } from "ngx-plaid-link";

@Component({
  selector: 'app-dashboard',
  templateUrl: 'plaid.component.html'
})
export class PlaidComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables, private activatedRoute: ActivatedRoute, private plaidLinkService: NgxPlaidLinkService) { }

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

  /* Plaid API handlers start */
  onPlaidSuccess(event) {
    console.log("We got a success event:", event);
  }
  onPlaidEvent(event) {
    console.log("We got a other event:", event);
  }
  onPlaidLoad(event) {
    console.log("We got a load event:", event);
  }
  onPlaidExit(error) {
    console.log("We exited:", error);
  }
  onPlaidClick(event) {
    console.log("We got a click event:", event);
  }
  /* Plaid API handlers end */

  /* Plaid Custom Functions */
  private plaidAPI = "https://production.plaid.com";
  private plaidAPIsandbox = "https://sandbox.plaid.com";
  private plaidLinkToken = '';
  private plaidLinkHandler: PlaidLinkHandler;
  InitLink(token)
  {
    this.loadingToken = false;
  
    const plaidLinkconfig: PlaidConfig = {
      apiVersion: "v2",
      env: "production",
      selectAccount: false,
      token: token,
      webhook: "",
      product: ["auth", "transactions", "assets"],
      countryCodes: ['US', 'CA'],
      onSuccess: this.onSuccess,
      onExit: this.onExit,
      onEvent: this.onEvent
    };

    this.plaidLinkService.createPlaid(
        Object.assign({}, plaidLinkconfig, {
          onSuccess: (token, metadata) => this.onSuccess(token, metadata),
          onExit: (error, metadata) => this.onExit(error, metadata),
          onEvent: (eventName, metadata) => this.onEvent(eventName, metadata)
        })
      )
      .then((handler: PlaidLinkHandler) => {
        this.plaidLinkHandler = handler;
        this.open();
      });
  }
  open() {
    this.plaidLinkHandler.open();
  }
  exit() {
    this.plaidLinkHandler.exit();
  }
  onSuccess(token, metadata) {
    //console.log("We got a success token:", token);
    //console.log("We got success metadata:", metadata);
    
    // save some metadata if needed, e.g. institution name, id, each account id, name, etc
    // save token and pass to API to do generateassetreports too
    // once generated we will store .pdf locations in a folder based on clientID or something like that (might need 'files' table)

    // Parse metadata
    if(metadata)
    {
      if(metadata.accounts.length>0) { this.numAccounts+=metadata.accounts.length; this.accountsarelinked=true;} 
      // or, set this after the next api call to create bank acnt and asset reports goes thru

      // Send API request with token and useful data (Generate Account and Report), this does not need tobe waited on by the client and can take up to ~20-40secs
      let accounts = metadata.accounts;
      let institution = metadata.institution;
      let email = this.emailstepone;
      token = metadata.public_token; // it seems this is a copy of 'token' we already have in this case
      this.http.post(this.g.API + 'GAR.php',{token,accounts,institution,email},{headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),responseType:'text'}).subscribe(
        data => {
          //console.log(data);
        },
        error => {
          console.log('GenerateAssetReport(): Error', error);
        }
      ); 
    }
  }

  onEvent(eventName, metadata) {
    //console.log("We got an event:", eventName);
    //console.log("We got event metadata:", metadata);
  }

  onExit(error, metadata) {
    //console.log("We exited:", error);
    //console.log("We got exit metadata:", metadata);
  }
  GetPlaidToken()
  {
    // Get Plaid LinkToken from API endpoint
    let email = this.emailstepone;
    this.loadingToken = true;
    if(this.plaidLinkToken != '') this.InitLink(this.plaidLinkToken);
    else
    {
      this.http.post(this.g.API + 'GPT.php',{email},{headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),responseType:'text'}).subscribe(
        data => {
          //console.log(data);
          if(data && data != 'N')
          {
            this.plaidLinkToken = data;
            this.InitLink(this.plaidLinkToken);
          }
          
        },
        error => {
          console.log('GetPlaidToken(): Error', error);
          this.loadingToken = false;
        }
      ); 
    }
  }
  /* Plaid Functions end */

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
