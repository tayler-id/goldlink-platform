import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GlobalVariables } from '../../app.globals';

@Component({
  templateUrl: 'assetgetnumbers.component.html'
})
export class AssetGetNumbersComponent implements OnInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables) { }
  isLoaded: boolean = false;
  accountID: string = '';
  public numbers:Array<any> = [];
  public responsetype: number = 0;
  public ganrefreshresponsetype: number = 0;

  GetAccountNumbers(id)
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GAN.php',{checksum,id},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'U') { this.isLoaded=true; this.responsetype = 1; } // Not authorized
            else if(data == 'N') { this.isLoaded=true; this.responsetype = 2; } // No account ID retrieved, error
            else if(data == 'F') { this.isLoaded=true; this.responsetype = 3; } // No account ID numbers retrieved, error
            else
            {
              // Get account
              this.numbers = JSON.parse(data);
              console.log(this.numbers);

              // Set accounttype strings from id
              for(let i=0;i<this.numbers.length;i++)
              {
                let data = this.numbers[i];
                if(!data) continue;
                if(data.type == 0) data['strtype'] = 'ACH';
                else if(data.type == 1) data['strtype'] = 'EFT';
                else if(data.type == 2) data['strtype'] = 'International';
                else if (data.type == 3) data['strtype'] = 'BAC';
                else data['strtype'] = 'Unknown, assuming ACH';
              }

              // Set page is loaded
              this.isLoaded=true;

              // Set successful response
              this.responsetype = 4;
            }
          }
        },
        error => {
          console.log('GetAccountInfo(): Error', error);
        }
    ); 
  }

  numbersRefresh()
  {
    if(!this.accountID || this.ganrefreshresponsetype != 0) return;

    this.ganrefreshresponsetype = 1; // Attempting/loading

    let checksum = this.g.AuthChecksum;
    let id = this.accountID;
    this.http.post(this.g.API + 'RAN.php',{checksum,id},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'U') { this.ganrefreshresponsetype = 2; } // Not authorized
            else if(data == 'Y') { 
              this.ganrefreshresponsetype = 3;  // Set successful response
              this.isLoaded = false; // Set page loaded as false
              this.GetAccountNumbers(this.accountID); // Recall get numbers info
            } 
            else
            {
              // Set error response
              this.ganrefreshresponsetype = 4;
            }
          }
        },
        error => {
          console.log('numbersRefresh(): Error', error);
        }
    ); 
  }

  gotoView()
  {
    let ID = sessionStorage.getItem('BMLastClient');
    if(ID) this.r.navigate(["/client/view/" + ID]);
  }

  gotoGetLastError()
  {
    let ID = this.accountID;
    if(ID) this.r.navigate(["/accounts/asseterrors/" + ID]);
  }
  
  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.accountID = id;
    if(this.accountID != 'assetrefresh' && this.accountID != '') 
    {
      this.GetAccountNumbers(this.accountID);
      sessionStorage.setItem('KodiakFocusedCVAccount', id); // Set account ID to attempt to focus to upon returning to clientview
    }

  }
}
