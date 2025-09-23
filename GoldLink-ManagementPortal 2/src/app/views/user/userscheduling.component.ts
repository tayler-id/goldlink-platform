import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';
import VanillaCalendar from '../../../assets/js/vanilla-calendar.min.js';
import { ModalDirective } from 'ngx-bootstrap/modal';
import { TimepickerUI } from '../../../assets/js/timepicker-ui.esm';

@Component({
  templateUrl: 'userscheduling.component.html'
})
export class UserSchedulingComponent implements OnInit, AfterViewInit {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;
  public clientresponsetype:number = 0;
  public userID:string = '';
  public selectedScheduleID:number = 0;
  public isLoaded:boolean = false;
  public isCollapsed: boolean = false;
  public client:object = {};
  public accounts:object = {};
  public scheduleresponsetype:number = 0;
  public addscheduleresponsetype: number = 0;
  public editscheduleresponsetype: number = 0;
  public schedules = [];
  public numberOfUpcomingSchedules = 0;
  public trimmedschedules = [];
  public hasEmail:boolean = false;
  public hasPhone:boolean = false;
  public sessionLength: number = 30;
  public editModalStatus: number = 0;
  public editschedule = 0;
  public clientIDSelected = 0;
  public clientnameSelected = '';
  public isSchedulingTableCollapsed = false;
  public isInfoCollapsed = false;
  public isCalendarCollapsed = false;
  public timeZone = '';
  public timeString = '';
  public tzOffset = -1; 
  public lastSetData = {'date': '', 'clientname': '', 'sentemail': false, 'senttext': false}

  gotoView() {
    this.r.navigate(["/clients/"]);
  }

  public clientemailChanged: Subject<string> = new Subject<string>();
  private clientemailSubscription: Subscription
  public clientemail: string = '';
  public emailisvalid: boolean = false;
  public clientnameChanged: Subject<string> = new Subject<string>();
  private clientnameSubscription: Subscription
  public clientname: string = '';
  public nameisvalid: boolean = false;
  public clients = [];
  public clientLoadedStatus = 0;
  public TimezoneOffset = 5; // EST
  public OriginalTimezoneOffset = 5; // EST
  public dayLightSavings = false;

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

  @ViewChild('setDateModal') public setDateModal: ModalDirective;
  @ViewChild('pickDateModal') public pickDateModal: ModalDirective;
  @ViewChild('pickActionModal') public pickActionModal: ModalDirective;
  @ViewChild('editDateModal') public pickEditModal: ModalDirective;
  public date: string = '';
  public datetopstr: string = '';
  public datelocal = {hour:9, minute:0};
  public clickedDate(event, dates)
  {
    //console.log(event, dates);
    let date = dates[0];
    if(date) 
    {
      this.date = date;

      let split = this.date.split('-');
      let day = +split[2];
      let month = +split[1];
      let year = +split[0];
      this.datetopstr = '' + month + '/' + day + '/' + year;
    }

    let hasAlready = false;
    this.trimmedschedules = [];
    for(let i=0;i<this.schedules.length;i++)
    {
      let schedule = this.schedules[i];
      if(!schedule) continue;

      // Split the datetime
      let t = schedule.date.split(/[- :]/);
      for(let i=0;i<t.length;i++)
      {
        let splited = t[i];
        if(!splited) continue;
        t[i] = parseInt(t[i]);
      }

      // Split the clicked date
      let split = this.date.split('-');
      let day = +split[2];
      let month = +split[1];
      month--;
      let year = +split[0];

      // Apply each element to the Date function
      let datet = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
      if(datet.getFullYear() == year && datet.getMonth() == month && datet.getDate() == day) 
      { 
        // Test
        let year = datet.getFullYear().toString();
        let day = datet.getDate().toString();
        if(datet.getDate() < 10) day = '0' + day;
        let monthnum = datet.getMonth()+1;
        let month = monthnum.toString();
        if(monthnum < 10) month = '0' + month;
        let keystr = '' + year + '-' + month + '-' + day;
        let hour = '';
        let offsetDifference = Math.floor(datet.getTimezoneOffset()/60);
        offsetDifference += this.TimezoneOffset;
        //datet.setHours(datet.getHours()+this.TimezoneOffset-offsetDifference); // EST
        datet.setHours(datet.getHours()+this.TimezoneOffset); // EST
        if(datet.getHours()>12) hour = (datet.getHours() - 12).toString();
        else hour = datet.getHours().toString();
        let minute = datet.getMinutes().toString();
        if(datet.getHours()<10) hour = '0' + hour;
        if(datet.getMinutes()<10) minute = '0' + minute;
        let type = ' AM';
        if(datet.getHours()>12) type = ' PM';
        let formattime = month + '/' + day + '/' + year + ' at ' + hour + ':' + minute + type;

        hasAlready = true; 
        schedule['formattedDate'] = formattime;
        schedule['clientname'] = schedule.name;
        this.trimmedschedules.push(schedule);
        //break; 
      }


    }

    if(!hasAlready) this.pickDateModal.show();
    else { this.editModalStatus = 0; this.pickActionModal.show(); } // always show add new one for now
  }

  private PushInvolvedClients()
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GICS',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data !== '' && data.length>2) // If it's empty, don't even parse
          {
            let clientdata = JSON.parse(data);   
            for(let i=0;i<clientdata.length;i++)
            {
              let client = clientdata[i];
              if(!client) continue;
              let existsAlready = false;

              for(let j=0;j<this.clients.length;j++)
              {
                let existingclient = this.clients[j];
                if(existingclient.id == client.id) existsAlready = true; 
              }

              if(existsAlready) continue;
              this.clients.push({'name': client.name, 'id': client.id});
            }
          }
        },
        error => {
          console.log('GetInvolvedClients(): Error', error);
        }
    ); 
  }

  private setupCalendar(angularcontext)
  {
    let popups = {};
    let cyclecolors = ['bg-orange', 'bg-blue', 'bg-purple', 'bg-yellow'];
    let cycleindex = 0;
    let cyclebyname = {};

    // Create color by patient name
    for(let i=0;i<this.schedules.length;i++)
    {
      let schedule = this.schedules[i];
      if(!schedule) continue;
      let curName = schedule.name;
      if(cyclebyname[curName] === undefined) { 
        cyclebyname[curName] = cyclecolors[cycleindex];
         cycleindex++; 
         if(cycleindex>=cyclecolors.length) cycleindex=0;
         this.clients.push({'name': curName, 'id': schedule.cid});
      } 
    }

    // Push involved clients that aren't yet in the schedules list
    this.PushInvolvedClients();
    
    // Create schedules length
    this.numberOfUpcomingSchedules = 0;
    for(let i=0;i<this.schedules.length;i++)
    {
      let schedule = this.schedules[i];
      if(!schedule) continue;
      // Split timestamp into [ Y, M, D, h, m, s ]
      schedule.date = schedule.date.replace(/[TZ]/g, ':');
      let t = schedule.date.split(/[- :]/);
      for(let i=0;i<t.length;i++)
      {
        let splited = t[i];
        if(!splited) continue;
        t[i] = parseInt(t[i]);
      }
      // Apply each element to the Date function
      let datet = new Date(t[0], t[1], t[2], t[3], t[4], t[5]);
      let datecmp = new Date(datet);
      datecmp.setMonth(datecmp.getMonth()-1);
      let curDate = new Date();
      //console.log(curDate, datecmp);
      schedule['hasPassed'] = 'Upcoming';
      this.numberOfUpcomingSchedules++;
      if(((curDate.getFullYear() >= datet.getFullYear()) && (curDate.getMonth() >= datet.getMonth())) || curDate>datecmp) { schedule['hasPassed'] = 'Past'; this.numberOfUpcomingSchedules--; }
      if((curDate.getFullYear() == datecmp.getFullYear()) && (curDate.getMonth() == datecmp.getMonth()) && (curDate.getDate() == datecmp.getDate())) { schedule['hasPassed'] = 'Today'; }
      let year = datet.getFullYear().toString();
      let day = datet.getDate().toString();
      if(datet.getDate() < 10) day = '0' + day;
      let month = datet.getMonth().toString();
      if(datet.getMonth() < 10) month = '0' + month;
      let keystr = '' + year + '-' + month + '-' + day;
      let hour = '';
      let offsetDifference = Math.floor(datet.getTimezoneOffset()/60);
      offsetDifference += this.TimezoneOffset;
      //datet.setHours(datet.getHours()+this.TimezoneOffset-offsetDifference); // EST
      datet.setHours(datet.getHours()+this.TimezoneOffset); // EST
      if(datet.getHours()>12) hour = (datet.getHours() - 12).toString();
      else hour = datet.getHours().toString();
      let minute = datet.getMinutes().toString();
      if(datet.getHours()<10) hour = '0' + hour;
      if(datet.getMinutes()<10) minute = '0' + minute;
      let type = ' AM';
      if(datet.getHours()>12) type = ' PM';
      let formattime = '' + hour + ':' + minute + type;

      //console.log(keystr, formattime);

      // support for showing multiple things for 1 day
      if(popups[keystr] === undefined) popups[keystr] = { modifier: cyclebyname[schedule.name], html: `<div><u><b>` + formattime + `</b></u><p style="margin: 5px 0 0;">Session was scheduled by ` + schedule.displaynamefirst + ` ` + schedule.displaynamelast + ` with ` + schedule.name + ` for ` + schedule.length + ` minutes</p></div>` };
      else popups[keystr].html += `<br/><div><u><b>` + formattime + `</b></u><p style="margin: 5px 0 0;">Session was scheduled by ` + schedule.displaynamefirst + ` ` + schedule.displaynamelast + ` with ` + schedule.name + ` for ` + schedule.length +` minutes</p></div>`;
    }
    
    /*popups: {
      '2023-02-28': {
        modifier: 'bg-red',
        html: 'Meeting at 9:00 PM',
      },
      '2023-02-13': {
        modifier: 'bg-red',
        html: 'Meeting at 6:00 PM',
      },
      '2023-02-17': {
        modifier: 'bg-orange',
        html: `<div>
          <u><b>12:00 PM</b></u>
          <p style="margin: 5px 0 0;">Airplane in Las Vegas</p>
        </div>`,
      },
    },*/
    
    let CurDate = new Date();
    let curDateMonth = (CurDate.getMonth() + 1).toString();
    if(CurDate.getMonth() < 10) curDateMonth = '0' + curDateMonth;
    let curDateDay = CurDate.getDate().toString();
    if(CurDate.getDate() < 10) curDateDay = '0' + curDateDay;
    let minStr = '' + CurDate.getFullYear() + '-' + curDateMonth + '-' + curDateDay;
    //console.log(minStr);

    const calendar = new VanillaCalendar('#calendar', {
    settings: {
        range: {
          min: minStr,
          max: '9999-01-01',
        },
        selected: {
          year: CurDate.getFullYear(),
          month: CurDate.getMonth(),
        },
    },
    popups: popups,
    actions: {
      clickDay(event, dates) 
      {
        //console.log(event, dates);
        angularcontext.clickedDate(event, dates);
      }
    }

    });
		calendar.init();


    // Change the scheduilng table to have no entries showing labelled 'Past'
    setTimeout( ()=> { 
      document.querySelectorAll('td').forEach(function(td) {
        if (td.textContent.includes('Past')) {
          //td.parentElement.style.display = 'none';
          td.parentElement.remove();
        }
    }, 100);
    });
  }

  GetSchedulesforUser(id)
  {
      let checksum = this.g.AuthChecksum;
      this.scheduleresponsetype = 0;
      this.http.post(this.g.API + 'GSU',{checksum,id},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {

            if(data.length == 1 && data == 'Y')
            {
              this.setupCalendar(this);
              this.isLoaded=true;
            }
            if(data.length>1)
            {
              // Parse client data
              this.schedules = JSON.parse(data);   
              //console.log(this.schedules);
              this.setupCalendar(this);

              for(let i=0;i<this.schedules.length;i++)
              {
                let schedule = this.schedules[i];
                if(!schedule) continue;
          
                // Split the datetime
                let t = schedule.date.split(/[- :]/);
                for(let i=0;i<t.length;i++)
                {
                  let splited = t[i];
                  if(!splited) continue;
                  t[i] = parseInt(t[i]);
                }
          
                // Apply each element to the Date function
                let datet = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
                {
                  // Test
                  let year = datet.getFullYear().toString();
                  let day = datet.getDate().toString();
                  if(datet.getDate() < 10) day = '0' + day;
                  let monthnum = datet.getMonth()+1;
                  let month = monthnum.toString();
                  if(monthnum < 10) month = '0' + month;
                  let keystr = '' + year + '-' + month + '-' + day;
                  let hour = '';
                  let adjustForDaylightSavings = 0;
                  //if(this.dayLightSavings) adjustForDaylightSavings = 1;
                  let offsetDifference = Math.floor(datet.getTimezoneOffset()/60);
                  offsetDifference += this.TimezoneOffset;
                  //datet.setHours(datet.getHours()+this.TimezoneOffset-offsetDifference); // EST
                  datet.setHours(datet.getHours()+this.TimezoneOffset); // EST
                  //console.log(datet.toString(), this.TimezoneOffset, offsetDifference);
                  if(datet.getHours()>12) hour = (datet.getHours() - 12).toString();
                  else hour = datet.getHours().toString();
                  let minute = datet.getMinutes().toString();
                  if(datet.getHours()<10) hour = '0' + hour;
                  if(datet.getMinutes()<10) minute = '0' + minute;
                  let type = ' AM';
                  if(datet.getHours()>12) type = ' PM';
                  let formattime = month + '/' + day + '/' + year + ' at ' + hour + ':' + minute + type;
                  schedule['formattedDate2'] = formattime;
                  schedule['clientname'] = schedule.name;
                }
              }

              this.isLoaded=true;
            }

          },
          error => {
            console.log('GetSchedulesforUser(): Error', error);
          }
      ); 
  }

  AddScheduleforUserClient()
  {
      let checksum = this.g.AuthChecksum;
      let id = '';
      this.addscheduleresponsetype = 0;
      let status = 0;
      let elem = <HTMLInputElement>document.getElementById("notif24");
      if(elem && elem.checked) status |= 1;
      elem = <HTMLInputElement>document.getElementById("notif1");
      if(elem && elem.checked) status |= 2;
      elem = <HTMLInputElement>document.getElementById("notiftext");
      if(elem && elem.checked) status |= 16;
      elem = <HTMLInputElement>document.getElementById("notifemail");
      if(elem && elem.checked) status |= 32;
      elem = <HTMLInputElement>document.getElementById("clientname");
      if(elem && elem.value) id = elem.value;
      let minutes = this.datelocal.minute;
      let hour = this.datelocal.hour;
      let split = this.date.split('-');
      let day = +split[2];
      let month = +split[1];
      month--;
      let year = +split[0];
      let slength = this.sessionLength;
      let datet = new Date(year, month, day, hour, minutes);
      let offsetDifference = Math.floor(datet.getTimezoneOffset()/60); 
      offsetDifference += this.TimezoneOffset; // must be in the proper EST or GMT-EST time no matter what is displayed then
      datet.setHours(datet.getHours()-Math.floor(datet.getTimezoneOffset()/60)-offsetDifference); // EST
      let date = datet.toISOString().slice(0, 19).replace('T', ' ');
      //console.log(datet, date, this.TimezoneOffset, offsetDifference);
      //let date = datet.dateToISO8601String().replace('T', ' ');
      this.lastSetData.date = '';
      this.lastSetData.sentemail = false;
      this.lastSetData.senttext = false;
      this.lastSetData.clientname = '';
      this.http.post(this.g.API + 'ASC',{checksum,id,status,date,slength},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data && data.includes('Y'))
            {
              let sid = parseInt(data.substring(1));
              //this.GetSchedulesforUser(id);
              this.lastSetData.clientname = this.clientnameSelected;
              this.lastSetData.date = date;
              this.addscheduleresponsetype = 1;
              this.pickDateModal.hide();
              if(sid && (status&16)) { this.sendASessionText(sid); this.lastSetData.senttext = true; } 
              if(sid && (status&32)) { this.sendASessionEmail(sid); this.lastSetData.sentemail = true; }
              this.setDateModal.show();
            }
            else if(data && data.includes('O'))
            {
              this.addscheduleresponsetype = 3;
            }
            else this.addscheduleresponsetype = 2;
          },
          error => {
            console.log('AddScheduleforUserClient(): Error', error);
          }
      ); 
  }

  onSetupClosed()
  {
    setTimeout( ()=> { location.reload(); }, 100);
  }

  sendASessionText(sid)
  {
    let checksum = this.g.AuthChecksum;
    let cid = this.userID;
    this.http.post(this.g.API + 'SCST2',{checksum,cid,sid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
        },
        error => {
          console.log('sendASessionText(): Error', error);
        }
    ); 
  }

  sendASessionEmail(sid)
  {
    let checksum = this.g.AuthChecksum;
    let cid = this.userID;
    this.http.post(this.g.API + 'SCSE2',{checksum,cid,sid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
        },
        error => {
          console.log('sendASessionEmail(): Error', error);
        }
    ); 
  }

  EditScheduleforUserClient()
  {
    let checksum = this.g.AuthChecksum;
    let id = this.selectedScheduleID;
    this.editscheduleresponsetype = 0;
    let status = 0;
    let elem = <HTMLInputElement>document.getElementById("notif242");
    if(elem && elem.checked) status |= 1;
    elem = <HTMLInputElement>document.getElementById("notif12");
    if(elem && elem.checked) status |= 2;
    elem = <HTMLInputElement>document.getElementById("notiftext2");
    if(elem && elem.checked) status |= 16;
    elem = <HTMLInputElement>document.getElementById("notifemail2");
    if(elem && elem.checked) status |= 32;
    let slength = this.sessionLength;
    let deletes = false;
    elem = <HTMLInputElement>document.getElementById("cancelsession2");
    if(elem && elem.checked) deletes=true;
    this.http.post(this.g.API + 'ESC',{checksum,id,status,slength,deletes},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data == 'Y')
          {
            this.editscheduleresponsetype = 1;
            this.trimmedschedules = [];
            if(deletes) 
            { 
              this.pickEditModal.hide();
              location.reload();
            }
            else this.GetSchedulesforUser(id);
            this.editschedule['status'] = status;
          }
          else this.editscheduleresponsetype = 2;
        },
        error => {
          console.log('EditScheduleforUser(): Error', error);
        }
    ); 
  }

  editModalSetupControls()
  {
    let status = this.editschedule['status'];
    let slength = this.editschedule['length'];
    let elem = <HTMLInputElement>document.getElementById("notif242");
    if(elem && (status&1)) elem.checked = true;
    else elem.checked = false;
    elem = <HTMLInputElement>document.getElementById("notif12");
    if(elem && (status&2)) elem.checked = true;
    else elem.checked = false;
    elem = <HTMLInputElement>document.getElementById("notiftext2");
    if(elem && (status&16)) elem.checked = true;
    else elem.checked = false;
    elem = <HTMLInputElement>document.getElementById("notifemail2");
    if(elem && (status&32)) elem.checked = true;
    else elem.checked = false;
    elem = <HTMLInputElement>document.getElementById("minutes2");
    if(elem && slength) { this.setMinutes(slength); elem.value = slength; };
  }

  editModalGoTo(id)
  {
    // Set modal/id status
    if(id<=0) this.editModalStatus = 0;
    else if(this.editModalStatus==0) this.editModalStatus = 1;
    this.selectedScheduleID = id;

    // Get session
    this.editschedule = 0;
    for(let i=0;i<this.schedules.length;i++)
    {
      let schedule = this.schedules[i];
      if(!schedule) continue;
      if(schedule.id == id) { this.editschedule = schedule; break; }
    } 

    // Get Client Info, then Set controls
    if(this.editschedule)
    {
        this.clientLoadedStatus = 1; // Loading Circle
        let id = this.editschedule['cid'];
  
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
  
                // Set succesful response
                this.clientresponsetype = 1;
                this.clientLoadedStatus = 2;
                //console.log(this.client);
  
                this.hasEmail = false;
                if(this.client['email'] !== undefined && this.client['email'].length>5)
                {
                  this.hasEmail = true;
                }
  
                this.hasPhone = false;
                if(this.client['phone'] !== undefined && this.client['phone'].length>5)
                {
                  this.hasPhone = true;
                }
              }

              setTimeout( ()=> {
                this.editModalSetupControls();
              }, 10);
              setTimeout( ()=> {
                this.editModalSetupControls();
              }, 100);
            },
            error => {
              console.log('GetUserClientInfo(): Error', error);
            }
        ); 
    }
  }

  setMinutes(value)
  {
    this.sessionLength = value;
  }

  GetUserData()
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GUD',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data !== '' && data.length>2) // If it's empty, don't even parse
          {
            this.g.userData = JSON.parse(data);

            // Access levels and add to navbar
            if(this.g.userData)
            {
              let accesslevel = this.g.userData['accesslevel'];
              if(accesslevel) 
              {
                this.g.AccessLevel = accesslevel;
                sessionStorage.setItem('BMUserAccess', accesslevel);
              }
              if(this.g.userData.id !== undefined) this.g.UID = this.g.userData.id;
            }

            let str = window.location.href;
            let id = str.substring(str.lastIndexOf("/") + 1, str.length);
            if(id !== "scheduling") 
            {
              this.userID = id;
              this.GetSchedulesforUser(this.userID);
            }
            else 
            {
              this.userID = this.g.userData.id;
              this.GetSchedulesforUser(this.userID);
            }
          }
        },
        error => {
          console.log('GetUserData(): Error', error);
        }
    ); 
  }

  onClientNameChange(e)
  {
    // Save
    this.clientIDSelected = e.target.value;
    let selectedindex = e.target.selectedIndex;
    this.clientnameSelected = e.target.options[selectedindex].text;

    // Get client email/phone fields to proceed first
    if(this.clientIDSelected == 0) { this.clientLoadedStatus = 0; this.hasEmail = false; this.hasPhone = false; }
    if(this.clientIDSelected && this.clientIDSelected != 0)
    {
      this.clientLoadedStatus = 1; // Loading Circle
      let id = this.clientIDSelected;

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

              // Set succesful response
              this.clientresponsetype = 1;
              this.clientLoadedStatus = 2;
              //console.log(this.client);

              this.hasEmail = false;
              if(this.client['email'] !== undefined && this.client['email'].length>5)
              {
                this.hasEmail = true;
              }

              this.hasPhone = false;
              if(this.client['phone'] !== undefined && this.client['phone'].length>5)
              {
                this.hasPhone = true;
              }
            }
          },
          error => {
            console.log('GetUserClientInfo(): Error', error);
          }
      ); 
    }
  }

  sortctablebyname(n)
  {
    let table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("schedulingtable1");
    if(!table) return;
    switching = true;
    // Set the sorting direction to ascending:
    dir = "asc";
    /* Make a loop that will continue until
    no switching has been done: */
    while (switching) {
      // Start by saying: no switching is done:
      switching = false;
      rows = table.rows;
      /* Loop through all table rows (except the
      first, which contains table headers): */
      for (i = 1; i < (rows.length - 1); i++) {
        // Start by saying there should be no switching:
        shouldSwitch = false;
        /* Get the two elements you want to compare,
        one from current row and one from the next: */
        /*if(n==0)
        {
        x = rows[i].getElementsByTagName("a")[n];
        y = rows[i + 1].getElementsByTagName("a")[n];
        }
        else */
        {
        x = rows[i].getElementsByTagName("TD")[n];
        y = rows[i + 1].getElementsByTagName("TD")[n];
        }
        /* Check if the two rows should switch place,
        based on the direction, asc or desc: */
        if (dir == "asc") {
          if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
            // If so, mark as a switch and break the loop:
            shouldSwitch = true;
            break;
          }
        } else if (dir == "desc") {
          if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
            // If so, mark as a switch and break the loop:
            shouldSwitch = true;
            break;
          }
        }
      }
      if (shouldSwitch) {
        /* If a switch has been marked, make the switch
        and mark that a switch has been done: */
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
        // Each time a switch is done, increase this count by 1:
        switchcount ++;
      } else {
        /* If no switching has been done AND the direction is "asc",
        set the direction to "desc" and run the while loop again. */
        if (switchcount == 0 && dir == "asc") {
          dir = "desc";
          switching = true;
        }
      }
    }
  }

  addCalendarDayClickability()
  {
    let calendarDays = document.getElementsByClassName('vanilla-calendar-day');
    for(let i=0;i<calendarDays.length;i++)
    {
      let elem = calendarDays[i];
      let childelem:any = elem.children[0];
      if(childelem)
      {
        if(childelem.classList.contains('vanilla-calendar-day__btn_disabled')) continue;
        elem.addEventListener("click", ()=>{childelem.click()});
      }
    }
  }

  ngOnInit(): void {

    this.g.userData = '';
    if(!this.g.userData) this.GetUserData();
    else
    {
      let str = window.location.href;
      let id = str.substring(str.lastIndexOf("/") + 1, str.length);
      if(id !== "scheduling") 
      {
        this.userID = id;
        this.GetSchedulesforUser(this.userID);
      }
      else 
      {
        this.userID = this.g.userData.id;
        this.GetSchedulesforUser(this.userID);
      }
    }

  }

  @ViewChild('inputTimepicker') inputWrapper: ElementRef<HTMLDivElement>;
  ngAfterViewInit(): void {
    const element = this.inputWrapper?.nativeElement;
    const myTimePicker = new TimepickerUI(element, {enableSwitchIcon: true});
    myTimePicker.create();
    element.addEventListener('accept', ev => {
      let hours = ev['detail'].hour;
      let minutes = ev['detail'].minutes;
      this.datelocal.hour = parseInt(hours);
      if(ev['detail'].type == 'PM') 
      {
        if(hours >= 12) this.datelocal.hour = hours; // if its 12 PM for example, then it's just 12, if it's 12AM, it would be 24..
        else this.datelocal.hour+=12;
        this.datelocal.minute = parseInt(minutes);
        //console.log(this.datelocal);
      }
      if(ev['detail'].type == 'AM' && hours>=12) this.datelocal.hour = 24; 
    });

    setTimeout(()=>{this.sortctablebyname(2);}, 100)

    setInterval(()=>{this.addCalendarDayClickability();}, 1000)

    // Save original TimezoneOffset
    this.OriginalTimezoneOffset = this.TimezoneOffset;


    // Daylight Savings Time
   /* let curDate = new Date();
    let hasDone = false;
    let hasConditions = false;
    if(curDate.getMonth() >= 3 && curDate.getMonth() <= 9 && !hasDone) hasConditions = true;
    if((curDate.getMonth() == 2 && curDate.getDate()>=12) && (curDate.getMonth() == 10 && curDate.getDate() <= 5) && !hasDone) hasConditions = true;
    if(hasConditions && !hasDone)
    {
      this.TimezoneOffset -= 1;
      this.dayLightSavings = true;
      hasDone = true;
    }

    // Timezone
    let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if(tz) 
    {
      this.timeZone = tz;
      //console.log("Default Timezone Offset (EST): ", this.TimezoneOffset);
      let offset = -getTimezoneOffset(tz, Date.now());
      //console.log("New timezone offset: ", offset);
      if(offset != this.TimezoneOffset) this.TimezoneOffset = offset;
    }

    // Set current time?
    this.timeString = new Date().toLocaleTimeString('en-us');*/
      
    let angularContext = this;
    waitToLoadTimezoneData();
    function waitToLoadTimezoneData()
    {
      let user = angularContext.g.userData;
      if(!user) { setTimeout( ()=> { waitToLoadTimezoneData(); }, 50); return; }
      loadTimezoneData();
    }
    function loadTimezoneData() {

    // Original user data
    let user = angularContext.g.userData;

    let timezoneOffset = user.tzOffset;
    let curDate = new Date();

    let timeZone = '';
    let dayLightSavings = false;
    let timeString = '';
    if(timezoneOffset == 255) 
    {
      // Timezone
      let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      timeZone = tz;
      //console.log("Default Timezone Offset (EST): ", angularContext.TimezoneOffset);
      let offset = getTimezoneOffset(tz, Date.now());
      //console.log("New timezone offset: ", offset);
      if(offset != timezoneOffset) timezoneOffset = offset;

      // Daylight Savings Time
      let hasDone = false;
      let hasConditions = false;
      if(curDate.getMonth() >= 3 && curDate.getMonth() <= 9 && !hasDone) hasConditions = true;
      if((curDate.getMonth() == 2 && curDate.getDate()>=12) && (curDate.getMonth() == 10 && curDate.getDate() <= 5) && !hasDone) hasConditions = true;
      if(hasConditions && !hasDone && tz.includes("America"))
      {
        //timezoneOffset -= 1;
        dayLightSavings = true;
        angularContext.dayLightSavings = true;
        angularContext.TimezoneOffset = timezoneOffset;
        hasDone = true;
      }

      // Set current time?
      angularContext.timeString = curDate.toLocaleTimeString('en-us') + ' ' + timeZone;
      angularContext.tzOffset = timezoneOffset;
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
      
      if(user.tzOffset !== undefined) 
      {
        curDate.setHours( curDate.getHours() + (user.tzOffset) );
        //console.log(user, curDate, curDate.getTimezoneOffset(), tz);
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
        angularContext.dayLightSavings = true;
        hasDone = true;
      }

      // Create timeZone String
      let timeZone = '';
      let localoptions = {
        "255": 'Auto-Determined',
                  "-12":"(GMT -12:00) Eniwetok, Kwajalein",
                  "-11":"(GMT -11:00) Midway Island, Samoa",
                  "-10":"(GMT -10:00) Hawaii",
                  "-9":"(GMT -9:00) Alaska",
                  "-8":"(GMT -8:00) Pacific Time : (US & Canada)",
                  "-7":"(GMT -7:00) Mountain Time : (US & Canada)",
                  "-6":"(GMT -6:00) Central Time : (US & Canada)",
                  "-5":"(GMT -5:00) Eastern Time : (US & Canada)",
                  "-4":"(GMT -4:00) Atlantic Time : Canada, Caracas, La Paz",
                  "-3":"(GMT -3:00) Brazil, Buenos Aires, Georgetown",
                  "-2":"(GMT -2:00) Mid-Atlantic",
                  "-1":"(GMT -1:00) Azores, Cape Verde Islands",
                  "0":"(GMT) Western Europe Time, London, Lisbon, Casablanca",
                  "1":"(GMT +1:00) Brussels, Copenhagen, Madrid, Paris",
                  "2":"(GMT +2:00) Kaliningrad, South Africa",
                  "3":"(GMT +3:00) Baghdad, Riyadh, Moscow, St. Petersburg",
                  "4":"(GMT +4:00) Abu Dhabi, Muscat, Baku, Tbilisi",
                  "5":"(GMT +5:00) Ekaterinburg, Islamabad, Karachi, Tashkent",
                  "6":"(GMT +6:00) Almaty, Dhaka, Colombo",
                  "7":"(GMT +7:00) Bangkok, Hanoi, Jakarta",
                  "8":"(GMT +8:00) Beijing, Perth, Singapore, Hong Kong",
                  "9":"(GMT +9:00) Tokyo, Seoul, Osaka, Sapporo, Yakutsk",
                  "10":"(GMT +10:00) Eastern Australia, Guam, Vladivostok",
                  "11":"(GMT +11:00) Magadan, Solomon Islands, New Caledonia",
                  "12":"(GMT +12:00) Auckland, Wellington, Fiji, Kamchatka",
                  "13":"(GMT +13:00) Apia, Nukualofa",
                  "14":"(GMT +14:00) Line Islands, Tokelau",
      };
      if(localoptions[timezoneOffset] !== undefined) timeZone = localoptions['' + timezoneOffset];


      // Set other timezone stuff after string is done
      if(dayLightSavings)
      {
      curDate.setHours(curDate.getHours()+1);
      timezoneOffset = timezoneOffset+1;
      }

      // Create time String
      let timeString = curDate.toLocaleTimeString('en-us');

      // Create string
      angularContext.timeString = timeString + ' ' + timeZone;
      angularContext.TimezoneOffset = timezoneOffset;
      angularContext.tzOffset = timezoneOffset;
      //console.log(curDate, timeString, localoptions, localoptions['' + timezoneOffset]);
    }
    }
  }

  gotoSettings()
  {
    this.r.navigate(['/user/settings/timezone']);
  }
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

declare global {
  interface Date {
    dateToISO8601String() : String
  }
}

Date.prototype.dateToISO8601String  = function() {
  var padDigits = function padDigits(number, digits) {
      return Array(Math.max(digits - String(number).length + 1, 0)).join(((0).toString())) + number;
  }
  var offsetMinutes = this.getTimezoneOffset();
  var offsetHours:any = offsetMinutes / 60;
  var offset= "Z";    
  if (offsetHours < 0)
    offset = "-" + padDigits(offsetHours.replace("-","") + "00",4);
  else if (offsetHours > 0) 
    offset = "+" + padDigits(offsetHours  + "00", 4);

  return this.getFullYear() 
          + "-" + padDigits((this.getUTCMonth()+1),2) 
          + "-" + padDigits(this.getUTCDate(),2) 
          + "T" 
          + padDigits(this.getUTCHours(),2)
          + ":" + padDigits(this.getUTCMinutes(),2)
          + ":" + padDigits(this.getUTCSeconds(),2)
          + "." + padDigits(this.getUTCMilliseconds(),2)
          + offset;

}