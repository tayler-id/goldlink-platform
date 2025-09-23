import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GlobalVariables } from '../../app.globals';

@Component({
  templateUrl: 'assetrefresh.component.html'
})
export class AssetRefreshComponent implements OnInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables) { }
  isLoaded: boolean = false;
  accountID: string = '';
  public account:object = {};
  public responsetype: number = 0;
  public refreshresponsetype: number = 0;
  public currentReportRange = 90;
  public errorresponse:string = '';

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
    this.http.post(this.g.API + 'GLEP.php',{checksum,itemid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'N' || data == 'U' || data == 'C') { this.refreshresponsetype = 4; } // An error occurred, is unauthorized, or error was not extracted
            else  // Successful response
            {
              let decodeddata = JSON.parse(data);
              //console.log(decodeddata);

              if(decodeddata && decodeddata.errorset == 1)
              {
                this.errorresponse = decodeddata.errordescription; // Readable error here
                this.refreshresponsetype = 5; // Successfully retrieved error
              }
              else this.refreshresponsetype = 4;
            }
          }
          else this.refreshresponsetype = 4; // default to 4
          console.log(data);
        },
        error => {
          this.refreshresponsetype = 4; // set to the default error again if this fails horridly for some reason, since this is an attempt to 'retrieve' an error
          console.log('GetLastErrorPlaid(): Error', error);
        }
    ); 
  }

  RefreshAssetReport(id)
  {
    let checksum = this.g.AuthChecksum;
    let days = this.currentReportRange;
    if(this.refreshresponsetype==1) return; // don't allow multiple 'refresh' calls once one is going
    this.refreshresponsetype = 1; // 1=refresh request is in progress
    this.http.post(this.g.API + 'RAR.php',{checksum,id,days},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'N' || data == 'U') { this.refreshresponsetype = 2; } // An error occurred, is unauthorized, or other response
            else if(data == 'Y') { this.refreshresponsetype = 3; } // Successful response
            else this.refreshresponsetype = 2; // default to 2
          }
          //console.log(data);
        },
        error => {
          this.refreshresponsetype = 2;
          console.log('RefreshAssetReport(): Error', error); // if exception error from Plaid happens, I can probably script to extract error from error_log file as it's setup
          if(this.account['usedItemId'] !== undefined) this.GetLastErrorPlaid(this.account['usedItemId']);
        }
    ); 
  }

  gotoView()
  {
    let ID = this.account['clientid'];
    if(ID) this.r.navigate(["/client/view/" + ID]);
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
