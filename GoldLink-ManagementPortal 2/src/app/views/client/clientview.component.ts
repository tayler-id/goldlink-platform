import { Component, OnInit, ViewChild } from '@angular/core';
import { getStyle, hexToRgba } from '@coreui/coreui/dist/js/coreui-utilities';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';
import { PromiseType } from 'protractor/built/plugins';
import { isNoSubstitutionTemplateLiteral } from 'typescript';
import { ModalDirective } from 'ngx-bootstrap/modal';
//import tippy from '../../../../node_modules/tippy.js/dist/tippy.umd.min.js';

@Component({
  templateUrl: 'clientview.component.html'
})
export class ClientViewComponent implements OnInit {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;
  public emailresponsetype:number = 0;
  public textresponsetype:number = 0;
  public clientresponsetype:number = 0;
  public clientID:string = '';
  public isCollapsed:boolean = false;
  public isLoaded:boolean = false;
  public client:object = {};
  public accounts:Array<any> = [];
  public focusOnAccount:number = 0;
  public numRoomClients: number = 0;
  public roomClientString:string = '';
  public clientLastScheduled: string = '';
  public clientNextScheduled: string = '';
  public clientLastPhysician: string = '';
  public clientProceedToRoom: boolean = false;

  @ViewChild('primaryModal') public primaryModal: ModalDirective;

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
            if(data.length>0 && data[0] != 'N')
            {
              // Parse client data
              this.client = JSON.parse(data);
              this.client = this.client[0];

              // Set bitflags
              //this.client['isWaitingRoom'] = (this.client['status'] & 4);
              //this.client['isSideButtons'] = (this.client['status'] & 2);
              //this.client['isActive'] = (this.client['status'] & 1);

              // Re-create address for client to access video room by an ID route
              this.client['emulatedVideoRoomURL'] = location.protocol + '//' + window.location.host + '/#/startSession/' + this.client['uuid'];

              // Set succesful response
              this.clientresponsetype = 1;
              this.isLoaded = true;

              // Format created date
              if(this.client['creationtime'])
              {
                let split = this.client['creationtime'];
                split = split.split('T')[0];
                split = split.split('-')
                let day = split[2];
                let month = split[1];
                let year = split[0];
                this.client['formattedCreationTime'] = '' + month + '/' + day + '/' + year;
              }

              // Recursively poll room info
              this.PollRoomInfo();
            }
            else
            {
              if(data=='N2') this.clientresponsetype = 3;
              else this.clientresponsetype = 2;

              this.isLoaded = true;
            }
          },
          error => {
            console.log('GetClientInfo(): Error', error);
          }
      ); 
  }

  private GetRoomsInfo() : void
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GRI',{checksum},{
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    responseType:'text'
    },
    )
    .subscribe({
      next: (data) => {
        if(data !== '') // If it's empty, don't even parse
        {
          this.isLoaded = true;
          let rooms = JSON.parse(data);
          let RoomID = this.client['uuid'];

          // Get table rows that contain roomstatus class
          let FoundRoomData = false;
          for(let j=0;j<rooms.length;j++)
          {
            let room = rooms[j];
            if(!room) continue;
            if(room.room == RoomID) 
            { 
              FoundRoomData = true;
              this.numRoomClients = room.clients;
              this.roomClientString = 'Session is active with ' + this.numRoomClients + ' user(s).';
              break;
            }
          }
          if(!FoundRoomData) 
          {
            this.numRoomClients = 0;
            this.roomClientString = 'Session is not active.';
          }
        }

        // Check for waiting room waiters
        if(this.client['status'] && (this.client['status']&16)!=0)
        {
          this.roomClientString += ' A user is currently in the waiting room.'
        }
      },
      error: (e) => {
        console.log('GRI(): Error', e);
        //alert("The app is down for maintainence or is not functioning properly, please try back later! (Could not retrieve rooms)");
      }
  });  
  }

  public SendClientText(): void
  {
    let checksum = this.g.AuthChecksum;
    let room = this.client['uuid'];
    this.http.post(this.g.API + 'SCST',{checksum,room},{
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    responseType:'text'
    },
    )
    .subscribe({
      next: (data) => {
        if(data !== '') // If it's empty, don't even parse
        {
          //console.log(data);
          if(data=='N') this.textresponsetype = 3;
          else if(data=='Y') { this.textresponsetype = 4; this.clientProceedToRoom = true; }
          else if(data=='M') this.textresponsetype = 5;
        }
      },
      error: (e) => {
        console.log('SCST(): Error', e);
      }
    });  
  }


  public SendClientEmail() : void
  {
    let checksum = this.g.AuthChecksum;
    let room = this.client['uuid'];
    this.http.post(this.g.API + 'SCSE',{checksum,room},{
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    responseType:'text'
    },
    )
    .subscribe({
      next: (data) => {
        if(data !== '') // If it's empty, don't even parse
        {
          //console.log(data);
          if(data == 'N') this.emailresponsetype = 3;
          else if(data=='Y') { this.emailresponsetype = 4; this.clientProceedToRoom = true; }
          else if(data=='M') this.emailresponsetype = 5;
        }
      },
      error: (e) => {
        console.log('SCSE(): Error', e);
      }
    });  
  }

  private GetClientStatus() : void
  {
    let checksum = this.g.AuthChecksum;
    let room = this.client['uuid'];
    this.http.post(this.g.API + 'GCSRA',{checksum,room},{
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    responseType:'text'
    },
    )
    .subscribe({
      next: (data) => {
        if(data !== '') // If it's empty, don't even parse
        {
          let roomStatus = JSON.parse(data);
          let status = roomStatus.status;
          if(this.client['status'] != status)
          {
            this.client['status'] = status;
          }
        }
      },
      error: (e) => {
        console.log('GRI(): Error', e);
        //alert("The app is down for maintainence or is not functioning properly, please try back later! (Could not retrieve rooms)");
      }
    });  
  }

  private GetClientFirstRelatedPhysician() : void
  {
    let checksum = this.g.AuthChecksum;
    let id = this.clientID;
    this.http.post(this.g.API + 'GCFRP',{checksum,id},{
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    responseType:'text'
    },
    )
    .subscribe({
      next: (data) => {
        if(data !== '') // If it's empty, don't even parse
        {
          let userData = JSON.parse(data);
          if(userData)
          {
            let firstName = userData[0].displaynamefirst;
            let lastName = userData[0].displaynamelast;
            if(firstName.length>0 || lastName.length>0) this.clientLastPhysician = firstName + ' ' + lastName;
          }
        }
      },
      error: (e) => {
        console.log('GCFRP(): Error', e);
        //alert("The app is down for maintainence or is not functioning properly, please try back later! (Could not retrieve rooms)");
      }
    });  
  }

  private GetClientLastScheduled() : void
  {
    let checksum = this.g.AuthChecksum;
    let id = this.clientID;
    this.http.post(this.g.API + 'GCSC',{checksum,id},{
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    responseType:'text'
    },
    )
    .subscribe({
      next: (data) => {
        if(data !== '') // If it's empty, don't even parse
        {
          let schedule = JSON.parse(data);
          if(schedule && schedule.length>0)
          {

            // Formatting for Last Scheduled
            if(schedule[1])
            {
              let schedulestr = schedule[1].date;
              schedulestr = schedulestr.replace(/[TZ]/g, ':');
              let t = schedulestr.split(/[- :]/);
              for(let i=0;i<t.length;i++)
              {
                let splited = t[i];
                if(!splited) continue;
                t[i] = parseInt(t[i]);
              }
              let datet = new Date(t[0], t[1], t[2], t[3], t[4], t[5]);
              //console.log(datet, t);
              datet.setHours(datet.getHours() - Math.floor(datet.getTimezoneOffset()/60));
              let year = datet.getFullYear().toString();
              let day = datet.getDate().toString();
              if(datet.getDate() < 10) day = '0' + day;
              let month = datet.getMonth().toString();
              if(datet.getMonth() < 10) month = '0' + month;
              let keystr = '' + year + '-' + month + '-' + day;
              let hour = '';
              if(datet.getHours()>12) hour = (datet.getHours() - 12).toString();
              else hour = datet.getHours().toString();
              let minute = datet.getMinutes().toString();
              if(datet.getHours()<10) hour = '0' + hour;
              if(datet.getMinutes()<10) minute = '0' + minute;
              let type = ' AM';
              if(datet.getHours()>12) type = ' PM';
              let formattime = '' + month + '/' + day + '/' + year + ' @ ' + hour + ':' + minute + type;

              //console.log(schedule[1].date, newdate);
              this.clientLastScheduled = formattime;
            }

            // Formatting for Next Scheduled
            if(schedule[0])
            {
              let schedulestr = schedule[0].date;
              schedulestr = schedulestr.replace(/[TZ]/g, ':');
              let t = schedulestr.split(/[- :]/);
              for(let i=0;i<t.length;i++)
              {
                let splited = t[i];
                if(!splited) continue;
                t[i] = parseInt(t[i]);
              }
              let datet = new Date(t[0], t[1], t[2], t[3], t[4], t[5]);
              //console.log(datet, t);
              datet.setHours(datet.getHours() - Math.floor(datet.getTimezoneOffset()/60));
              let year = datet.getFullYear().toString();
              let day = datet.getDate().toString();
              if(datet.getDate() < 10) day = '0' + day;
              let month = datet.getMonth().toString();
              if(datet.getMonth() < 10) month = '0' + month;
              let keystr = '' + year + '-' + month + '-' + day;
              let hour = '';
              if(datet.getHours()>12) hour = (datet.getHours() - 12).toString();
              else hour = datet.getHours().toString();
              let minute = datet.getMinutes().toString();
              if(datet.getHours()<10) hour = '0' + hour;
              if(datet.getMinutes()<10) minute = '0' + minute;
              let type = ' AM';
              if(datet.getHours()>12) type = ' PM';
              let formattime = '' + month + '/' + day + '/' + year + ' @ ' + hour + ':' + minute + type;

              //console.log(schedule[0].date, newdate);
              this.clientNextScheduled = formattime;
            }
          }
          
        }
      },
      error: (e) => {
        console.log('GCSC(): Error', e);
        //alert("The app is down for maintainence or is not functioning properly, please try back later! (Could not retrieve rooms)");
      }
    });  
  }

  PollRoomInfo()
  {
    this.GetRoomsInfo();
    this.GetClientStatus();
    setTimeout(()=>{this.PollRoomInfo()},6000);
  }

  copyClientVideoURL() {
    let text = this.client['emulatedVideoRoomURL'];
    navigator.clipboard.writeText(text).then().catch(e => console.log(e));
    alert("Session link has been copied to your clipboard.");
    this.clientProceedToRoom = true;
  }

  gotoClientVideoRoom()
  {
    //if(confirm("This will take you to the video session, continue?"))
    {
      let checksum = this.g.AuthChecksum; // reset video room status from EndSession and other flags first
      let uuid = this.client['uuid'];
      this.http.post(this.g.API + 'RES',{checksum, uuid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      }).subscribe({
        next: (data) => {
          this.r.navigate(["/startSession/" + uuid]);
        }
      });
    }
  }

  gotoClientVideoRoomOld()
  {
    if(confirm("This will take you to the older room version, continue?"))
    {
      this.r.navigate(["/startSessionOld/" + this.client['crcid']]);
    }
  }

  gotoClientCalendarRoom()
  {
    this.r.navigate(["/client/scheduling/" + this.clientID]);
  }

  setClientAlreadyInvited()
  {
    this.clientProceedToRoom = true;
  }

  public deleteCurrentClient()
  {
    if(confirm("Are you sure want to remove this client?"))
    {
      let checksum = this.g.AuthChecksum;
      let CID = this.clientID;
      this.http.post(this.g.API + 'DCC',{checksum, CID},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        }).subscribe({
          next: (data) => {
            if(data !== '') // If it's empty, don't even parse
            {
              if(data == 'Y') this.r.navigate(['clients']);
            }
          },
          error: (e) => {
            console.log('DCC(): Error', e);
          }
        });  
    }
  }

  public getAccessLevel()
  {
    if(!this.g.userData) return 1;
    else return this.g.userData['accesslevel'];
  }

  public isOwnerOfCurrentClient()
  {
    let CID = this.clientID;
    if(!this.g.userData || !CID) return 0;
    let UID = this.g.userData.id;
    if(!UID || !this.client) return 0;
    if(this.client['isCreator']) return 1;
  }

  /*SendClientEmail()
  {
    this.emailresponsetype = 0;
    let checksum = this.g.AuthChecksum;
    let id = this.clientID;
    this.http.post(this.g.API + 'SEC.php',{checksum,id},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          //console.log(data);
          if(data.length>0)
          {
            if(data == 'U') {  this.emailresponsetype = 1; } // Unauthorized
            else if(data == 'C') {  this.emailresponsetype = 2; } // No client with that ID was found
            else if(data == 'N') {  this.emailresponsetype = 3; } // Email function reported it failed to send (might still send)
            else if(data == 'Y') { this.emailresponsetype = 4; } // Email sent successfully
            else this.emailresponsetype = 3; // Default failure or if bigger error happens is 3
          }
        },
        error => {
          console.log('SendEmailClient(): Error', error);
        }
    ); 
  }*/

  /*md5(inputString) {
    var hc="0123456789abcdef";
    function rh(n) {var j,s="";for(j=0;j<=3;j++) s+=hc.charAt((n>>(j*8+4))&0x0F)+hc.charAt((n>>(j*8))&0x0F);return s;}
    function ad(x,y) {var l=(x&0xFFFF)+(y&0xFFFF);var m=(x>>16)+(y>>16)+(l>>16);return (m<<16)|(l&0xFFFF);}
    function rl(n,c)            {return (n<<c)|(n>>>(32-c));}
    function cm(q,a,b,x,s,t)    {return ad(rl(ad(ad(a,q),ad(x,t)),s),b);}
    function ff(a,b,c,d,x,s,t)  {return cm((b&c)|((~b)&d),a,b,x,s,t);}
    function gg(a,b,c,d,x,s,t)  {return cm((b&d)|(c&(~d)),a,b,x,s,t);}
    function hh(a,b,c,d,x,s,t)  {return cm(b^c^d,a,b,x,s,t);}
    function ii(a,b,c,d,x,s,t)  {return cm(c^(b|(~d)),a,b,x,s,t);}
    function sb(x) {
        var i;var nblk=((x.length+8)>>6)+1;var blks=new Array(nblk*16);for(i=0;i<nblk*16;i++) blks[i]=0;
        for(i=0;i<x.length;i++) blks[i>>2]|=x.charCodeAt(i)<<((i%4)*8);
        blks[i>>2]|=0x80<<((i%4)*8);blks[nblk*16-2]=x.length*8;return blks;
    }
    var i,x=sb(inputString),a=1732584193,b=-271733879,c=-1732584194,d=271733878,olda,oldb,oldc,oldd;
    for(i=0;i<x.length;i+=16) {olda=a;oldb=b;oldc=c;oldd=d;
        a=ff(a,b,c,d,x[i+ 0], 7, -680876936);d=ff(d,a,b,c,x[i+ 1],12, -389564586);c=ff(c,d,a,b,x[i+ 2],17,  606105819);
        b=ff(b,c,d,a,x[i+ 3],22,-1044525330);a=ff(a,b,c,d,x[i+ 4], 7, -176418897);d=ff(d,a,b,c,x[i+ 5],12, 1200080426);
        c=ff(c,d,a,b,x[i+ 6],17,-1473231341);b=ff(b,c,d,a,x[i+ 7],22,  -45705983);a=ff(a,b,c,d,x[i+ 8], 7, 1770035416);
        d=ff(d,a,b,c,x[i+ 9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,     -42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
        a=ff(a,b,c,d,x[i+12], 7, 1804603682);d=ff(d,a,b,c,x[i+13],12,  -40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);
        b=ff(b,c,d,a,x[i+15],22, 1236535329);a=gg(a,b,c,d,x[i+ 1], 5, -165796510);d=gg(d,a,b,c,x[i+ 6], 9,-1069501632);
        c=gg(c,d,a,b,x[i+11],14,  643717713);b=gg(b,c,d,a,x[i+ 0],20, -373897302);a=gg(a,b,c,d,x[i+ 5], 5, -701558691);
        d=gg(d,a,b,c,x[i+10], 9,   38016083);c=gg(c,d,a,b,x[i+15],14, -660478335);b=gg(b,c,d,a,x[i+ 4],20, -405537848);
        a=gg(a,b,c,d,x[i+ 9], 5,  568446438);d=gg(d,a,b,c,x[i+14], 9,-1019803690);c=gg(c,d,a,b,x[i+ 3],14, -187363961);
        b=gg(b,c,d,a,x[i+ 8],20, 1163531501);a=gg(a,b,c,d,x[i+13], 5,-1444681467);d=gg(d,a,b,c,x[i+ 2], 9,  -51403784);
        c=gg(c,d,a,b,x[i+ 7],14, 1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);a=hh(a,b,c,d,x[i+ 5], 4,    -378558);
        d=hh(d,a,b,c,x[i+ 8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16, 1839030562);b=hh(b,c,d,a,x[i+14],23,  -35309556);
        a=hh(a,b,c,d,x[i+ 1], 4,-1530992060);d=hh(d,a,b,c,x[i+ 4],11, 1272893353);c=hh(c,d,a,b,x[i+ 7],16, -155497632);
        b=hh(b,c,d,a,x[i+10],23,-1094730640);a=hh(a,b,c,d,x[i+13], 4,  681279174);d=hh(d,a,b,c,x[i+ 0],11, -358537222);
        c=hh(c,d,a,b,x[i+ 3],16, -722521979);b=hh(b,c,d,a,x[i+ 6],23,   76029189);a=hh(a,b,c,d,x[i+ 9], 4, -640364487);
        d=hh(d,a,b,c,x[i+12],11, -421815835);c=hh(c,d,a,b,x[i+15],16,  530742520);b=hh(b,c,d,a,x[i+ 2],23, -995338651);
        a=ii(a,b,c,d,x[i+ 0], 6, -198630844);d=ii(d,a,b,c,x[i+ 7],10, 1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);
        b=ii(b,c,d,a,x[i+ 5],21,  -57434055);a=ii(a,b,c,d,x[i+12], 6, 1700485571);d=ii(d,a,b,c,x[i+ 3],10,-1894986606);
        c=ii(c,d,a,b,x[i+10],15,   -1051523);b=ii(b,c,d,a,x[i+ 1],21,-2054922799);a=ii(a,b,c,d,x[i+ 8], 6, 1873313359);
        d=ii(d,a,b,c,x[i+15],10,  -30611744);c=ii(c,d,a,b,x[i+ 6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21, 1309151649);
        a=ii(a,b,c,d,x[i+ 4], 6, -145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+ 2],15,  718787259);
        b=ii(b,c,d,a,x[i+ 9],21, -343485551);a=ad(a,olda);b=ad(b,oldb);c=ad(c,oldc);d=ad(d,oldd);
    }
    return rh(a)+rh(b)+rh(c)+rh(d);
}*/

  gotoEdit() {
    this.r.navigate(["/client/edit/" + this.clientID]);
  }

  gotoRefreshReport(id) {
    if(!id) { console.log("No ID given for transition"); return; }
    this.r.navigate(["/accounts/assetrefresh/" + id]);
  }

  gotoGetLastError(id){
    if(!id) { console.log("No ID given for transition"); return; }
    this.r.navigate(["/accounts/asseterrors/" + id]);
  }

  gotoGetAccountNumber(id){
    if(!id) { console.log("No ID given for transition"); return; }
    this.r.navigate(["/accounts/numbers/" + id]);
  }

  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.clientID = id;
    if(this.clientID != 'view' && this.clientID != '') 
    {
      this.GetClientInfo(this.clientID);
      this.GetClientLastScheduled();
      this.GetClientFirstRelatedPhysician();
      sessionStorage.setItem('BMLastClient', this.clientID);
    }
    this.g.GetUserData();

    // Setup session status or other tips
    /*setTimeout( () =>{

      tippy('#sessionstatus', {
        content: '<strong>Session Status</strong><br/><p>Will display if anyone has entered the session.</p>',
        allowHTML: true,
        placement: 'top',
        delay: 100,
      });

      tippy('#name', {
        content: '<strong>Name</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#phone', {
        content: '<strong>Name</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#email', {
        content: '<strong>Name</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#createdon', {
        content: '<strong>CreatedOn</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#address', {
        content: '<strong>Address</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#therapist', {
        content: '<strong>Therapist</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#notes', {
        content: '<strong>Notes</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#lastscheduled', {
        content: '<strong>Last scheduled date that was passed</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });

      tippy('#nextscheduled', {
        content: '<strong>Upcoming scheduled session date</strong>',
        allowHTML: true,
        placement: 'right',
        delay: 600,
      });
    }, 500)*/
  }
  ngOnDestroy(): void {
    //this.clientemailSubscription.unsubscribe();
  }
}
