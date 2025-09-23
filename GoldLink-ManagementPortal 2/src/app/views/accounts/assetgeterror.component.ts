import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GlobalVariables } from '../../app.globals';

@Component({
  templateUrl: 'assetgeterror.component.html'
})
export class AssetGetErrorComponent implements OnInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables) { }
  isLoaded: boolean = false;
  accountID: string = '';
  public account:object = {};
  public responsetype: number = 0;
  public gleresponsetype: number = 0;
  public currentReportRange = 90;
  public errorresponse:string = '';
  public errortype:string = '';
  public errorurl:string = '';

  public updateReportRange(e)
  {
    let elem = <HTMLInputElement>document.getElementById("reportrange");
    if(elem) this.currentReportRange = parseInt(elem.value);
  }

  GetAccountInfo(id)
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GAII.php',{checksum,id},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'D' || data == 'N') { this.isLoaded=true; this.responsetype = 1; }
            else
            {
              // Get account
              this.account = JSON.parse(data);
              this.account = this.account[0];
              //console.log(this.account);

              // Set page is loaded
              this.isLoaded=true;

              // Set successful response
              this.responsetype = 2;

              // Call GetLastErrorPlaid with itemid retrieved
              this.GetLastErrorPlaid(this.account['usedItemId']);
            }
          }
        },
        error => {
          console.log('GetAccountInfo(): Error', error);
        }
    ); 
  }

  GetLastErrorPlaid(itemid)
  {
    let checksum = this.g.AuthChecksum;
    this.gleresponsetype=1;
    this.http.post(this.g.API + 'GLEP.php',{checksum,itemid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'N' || data == 'U') { this.gleresponsetype = 2; } // An error occurred, is unauthorized, or error was not extracted
            else if(data =='C') { this.gleresponsetype = 3; } // Search returned no error found
            else  // Successful response
            {
              let decodeddata = JSON.parse(data);
              //console.log(decodeddata);

              if(decodeddata && decodeddata.errorset == 1)
              {
                this.errorresponse = decodeddata.errordescription; // Readable error here
                if(decodeddata.errorcode) this.errortype = decodeddata.errorcode.replace(/\\/g, '').replace(/["]+/g, '');
                if(decodeddata.errorurl) this.errorurl = decodeddata.errorurl.replace(/\\/g, '').replace(/["]+/g, '');
                this.gleresponsetype = 4; // Successfully retrieved error
              }
              else this.gleresponsetype = 3; // Search returned no error found
            }
          }
          else this.gleresponsetype = 2; // default to 4
          //console.log(data);
        },
        error => {
          this.gleresponsetype = 2; // set to the default error again if this fails horridly for some reason, since this is an attempt to 'retrieve' an error
          console.log('GetLastErrorPlaid(): Error', error);
        }
    ); 
  }

  gotoView()
  {
    let ID = this.account['clientid'];
    if(ID) this.r.navigate(["/client/view/" + ID]);
  }

  gotoDocumentationURL()
  {
    if(this.errorurl) window.open(this.errorurl,'_blank');
  }
  
  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.accountID = id;
    if(this.accountID != 'assetrefresh' && this.accountID != '') 
    {
      this.GetAccountInfo(this.accountID);
      sessionStorage.setItem('KodiakFocusedCVAccount', id); // Set account ID to attempt to focus to upon returning to clientview
    }

  }
}
