import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { INavData } from '@coreui/angular';

export var navbarItems: INavData[] = [
  {
    title: true,
    name: 'Options'
  },
  {
    name: 'View Clients',
    url: '/clients',
    icon: 'icon-list',
    /*badge: {
      variant: 'info',
      text: 'NEW'
    }*/
  },
  {
    name: 'Add Client',
    url: '/client/add',
    icon: 'icon-user-follow'
  },
  {
    name: 'View Calendar',
    url: '/user/scheduling',
    icon: 'icon-calendar'
  }
  /*{
    name: 'Change Password',
    url: '/changepassword',
    icon: 'icon-lock'
  },*/
];

@Injectable()
export class GlobalVariables 
{
  constructor(private http: HttpClient, private r: Router) {}

  //Check version and auto-update
  Version: number = 0.986;
  autoUpdateCheck(userData: any, settingsData: any)
  {
    if(!userData || !settingsData) return;
    //console.log(userData, settingsData);

    // Check version
    let userstatus = userData.status;
    if((userstatus&8)!=0 && settingsData.version > this.Version)
    {
      // updateApp()
      let AlreadyUpdatedSession = sessionStorage.getItem('BMAutoUpdatedThisSession');
      if(AlreadyUpdatedSession === undefined || !AlreadyUpdatedSession) sessionStorage.setItem('BMAutoUpdatedThisSession', '1');
      let AlreadyUpdatedSessionnum = parseInt(sessionStorage.getItem('BMAutoUpdatedThisSession'));
      if(AlreadyUpdatedSessionnum < 2)
      {
        sessionStorage.setItem('BMAutoUpdatedThisSession', '' + (AlreadyUpdatedSessionnum+1));
        let element = document.getElementById('topnavnamearea');
        if(element) element.innerHTML = 'New version found, updating.. <div style="z-index:9;position:absolute;"><svg class="loader" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle class="internal-circle" cx="60" cy="60" r="30"></circle></svg></div>';
        setTimeout( ()=>{
        location.reload();
        window.location.href = window.location.href;
        }, 20);
      }
    }
  }

  //GetGlobalSettings
  settingsData: any = '';
  getGlobalSettings()
  {
      let checksum = this.AuthChecksum;
      this.http.post(this.API + 'GGS',{checksum},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0 && data != 'N')
            {
              // Parse settings data
              this.settingsData = JSON.parse(data);
              this.autoUpdateCheck(this.userData, this.settingsData);
            }
          },
          error => {
            console.log('GetGlobalSettings(): Error', error);
          }
      ); 
  }

  //GetUserData
  userData: any = '';
  GetUserData()
  {
    let checksum = this.AuthChecksum;
    this.http.post(this.API + 'GUD',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data !== '' && data.length>2) // If it's empty, don't even parse
          {
            this.userData = JSON.parse(data);

            // Access levels and add to navbar
            if(this.userData)
            {
              let accesslevel = this.userData['accesslevel'];
              let status = this.userData['status'];
              sessionStorage.setItem('BMUserStatus', '' + status);
              if(accesslevel) 
              {
                this.AccessLevel = accesslevel;
                sessionStorage.setItem('BMUserAccess', accesslevel);
              }
              if(this.userData.id !== undefined) this.UID = this.userData.id;
              if(accesslevel>=5)
              {
                let hasAlready = false;
                for(let i=0;i<navbarItems.length;i++)
                {
                  let navbarItem = navbarItems[i];
                  if(!navbarItem) continue;
                  if(navbarItem['idal'] !== undefined && navbarItem['idal'] == '1') hasAlready = true;
                }
                if(!hasAlready)
                {
                  // Deep clone to signal it changed?
                  let clone = []; 
                  for (let i=0;i<navbarItems.length;i++) 
                  {
                    let navbarItem = navbarItems[i];
                    if(!navbarItem) continue;
                    clone.push(navbarItem);
                  }
                  let optionsobj = {title: true,name: 'Admin'};
                  let navobj = {name: 'Users',url: '/users',icon: 'icon-people',idal: '1'};
                  navbarItems = clone;
                  navbarItems.push(optionsobj);
                  navbarItems.push(navobj);
                  this.saveNavBarData();
                }
              }

              this.getGlobalSettings();
            }

            // Add the name if it's there to a top message
            /*let elemTopText = document.querySelector("#topnavnamearea");
            if(elemTopText && this.userData.displaynamefirst)
            {
              let firstChar = this.userData.displaynamefirst.charAt(0);
              let secondChar = '';
              if(this.userData.displaynamelast) 
              {
              secondChar = this.userData.displaynamelast.charAt(0);
              //elemTopText.innerHTML = 'Welcome <span class="goldtext">' + this.userData.displaynamefirst + this.userData.displaynamelast + '!</span>';
              //elemTopText.innerHTML = 'Welcome <span class="goldtext">' + firstChar + "</span>" + this.userData.displaynamefirst.substring(1) + ' <span class="goldtext">' +secondChar + "</span>" + this.userData.displaynamelast.substring(1) + '!';
              elemTopText.innerHTML = 'Welcome ' + this.userData.displaynamefirst + ' ' + this.userData.displaynamelast + '!';
              }
              //else elemTopText.innerHTML = 'Welcome <span class="goldtext">' + firstChar + "</span>" + this.userData.displaynamefirst.substring(1) + '</span>!';
              //else elemTopText.innerHTML = 'Welcome <span class="goldtext">' + firstChar + "</span>" + this.userData.displaynamefirst.substring(1) + '</span>!';
              else elemTopText.innerHTML = 'Welcome ' + this.userData.displaynamefirst + '!';
            }*/
          }
        },
        error => {
          console.log('GetUserData(): Error', error);
        }
    ); 
  }

  /*StringToFile(data: string, filename: string = null): void{
    var file = new Blob([data], { type: 'text/vcard' });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
    else
    {
      const url = window.URL.createObjectURL(file);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.setAttribute('style', 'display: none');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();	
    }
  }*/

  //API: string = "http://localhost:3005/bmapi/";
  //API: string = "http://69.30.237.135:3000/bmapi/";
  API: string = "https://sessions.goldlink.live/bmapi/";
  IsMobile: boolean = false;

  /* Auth functions */
  IsAuthed: boolean = false;
  AuthChecksum: number = 0;
  AccessLevel: number = 1;
  UID: number = 0;
  VerifyAuth()
  {
    let checksum = this.AuthChecksum;
    this.http.post(this.API + 'AC',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data !== '') // If it's empty, don't even parse
          {
            if(data=='N') { this.IsAuthed = false; this.AuthChecksum = 0; this.r.navigate(["login"]); }
            else if(data.length>2)
            {
              if(parseInt(data) != checksum) { this.IsAuthed = false; this.AuthChecksum = 0; this.r.navigate(["login"]); }
              else { 
                this.IsAuthed = true; 
                document.cookie = "BMUserChecksum=" + checksum + "; path=/; domain=goldlink.live;";  // custom cookie
                if(!this.userData) this.GetUserData();
            } 
            }
          }
        },
        error => {
          console.log('VerifyAuth(): Error', error);
          // if this fails, logout?
          //this.r.navigate(["admin"]);
        }
    ); 
  }
  /* end Auth functions */

  /* Start nvbar functions */
  
  public navbarDataChanged: Subject<any> = new Subject<any>();
  saveNavBarData() {
    this.navbarDataChanged.next(navbarItems);
  }
  getNavBarData() {
    return navbarItems;
  }

  /* end navbar functions */

  /* Start theme functions */
  public themeDataChanged: Subject<any> = new Subject<any>();
  setThemeType(userstatus) {
    this.themeDataChanged.next(userstatus);
  }
  /* end theme functions */
}