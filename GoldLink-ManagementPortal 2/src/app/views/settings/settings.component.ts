import { Component, OnInit } from '@angular/core';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  templateUrl: 'settings.component.html'
})
export class SettingsComponent implements OnInit {
  constructor(private g: GlobalVariables, private http: HttpClient) { }

  public newpassChanged: Subject<string> = new Subject<string>();
  private newpassSubscription: Subscription
  public newpass: string = '';
  public passwordisvalid: boolean = false;
  public responsetype: number = 0;
  public getresponsetype: number = 0;
  public isLoaded: boolean = false;

  public SetGlobalSettings() // SetGlobalSettings
  {
    let checksum = this.g.AuthChecksum;
    this.responsetype = 0;

    let userregistration = '';
    let twofactorauth = '';
    let elem = <HTMLInputElement>document.getElementById("userregistration");
    if(elem) userregistration = elem.value;
    elem = <HTMLInputElement>document.getElementById("twofactorauth");
    if(elem) twofactorauth = elem.value;

    this.http.post(this.g.API + 'SGS',{checksum, userregistration, twofactorauth},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0 && data == 'Y') this.responsetype = 1;
          else this.responsetype = 2;
        },
        error => {
          console.log('SetGlobalSettings(): Error', error);
        }
    ); 
  }

  public GetGlobalSettings() // GetGlobalSettings
  {
    let checksum = this.g.AuthChecksum;
    this.responsetype = 0;

    this.http.post(this.g.API + 'GGS',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0) 
          {
            if(data == 'N') this.getresponsetype = 2;
            else if(data == 'U') this.getresponsetype = 3;
            else 
            {
              let decodeddata = JSON.parse(data);
              if(decodeddata)
              {
                // Set element values
                let elem = <HTMLInputElement>document.getElementById("userregistration");
                if(elem) elem.value = decodeddata.userregistration;
                elem = <HTMLInputElement>document.getElementById("twofactorauth");
                if(elem) elem.value = decodeddata.twofactorauth;
              }
              this.getresponsetype = 1;
            }
          }
          else this.getresponsetype = 2;
          this.isLoaded = true;
        },
        error => {
          console.log('GetGlobalSettings(): Error', error);
        }
    ); 
  }

  SubmitSettings(){
    this.SetGlobalSettings();
  }
  
  ngOnInit(): void {

    // Get global settings, set elements, finish loading
    this.GetGlobalSettings();

    // Email input/validation handling
    this.newpassSubscription = this.newpassChanged
      .pipe(
        debounceTime(5),
        distinctUntilChanged()
      )
      .subscribe(newText => {
        let elem = <HTMLInputElement>document.getElementById("newpass");
        if(elem) 
        {
          elem.value = elem.value.replace(/[^a-z\d]/, '');
          this.newpass = elem.value;
          if(this.newpass.length>2) this.passwordisvalid = true;
          else this.passwordisvalid = false;
        }
      });
  }
  ngOnDestroy(): void {
    this.newpassSubscription.unsubscribe();
  }
}
