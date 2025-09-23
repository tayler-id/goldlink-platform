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
  templateUrl: 'clientschedulingmobile.component.html'
})
export class ClientSchedulingComponentMobile implements OnInit, AfterViewInit {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;
  public clientresponsetype:number = 0;
  public clientID:string = '';
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
  public isMobileComponent:boolean = true;
  public isSchedulingTableCollapsed = false;
  public isInfoCollapsed = false;
  public TimezoneOffset = 5; // EST
  public dayLightSavings = false;
  public timeZone = '';
  public lastSetData = {'date': '', 'clientname': '', 'sentemail': false, 'senttext': false}

  GetClientID(id)
  {
    let checksum = this.g.AuthChecksum;
      this.clientresponsetype = 0;
      this.http.post(this.g.API + 'GCID',{checksum,id},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0 && data != 'N')
            {
              let retdata = JSON.parse(data);
              if(retdata) 
              {
                this.clientID = retdata[0].id;
                this.GetClientInfo(this.clientID);
                this.GetSchedulesforClient(this.clientID);
              }
            }
          },
          error => {
            console.log('GetClientID(): Error', error);
          }
      ); 
  }

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
            if(data.length>0 && data != 'N')
            {
              // Parse client data
              this.client = JSON.parse(data);
              this.client = this.client[0];

              // Set bitflags
              //this.client['hasSelfRegistered'] = (this.client['status'] & 8);
              //this.client['hasLeftFeedback'] = (this.client['status'] & 4);
              this.client['isStreaming'] = (this.client['status'] & 2);
              this.client['isActive'] = (this.client['status'] & 1);

              // Re-create address for client to access video room (hardcoded to save effort)
              this.client['emulatedVideoRoomURL'] = 'https://' + window.location.hostname + '/#/client/startSession/' + this.client['crcid'];

              // Email validation once loaded
              this.validateemail(this.client['email']);

              // Set succesful response
              this.clientresponsetype = 1;
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
            this.isLoaded = true;
          },
          error => {
            console.log('GetClientInfo(): Error', error);
          }
      ); 
  }

  gotoView() {
    this.r.navigate(["/client/view/" + this.clientID]);
  }

  public clientemailChanged: Subject<string> = new Subject<string>();
  private clientemailSubscription: Subscription
  public clientemail: string = '';
  public emailisvalid: boolean = false;
  public clientnameChanged: Subject<string> = new Subject<string>();
  private clientnameSubscription: Subscription
  public clientname: string = '';
  public nameisvalid: boolean = false;

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

  @ViewChild('pickDateModal') public pickDateModal: ModalDirective;
  @ViewChild('pickActionModal') public pickActionModal: ModalDirective;
  @ViewChild('editDateModal') public pickEditModal: ModalDirective;
  public date: string = '';
  public datetopstr: string = '';
  public datelocal = {hour:9, minute:0};
  public clickedDate(event, dates)
  {
    console.log(event, dates);
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
        console.log(schedule);
        // Test
        let year = datet.getFullYear().toString();
        let day = datet.getDate().toString();
        if(datet.getDate() < 10) day = '0' + day;
        let monthnum = datet.getMonth()+1;
        let month = monthnum.toString();
        if(monthnum < 10) month = '0' + month;
        let keystr = '' + year + '-' + month + '-' + day;
        let hour = '';
        datet.setHours(datet.getHours()-this.TimezoneOffset); // EST
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
        this.trimmedschedules.push(schedule);
        //break; 
      }

    }

    if(!hasAlready) this.pickDateModal.show();
    else { this.editModalStatus = 0; this.pickActionModal.show(); } // always show add new one for now
  }

  private setupCalendar(angularcontext)
  {
    let popups = {};

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
      datet.setHours(datet.getHours()-this.TimezoneOffset); // EST
      if(datet.getHours()>12) hour = (datet.getHours() - 12).toString();
      else hour = datet.getHours().toString();
      let minute = datet.getMinutes().toString();
      if(datet.getHours()<10) hour = '0' + hour;
      if(datet.getMinutes()<10) minute = '0' + minute;
      let type = ' AM';
      if(datet.getHours()>12) type = ' PM';
      let formattime = '' + hour + ':' + minute + type;

      // support for showing multiple things for 1 day
      if(popups[keystr] === undefined) popups[keystr] = { modifier: 'bg-orange', html: `<div><u><b>` + formattime + `</b></u><p style="margin: 5px 0 0;">Session is scheduled for ` + schedule.length + ` minutes</p></div>` };
      else popups[keystr].html += `<br/><div><u><b>` + formattime + `</b></u><p style="margin: 5px 0 0;">Session is scheduled for ` + schedule.length +` minutes</p></div>`;
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

  GetSchedulesforClient(id)
  {
      let checksum = this.g.AuthChecksum;
      this.scheduleresponsetype = 0;
      this.http.post(this.g.API + 'GSC',{checksum,id},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length == 1 && data == 'Y')
            {
              this.setupCalendar(this);
            }
            if(data.length>1)
            {
              // Parse client data
              this.schedules = JSON.parse(data);   
              this.setupCalendar(this);
            }
          },
          error => {
            console.log('GetSchedulesforClient(): Error', error);
          }
      ); 
  }

  AddScheduleforClient()
  {
      let checksum = this.g.AuthChecksum;
      let id = this.clientID;
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
      let minutes = this.datelocal.minute;
      let hour = this.datelocal.hour;
      let split = this.date.split('-');
      let day = +split[2];
      let month = +split[1];
      month--;
      let year = +split[0];
      let slength = this.sessionLength;
      let datet = new Date(year, month, day, hour, minutes);
      datet.setHours(datet.getHours()-this.TimezoneOffset); // EST
      let date = datet.toISOString().slice(0, 19).replace('T', ' ');
      this.http.post(this.g.API + 'ASC',{checksum,id,status,date,slength},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            console.log(data);
            if(data && data.includes('Y'))
            {
              let sid = parseInt(data.substring(1));
              console.log(sid);
              this.GetSchedulesforClient(id);
              this.addscheduleresponsetype = 1;
              this.pickDateModal.toggle();
              if(sid && (status&16)) this.sendASessionText(sid);
              if(sid && (status&32)) this.sendASessionEmail(sid);
            }
            else this.addscheduleresponsetype = 2;
          },
          error => {
            console.log('AddScheduleforClient(): Error', error);
          }
      ); 
  }

  sendASessionText(sid)
  {
    let checksum = this.g.AuthChecksum;
    let cid = this.clientID;
    this.http.post(this.g.API + 'SCST2',{checksum,cid,sid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
         
        },
        error => {
          console.log('AddScheduleforClient(): Error', error);
        }
    ); 
  }

  sendASessionEmail(sid)
  {
    let checksum = this.g.AuthChecksum;
    let cid = this.clientID;
    this.http.post(this.g.API + 'SCSE2',{checksum,cid,sid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
         
        },
        error => {
          console.log('AddScheduleforClient(): Error', error);
        }
    ); 
  }

  EditScheduleforClient()
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
            this.GetSchedulesforClient(id);
            if(deletes) 
            { 
              this.pickEditModal.hide();
              location.reload();
            }
          }
          else this.editscheduleresponsetype = 2;
        },
        error => {
          console.log('EditScheduleforClient(): Error', error);
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
    console.log(id);
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

    // Set controls
    if(this.editschedule)
    {
      setTimeout( ()=> {
        this.editModalSetupControls();
      }, 10);
      setTimeout( ()=> {
        this.editModalSetupControls();
      }, 100);
    }
  }

  setMinutes(value)
  {
    this.sessionLength = value;
  }

  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.clientID = id;

    if(this.clientID != 'scheduling' && this.clientID != '') 
    {
      if(this.clientID.includes('-'))
      {
        this.GetClientID(this.clientID);
      }
      else
      {
          this.GetClientInfo(this.clientID);
          this.GetSchedulesforClient(this.clientID);
      }
    }

       // Daylight Savings Time
       let curDate = new Date();
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
      if(ev['detail'].type == 'PM') this.datelocal.hour+=12;
      this.datelocal.minute = parseInt(minutes);
    });

    setTimeout( ()=> {
      let topelem = document.getElementsByClassName("sidebar");
      if(topelem) 
      {
        for(let i=0;i<topelem.length;i++)
        {
          let elem = <HTMLElement>topelem[i];
          if(!elem) continue;
          elem.style.display = 'none';
        }
      }
      topelem = document.getElementsByClassName("app-header");
      if(topelem) 
      {
        for(let i=0;i<topelem.length;i++)
        {
          let elem = <HTMLElement>topelem[i];
          if(!elem) continue;
          elem.style.display = 'none';
        }
      }
      topelem = document.getElementsByClassName("breadcrumb");
      if(topelem) 
      {
        for(let i=0;i<topelem.length;i++)
        {
          let elem = <HTMLElement>topelem[i];
          if(!elem) continue;
          elem.style.display = 'none';
        }
      }
      topelem = document.getElementsByClassName("app-footer");
      if(topelem) 
      {
        for(let i=0;i<topelem.length;i++)
        {
          let elem = <HTMLElement>topelem[i];
          if(!elem) continue;
          elem.style.display = 'none';
        }
      }
      topelem = document.getElementsByClassName("main");
      if(topelem) 
      {
        for(let i=0;i<topelem.length;i++)
        {
          let elem = <HTMLElement>topelem[i];
          if(!elem) continue;
          elem.style['margin-left'] = '1%';
        }
      }
      topelem = document.getElementsByClassName("app-body");
      if(topelem) 
      {
        for(let i=0;i<topelem.length;i++)
        {
          let elem = <HTMLElement>topelem[i];
          if(!elem) continue;
          elem.style['margin-top'] = '21px';
        }
      }
    }, 1);
    
   
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