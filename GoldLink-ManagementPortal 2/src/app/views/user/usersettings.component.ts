import { Component, OnDestroy, OnInit } from '@angular/core';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  templateUrl: 'usersettings.component.html'
})
export class UserSettingsComponent implements OnInit, OnDestroy {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router, private route: ActivatedRoute) { }
  public responsetype:number = 0;
  public statusresponsetype:number = 0;
  public emailresponsetype:number = 0;
  public userresponsetype:number = 0;
  public settingsresponsetype:number = 0;
  public tzresponsetype:number = 0;
  public userID:string = '';
  public isCollapsed:boolean = false;
  public isLoaded:boolean = false;
  public user:any = {};
  public settings:any = {version:''};
  public authValue = 0;
  public themeValue = 0;
  public paginationValue = 0;

  GetUserInfo()
  {
      let checksum = this.g.AuthChecksum;
      this.userresponsetype = 0;
      this.http.post(this.g.API + 'GUI2',{checksum},{
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
            console.log('GetUserInfo2(): Error', error);
          }
      ); 
  }

  getGlobalSettings()
  {
      let checksum = this.g.AuthChecksum;
      this.settingsresponsetype = 0;
      this.http.post(this.g.API + 'GGS',{checksum},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0 && data != 'N')
            {
              // Parse user data
              this.settings = JSON.parse(data);
              //console.log(this.settings);
              this.settingsresponsetype = 1;
            }
          },
          error => {
            console.log('GetGlobalSettings(): Error', error);
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

    this.responsetype = 5; // An update is in progress
    this.http.post(this.g.API + 'EUU',{checksum,uid,fname,email,phone,lname,status},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'U' || data =='I') { this.responsetype = 1; } // Not authorized
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

  // Edit user's 2fa status
  EditUserStatuses()
  {
    let checksum = this.g.AuthChecksum;
    let uid = this.userID;
    let fname = this.user['displaynamefirst'];
    let email = this.user['email'];
    let lname = this.user['displaynamelast'];
    let phone = this.user['phone'];
    let status = this.user['status'];
    let elem = <HTMLInputElement>document.getElementById("2fa");
    if(elem) status = elem.value;

    this.statusresponsetype = 5; // An update is in progress
    this.http.post(this.g.API + 'EUU',{checksum,uid,fname,email,phone,lname,status},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'U' || data =='I') { this.statusresponsetype = 1; } // Not authorized
            else if(data == 'N') { this.statusresponsetype = 2; } // Failed to update or nothing was changed
            else if(data == 'D') { this.statusresponsetype = 4; } // Failed to update or nothing was changed
            else if(data == 'Y') { this.statusresponsetype = 3; // Successfully editted
              this.user['status'] = status;
              sessionStorage.setItem('BMUserStatus', status);
            } 
          }
          if(this.statusresponsetype == 0) { this.statusresponsetype = 2; } // default to 2

        },
        error => {
          console.log('EditUserStatuses(): Error', error);
        }
    ); 
  }

  // Edit user's autoupdate status
  EditUserStatuses2()
  {
    let checksum = this.g.AuthChecksum;
    let uid = this.userID;
    let fname = this.user['displaynamefirst'];
    let email = this.user['email'];
    let lname = this.user['displaynamelast'];
    let phone = this.user['phone'];
    let status = this.user['status'];
    let elem = <HTMLInputElement>document.getElementById("autoupdate");
    if(elem) status = elem.value;

    this.statusresponsetype = 5; // An update is in progress
    this.http.post(this.g.API + 'EUU',{checksum,uid,fname,email,phone,lname,status},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'U' || data =='I') { this.statusresponsetype = 1; } // Not authorized
            else if(data == 'N') { this.statusresponsetype = 2; } // Failed to update or nothing was changed
            else if(data == 'D') { this.statusresponsetype = 4; } // Failed to update or nothing was changed
            else if(data == 'Y') { this.statusresponsetype = 3; // Successfully editted
              this.user['status'] = status;
              sessionStorage.setItem('BMUserStatus', status);
            } 
          }
          if(this.statusresponsetype == 0) { this.statusresponsetype = 2; } // default to 2

        },
        error => {
          console.log('EditUserStatuses2(): Error', error);
        }
    ); 
  }

    // Edit user's timezone status
    EditUserTimezone(event:any)
    {
      let checksum = this.g.AuthChecksum;
      let uid = this.userID;
      let timeZone = this.user['tzOffset'];
      let elem:any = document.getElementById("timezoneselect");
      if(elem)
      {
        let value = elem.value;
        let text = elem.options[elem.selectedIndex].text;
        timeZone = parseInt(value);
      }

      let tzo = timeZone;
      this.tzresponsetype = 5; // An update is in progress
      this.http.post(this.g.API + 'EUT',{checksum,uid,tzo},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0)
            {
              if(data == 'U' || data =='I' || data =='M') { this.tzresponsetype = 1; } // Not authorized
              else if(data == 'N') { this.tzresponsetype = 2; } // Failed to update or nothing was changed
              else if(data == 'D') { this.tzresponsetype = 4; } // Failed to update or nothing was changed
              else if(data == 'Y') { this.tzresponsetype = 3; // Successfully editted
                this.user['tzOffset'] = timeZone;
              } 
            }
            if(this.tzresponsetype == 0) { this.tzresponsetype = 2; } // default to 2
  
          },
          error => {
            console.log('EditUsertimezone(): Error', error);
          }
      ); 
    }
  

  // Get Timezone String (local Javascript or otherwise)
  getTimezoneString()
  {
    let timezoneOffset = this.user.tzOffset;
    let curDate = new Date();

    let timeZone = '';
    let dayLightSavings = false;
    let timeString = '';
    if(timezoneOffset == 255) 
    {
      // Timezone
      let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if(tz) 
      {
        timeZone = tz;
        //console.log("Default Timezone Offset (EST): ", this.TimezoneOffset);
        let offset = -getTimezoneOffset(tz, Date.now());
        //console.log("New timezone offset: ", offset);
        if(offset != timezoneOffset) timezoneOffset = offset;
      }

      // Daylight Savings Time
      let hasDone = false;
      let hasConditions = false;
      if(curDate.getMonth() >= 3 && curDate.getMonth() <= 9 && !hasDone) hasConditions = true;
      if((curDate.getMonth() == 2 && curDate.getDate()>=12) && (curDate.getMonth() == 10 && curDate.getDate() <= 5) && !hasDone) hasConditions = true;
      if(hasConditions && !hasDone && tz.includes("America"))
      {
        timezoneOffset -= 1;
        curDate.setHours(curDate.getHours());
        dayLightSavings = true;
        hasDone = true;
      }

      // Set current time?
      timeString = curDate.toLocaleTimeString('en-us');

      // Create string
      let retObj = {str:'', dls: false, offset: timezoneOffset};
      retObj.str = timeString + '; ' + timeZone;
      retObj.dls = dayLightSavings;
      retObj.offset = timezoneOffset;
      return retObj;
    }
    else
    {
      //curDate.setHours(0);
      //curDate.setMinutes(0);
      //curDate.setSeconds(0);
      //curDate.setMilliseconds(0);
      let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      //console.log(curDate, curDate.getTimezoneOffset());
      let curTimezoneOffset = curDate.getTimezoneOffset();
      curDate.setHours(curDate.getHours() + Math.floor(curTimezoneOffset/60));
      //let date2 = convertTimeZone(curDate, tz, 'UTC');
      //console.log("date2 " + tz +' to UTC', date2);
      
      if(this.user.tzOffset !== undefined) 
      {
        curDate.setHours( curDate.getHours() + (this.user.tzOffset) );
        //console.log(this.user, curDate, curDate.getTimezoneOffset(), tz);
      }

      // Daylight Savings Time
      let hasDone = false;
      let hasConditions = false;
      let dayLightSavings = false;
      if(curDate.getMonth() >= 3 && curDate.getMonth() <= 9 && !hasDone) hasConditions = true;
      if((curDate.getMonth() == 2 && curDate.getDate()>=12) && (curDate.getMonth() == 10 && curDate.getDate() <= 5) && !hasDone) hasConditions = true;
      if(hasConditions && !hasDone && tz.includes("America"))
      {
        dayLightSavings = true;
        curDate.setHours(curDate.getHours()+1);
        hasDone = true;
      }

      // Create time String
      let timeString = curDate.toLocaleTimeString('en-us');

      // Create timeZone String
      let timeZone = '';
      let elem:any = document.getElementById("timezoneselect");
      if(elem)
      {
        let value = elem.value;
        let text = elem.options[elem.selectedIndex].text;
        timeZone = text;
      }
      //console.log(curDate, timeString);

      // Create string
      let retObj = {str:'', dls: false, offset: timezoneOffset};
      retObj.str = timeString + '; ' + timeZone;
      retObj.dls = dayLightSavings;
      retObj.offset = timezoneOffset;
      return retObj;
    }

    function getTimezoneOffset(tz, hereDate) {
      hereDate = new Date(hereDate || Date.now());
      hereDate.setMilliseconds(0); // for nice rounding
      
      const
      hereOffsetHrs = hereDate.getTimezoneOffset() / 60 * -1,
      thereLocaleStr = hereDate.toLocaleString('en-US', {timeZone: tz}),
      thereDate = new Date(thereLocaleStr),
      diffHrs = (thereDate.getTime() - hereDate.getTime()) / 1000 / 60 / 60,
      thereOffsetHrs = hereOffsetHrs + diffHrs;
    
      //console.log(tz, thereDate, 'UTC'+(thereOffsetHrs < 0 ? '' : '+')+thereOffsetHrs);
      return thereOffsetHrs;
    }

    function convertTimeZone(
      date: Date,
      timeZoneFrom?: string | null, // default timezone is Local
      timeZoneTo?: string | null, // default timezone is Local
    ): Date {
      const dateFrom = timeZoneFrom == null
        ? date
        : new Date(
          date.toLocaleString('en-US', {
            timeZone: timeZoneFrom,
          }),
        )
    
      const dateTo = timeZoneTo == null
        ? date
        : new Date(
          date.toLocaleString('en-US', {
            timeZone: timeZoneTo,
          }),
        )
    
      const result = new Date(date.getTime() + dateTo.getTime() - dateFrom.getTime())
    
      return result
    }
    
   function dateToString(date: Date, timeZone: string): string {
      date = convertTimeZone(date, 'UTC', timeZone)
    
      const year = date.getUTCFullYear().toString().padStart(4, '0')
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
      const day = date.getUTCDate().toString().padStart(2, '0')
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      const seconds = date.getUTCSeconds().toString().padStart(2, '0')
    
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    function getCurrentTime() {
      const d = new Date() //2022-07-22T16:27:21.322Z
      const t = d.getTime(); //d in milliseconds 1658507241322
      const offset = -d.getTimezoneOffset()/60 //current offset in hours -4
      const curretMilli = t + (offset * 3600000) //cuuret local time milliseconds need to convert offset to milliseconds
      return new Date(curretMilli) //converts current local time in milliseconds to a Date //2022-07-22T12:27:21.322Z
  }
  }

    // Edit user's theme status
    EditUserStatuses3()
    {
      let checksum = this.g.AuthChecksum;
      let uid = this.userID;
      let fname = this.user['displaynamefirst'];
      let email = this.user['email'];
      let lname = this.user['displaynamelast'];
      let phone = this.user['phone'];
      let status = this.user['status'];
      let elem = <HTMLInputElement>document.getElementById("themeselect");
      if(elem) status = elem.value;
  
      this.statusresponsetype = 5; // An update is in progress
      this.http.post(this.g.API + 'EUU',{checksum,uid,fname,email,phone,lname,status},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0)
            {
              if(data == 'U' || data =='I') { this.statusresponsetype = 1; } // Not authorized
              else if(data == 'N') { this.statusresponsetype = 2; } // Failed to update or nothing was changed
              else if(data == 'D') { this.statusresponsetype = 4; } // Failed to update or nothing was changed
              else if(data == 'Y') { this.statusresponsetype = 3; // Successfully editted
                this.user['status'] = status;
                sessionStorage.setItem('BMUserStatus', status);
                this.g.setThemeType(status);
              } 
            }
            if(this.statusresponsetype == 0) { this.statusresponsetype = 2; } // default to 2
  
          },
          error => {
            console.log('EditUserStatuses3(): Error', error);
          }
      ); 
    }

    // Edit user's pagination status
    EditUserStatuses4()
    {
      let checksum = this.g.AuthChecksum;
      let uid = this.userID;
      let fname = this.user['displaynamefirst'];
      let email = this.user['email'];
      let lname = this.user['displaynamelast'];
      let phone = this.user['phone'];
      let status = this.user['status'];
      let elem = <HTMLInputElement>document.getElementById("pagination");
      if(elem) status = elem.value;
  
      this.statusresponsetype = 5; // An update is in progress
      this.http.post(this.g.API + 'EUU',{checksum,uid,fname,email,phone,lname,status},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0)
            {
              if(data == 'U' || data =='I') { this.statusresponsetype = 1; } // Not authorized
              else if(data == 'N') { this.statusresponsetype = 2; } // Failed to update or nothing was changed
              else if(data == 'D') { this.statusresponsetype = 4; } // Failed to update or nothing was changed
              else if(data == 'Y') { this.statusresponsetype = 3; // Successfully editted
                this.user['status'] = status;
                let elem = document.getElementById("pagelimitformgroup");
                if(status==128 && elem) elem.style.removeProperty("display");
                else if(elem && status==-128) elem.style.setProperty("display", "none");
                sessionStorage.setItem('BMUserStatus', status);
              } 
            }
            if(this.statusresponsetype == 0) { this.statusresponsetype = 2; } // default to 2
  
          },
          error => {
            console.log('EditUserStatuses4(): Error', error);
          }
      ); 
  }

  // Edit user's pagination pagelimit
  EditUserStatuses5(pagelimit=25)
  {
    let checksum = this.g.AuthChecksum;
    let uid = this.userID;
    //let elem = <HTMLInputElement>document.getElementById("pagelimit");
    //if(elem) pagelimit = parseInt(elem.value);

    this.statusresponsetype = 5; // An update is in progress
    this.http.post(this.g.API + 'EUPL',{checksum,uid,pagelimit},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data.length>0)
          {
            if(data == 'U' || data =='I') { this.statusresponsetype = 1; } // Not authorized
            else if(data == 'N') { this.statusresponsetype = 2; } // Failed to update or nothing was changed
            else if(data == 'D') { this.statusresponsetype = 4; } // Failed to update or nothing was changed
            else if(data == 'Y') { this.statusresponsetype = 3; // Successfully editted
              this.g.userData['pagelimit'] = this.user['pagelimit'] = pagelimit;
            } 
          }
          if(this.statusresponsetype == 0) { this.statusresponsetype = 2; } // default to 2

        },
        error => {
          console.log('EditUserStatuses5(): Error', error);
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
    if((status&2)) statusname = '2'; // email 2fa
    if((status&4)) statusname = '4'; // phone 2fa
    elem = <HTMLInputElement>document.getElementById("2fa");
    if(elem) elem.value = statusname;
    elem = <HTMLInputElement>document.getElementById("autoupdate");
    if(elem && (status&8)) elem.value = '8'; // autoupdate on/off
    else if(elem) elem.value = '-8';

    statusname = '-16';
    if((status&16)) statusname = '16'; // Professional Blue
    if((status&32)) statusname = '32'; // Radiant Gold
    if((status&64)) statusname = '64'; // Black Gold
    elem = <HTMLInputElement>document.getElementById("themeselect");
    if(elem) elem.value = statusname;

    elem = <any>document.getElementById("timezoneselect");
    if(elem && this.user.tzOffset !== undefined)
    {
      elem.value = '' + this.user.tzOffset;
    } 

    elem=<HTMLInputElement>document.getElementById("pagination");
    statusname = '-128';
    if((status&128)!=0) statusname = '128'; 
    if(elem) elem.value = statusname;
    elem = <HTMLInputElement>document.getElementById("pagelimitformgroup");
    if((status&128)!=0 && elem) elem.style.removeProperty("display");
    else if(elem) elem.style.setProperty("display", "none");
    let sentpagelimit = '25';
    console.log(this.user);
    if(this.user['pagelimit'] !== undefined) sentpagelimit = this.user['pagelimit'];
    elem=<HTMLInputElement>document.getElementById("pagelimit");
    if(elem) elem.value = sentpagelimit;
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

  themeSelectChanged(event)
  {
    let themeValue = event.target.value;
    this.themeValue = parseInt(themeValue);
    this.EditUserStatuses3();
  }

  paginationSelectChanged(event)
  {
    let paginationValue = event.target.value;
    this.paginationValue = parseInt(paginationValue);
    this.EditUserStatuses4();
  }

  pagelimitSelectChanged(event)
  {
    let pagelimitValue = event.target.value;
    this.EditUserStatuses5(pagelimitValue);
  }
  
  twoFactorAuthChanged(event)
  {
    let authValue = event.target.value;
    this.authValue = parseInt(authValue);
    this.EditUserStatuses();
  }

  autoUpdateChanged(event)
  {
    let autoupdate = event.target.value;
    this.EditUserStatuses2();
  }

  getLocalVersion()
  {
    return this.g.Version;
  }

  updateApp()
  {
    location.reload();
    window.location.href = window.location.href;
  }

  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.userID = id;
    if(this.userID != 'edit' && this.userID != '') 
    {
      this.GetUserInfo();
      this.getGlobalSettings();
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

    let area = this.route.snapshot.paramMap.get('area');
    if(area == 'timezone')
    {
      setTimeout( ()=> {window.scrollTo(0,1000);}, 1000);
    }
  }
  ngOnDestroy(): void {
    this.useremailSubscription.unsubscribe();
    this.usernameSubscription.unsubscribe();
    this.usernameSubscription2.unsubscribe();
  }
}
