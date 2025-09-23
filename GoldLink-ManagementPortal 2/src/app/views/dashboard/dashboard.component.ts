import { Component, OnDestroy, OnInit } from '@angular/core';
import { getStyle, hexToRgba } from '@coreui/coreui/dist/js/coreui-utilities';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {

  /* Client table related functions */
  public tablesearchChanged: Subject<string> = new Subject<string>();
  private tablesearchSubscription: Subscription;
  public tablesearch: string = '';
  public isClientTableCollapsed:boolean  = false;
  public isLoaded:boolean = false;
  public pageCurrentLimit: number = 25; // pagination: this will be set to 25, and also synced from user setting
  public currentPages: number = 0; // pagination: calculate number of pages to display into this value
  public currentPagesAngularFix = [1]; // needed for ngFor to work, angular related 
  public rowsDisplayedAfterSearch = -1;
  public SetTableSearchResults(input) // Set table visible rows based on search criteria
  {
      let filter, found, table, tr, td, i, j, spans;
      this.rowsDisplayedAfterSearch = 0;
      //input = document.getElementById("myInput");
      filter = input.toUpperCase();
      table = document.getElementById("clienttableBody"); // use tBody with ID or something for this to be specific
      tr = table.getElementsByTagName("tr");
      for (i = 0; i < tr.length; i++) {
          td = tr[i].getElementsByTagName("td");
          spans = tr[i].getElementsByTagName("span");
          for (j = 0; j < td.length; j++) {
              if (td[j].innerHTML.toUpperCase().indexOf(filter) > -1) {
                  found = true;
                  this.rowsDisplayedAfterSearch++;
              }
          }
          for (j = 0; j < spans.length; j++) {
            if (spans[j].innerHTML.toUpperCase().indexOf(filter) > -1) {
                found = true;
                this.rowsDisplayedAfterSearch++;
            }
        }
          if (found) {
              tr[i].style.display = "";
              found = false;
          } else {
              tr[i].style.display = "none";
          }
      }
  }
  TableSeachElemChanged(){
    let elem = <HTMLInputElement>document.getElementById("clienttablesearch");
    if(elem) 
    {
      this.tablesearch = elem.value;
      this.tablesearchChanged.next(this.tablesearch);
    }
  }
  /* end Client table related functions */

  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  // Statistical data definitions
  public visitors: number = 0;
  public clients: number = 0;
  public accounts: number = 0;
  public clientswithaccounts: number = 0;
  public linkpercent: string = '0.00';
  public avgtime: number = 0;
  public leftfeedback: number = 0;
  public rooms = [];
  public clientscount: number = 0;
  public paginatedtotalclientscount: number = 0; // amount total without accounting for pagination, when pagination is enabled

  public formattedUnixTime(unix_timestamp:number) : string
  {
    let date = new Date(unix_timestamp * 1000).toISOString().substr(11, 8); // already in seconds from our elasped time
    // Will display time in 10:30:23 format
    return date;
  }

  private SetupClientData() // Get statistical data and set it
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GCD',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          let parseddata = JSON.parse(data);
          //console.log(parseddata);
          this.visitors = parseddata.viewed;
          this.clients = parseddata.clients;
          this.accounts = parseddata.accounts;
          this.clientswithaccounts = parseddata.clientswithaccounts;
          this.linkpercent = (parseddata.clientswithaccounts / parseddata.clients*100).toFixed(2);
          this.avgtime = parseFloat((parseddata.clientavgtimes[0] / parseddata.clientavgtimes[1]).toFixed(0)); // total/num = avg
          this.leftfeedback = parseddata.feedback;
        },
        error => {
          console.log('SetupClientData(): Error', error);
        }
    ); 
  }
  private SetupClientTableData() // Get table data and add it
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GCTD',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          //console.log(data);

          let tableRef = document.getElementById('clientTable').getElementsByTagName('tbody')[0];
          let arrayofdata = JSON.parse(data);
          this.clientscount = arrayofdata.length;
          if(tableRef && arrayofdata.length>0)
          {
            tableRef.innerHTML = '';
            let firstclientobj = arrayofdata[0];
            if(firstclientobj && firstclientobj.totalValidRows!==undefined) this.paginatedtotalclientscount=parseInt(firstclientobj.totalValidRows);
            for(let i=0;i<arrayofdata.length;i++)
            {
              let currentobj = arrayofdata[i];
              if(!currentobj) continue;     
              let newRow = tableRef.insertRow(tableRef.rows.length);
              newRow.innerHTML = "<tr>";
              if(!currentobj['name'] || (currentobj['name'] && currentobj['name'][0]==' ')) currentobj['name'] = 'blank';
              newRow.innerHTML += "<td style='font-size:15px;'><a href='" + window.location.href + "/viewclient/" + currentobj['id'] + "'>" + currentobj['name'] + " </a><span style='display:none'>" + currentobj['email'] +","+currentobj['addr']+","+currentobj['phone']+","+currentobj['medicarenum']+"</span></td>";
              //newRow.innerHTML += "<td>" +  currentobj['creationtime'] + "</td>";
              let status = parseInt(currentobj['status']);
              let hasWaitingRoomOpen = (status & 1);
              let hasLinkedAccounts = (status & 2);
              let hasLeftFeedback = (status & 4);
              //console.log(this.accesslevel(), currentobj);
              if(this.accesslevel()>4) newRow.innerHTML += "<td class='creatorsstatus' style='font-size:13px' id='"+currentobj['involvedCID']+"'>" + '<div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div>' + "</td>";
              newRow.innerHTML += "<td class='roomstatus' id='"+currentobj['id']+"'>" +  '<div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div>' + "</td>";
              //if(hasLinkedAccounts) newRow.innerHTML += "<span class='badge badge-success' title='Active, video session is initialized' style='margin-left:3px;margin-top:5px'>Active <i class='cil-video c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
              //else if(hasSentEmail) newRow.innerHTML += "<span class='badge badge-warning' title='Has been sent a confirmation email' style='margin-left:3px;margin-top:5px'>Pending <i class='cil-envelope-letter c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
              //else newRow.innerHTML += "<span class='badge badge-secondary' title='Inactive, or video session not initialized' style='margin-left:3px;margin-top:5px'>Inactive <i class='cil-video-slash c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
              //if(hasLeftFeedback) newRow.innerHTML += "<span class='badge badge-secondary' title='Has left review or feedback' style='margin-left:3px;margin-top:5px'>Info <i class='cil-comment-bubble c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
              //newRow.innerHTML += "</td>";
              //newRow.innerHTML += "<td><a href='" + window.location.href + "/viewclient/" + currentobj['id'] + "'> <i class='cil-external-link c-icon c-icon-3xl c-icon-fix' style='color:#4DBDE1F0;font-size:30px;margin-left:9px'></i> </a></td>"
              newRow.innerHTML += "</tr>";
            }
          }

          if(!arrayofdata || arrayofdata.length == 0)
          {
            let tableRef = document.getElementById('clientTable');
            //tableRef.remove();
            tableRef.innerHTML = '';
            this.clientscount = 0;
          }

          this.isLoaded = true;

          // Setup recursive polling
          if(!this.isPollingRoomInfo) this.PollRoomInfo();

          // Setup creator names
          if(this.accesslevel()>4) this.GetInvolvedNames();

          // Setup search
          if(this.tablesearch)
          {
            setTimeout( ()=> { this.SetTableSearchResults(this.tablesearch); }, 1);
          }
        },
        error => {
          console.log('SetupClientTableData(): Error', error);
        }
    ); 
  }

  private SetupClientTableDataPagination(page=1) // Get table data and add it
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GCTDP',{checksum,page},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          //console.log(data);

          let tableRef = document.getElementById('clientTable').getElementsByTagName('tbody')[0];
          let arrayofdata = JSON.parse(data);
          this.clientscount = arrayofdata.length;
          if(tableRef)
          {
            tableRef.innerHTML = '';
            if(arrayofdata.length>0)
            {
              let firstclientobj = arrayofdata[0];
              if(firstclientobj && firstclientobj.totalValidRows!==undefined) this.paginatedtotalclientscount=parseInt(firstclientobj.totalValidRows);
              for(let i=0;i<arrayofdata.length;i++)
              {
                let currentobj = arrayofdata[i];
                if(!currentobj) continue;
                let newRow = tableRef.insertRow(tableRef.rows.length);
                newRow.innerHTML = "<tr>";
                if(!currentobj['name'] || (currentobj['name'] && currentobj['name'][0]==' ')) currentobj['name'] = 'blank';
                newRow.innerHTML += "<td style='font-size:15px;'><a href='" + window.location.href + "/viewclient/" + currentobj['id'] + "'>" + currentobj['name'] + " </a><span style='display:none'>" + currentobj['email'] +","+currentobj['addr']+","+currentobj['phone']+","+currentobj['medicarenum']+"</span></td>";
                //newRow.innerHTML += "<td>" +  currentobj['creationtime'] + "</td>";
                let status = parseInt(currentobj['status']);
                let hasWaitingRoomOpen = (status & 1);
                let hasLinkedAccounts = (status & 2);
                let hasLeftFeedback = (status & 4);
                //console.log(this.accesslevel(), currentobj);
                if(this.accesslevel()>4) newRow.innerHTML += "<td class='creatorsstatus' style='font-size:13px' id='"+currentobj['involvedCID']+"'>" + '<div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div>' + "</td>";
                newRow.innerHTML += "<td class='roomstatus' id='"+currentobj['id']+"'>" +  '<div class="sk-chase"><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div><div class="sk-chase-dot"></div></div>' + "</td>";
                //if(hasLinkedAccounts) newRow.innerHTML += "<span class='badge badge-success' title='Active, video session is initialized' style='margin-left:3px;margin-top:5px'>Active <i class='cil-video c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
                //else if(hasSentEmail) newRow.innerHTML += "<span class='badge badge-warning' title='Has been sent a confirmation email' style='margin-left:3px;margin-top:5px'>Pending <i class='cil-envelope-letter c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
                //else newRow.innerHTML += "<span class='badge badge-secondary' title='Inactive, or video session not initialized' style='margin-left:3px;margin-top:5px'>Inactive <i class='cil-video-slash c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
                //if(hasLeftFeedback) newRow.innerHTML += "<span class='badge badge-secondary' title='Has left review or feedback' style='margin-left:3px;margin-top:5px'>Info <i class='cil-comment-bubble c-icon c-icon-3xl c-icon-fix'></i></span>&nbsp;";
                //newRow.innerHTML += "</td>";
                //newRow.innerHTML += "<td><a href='" + window.location.href + "/viewclient/" + currentobj['id'] + "'> <i class='cil-external-link c-icon c-icon-3xl c-icon-fix' style='color:#4DBDE1F0;font-size:30px;margin-left:9px'></i> </a></td>"
                newRow.innerHTML += "</tr>";
              }
            }
          }

          if(!arrayofdata || arrayofdata.length == 0)
          {
            //let tableRef = document.getElementById('clientTable');
            //tableRef.remove();
            //tableRef.innerHTML = '';
            this.clientscount = 0;
          }

          this.isLoaded = true;
          this.currentPageLoaded = page;

          // Setup recursive polling
          if(!this.isPollingRoomInfo) this.PollRoomInfo();

          // Setup creator names
          if(this.accesslevel()>4) this.GetInvolvedNames();

          // Setup the active classname on elements
          let otherPageNumElems = document.getElementsByClassName("page-link");
          if(otherPageNumElems.length)
          {
            for(let i=0;i<otherPageNumElems.length;i++)
            {
              let elem = otherPageNumElems[i];
              if(!elem) continue;

              if(i != this.currentPageLoaded) elem.parentElement.classList.remove("active");
              else elem.parentElement.classList.add("active");
            }
          }
        },
        error => {
          console.log('SetupClientTableDataPagination(): Error', error);
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
          this.rooms = JSON.parse(data);

          // Get table rows that contain roomstatus class
          let elemRoomStatuses = document.getElementsByClassName('roomstatus');
          if(elemRoomStatuses && elemRoomStatuses.length)
          {
            for(let i=0;i<elemRoomStatuses.length;i++)
            {
              let elemRoomStatus = elemRoomStatuses[i];
              if(!elemRoomStatus) continue;
              let RoomID = elemRoomStatus.id;

              /*let FoundRoomData = false;
              for(let j=0;j<this.rooms.length;j++)
              {
                let room = this.rooms[j];
                if(!room) continue;
                if(room.room == RoomID) 
                { 
                  FoundRoomData = true;
                  elemRoomStatus.innerHTML = "Session active; with " + room.clients + " user(s).";
                }
              }
              if(!FoundRoomData) elemRoomStatus.innerHTML = "Session inactive; no users.";*/
            }

          }

          this.GetRoomStatuses();
        }
      },
      error: (e) => {
        console.log('GRI(): Error', e);
        //alert("The app is down for maintainence or is not functioning properly, please try back later! (Could not retrieve rooms)");
      }
  });  
  }

  private GetRoomStatuses() : void
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GRSA',{checksum},{
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    responseType:'text'
    },
    )
    .subscribe({
      next: (data) => {
        if(data !== '') // If it's empty, don't even parse
        {
          this.isLoaded = true;
          let roomdata = JSON.parse(data);

          // Get table rows that contain roomstatus class
          let elemRoomStatuses = document.getElementsByClassName('roomstatus');
          if(elemRoomStatuses && elemRoomStatuses.length)
          {
            for(let i=0;i<elemRoomStatuses.length;i++)
            {
              let elemRoomStatus = elemRoomStatuses[i];
              if(!elemRoomStatus) continue;
              let RoomID = elemRoomStatus.id;

              let FoundRoomData = false;
              let StatusSet = false;
              for(let j=0;j<this.rooms.length;j++)
              {
                let room = this.rooms[j];
                if(!room) continue;
                if(room.room == RoomID) 
                { 
                  FoundRoomData = true;
                  elemRoomStatus.innerHTML = "Session active; with " + room.clients + " user(s).";
                  StatusSet = true;
                }
              }
              
              for(let j=0;j<roomdata.length;j++)
              {
                let room = roomdata[j];
                if(!room) continue;
                if(room.id == RoomID) 
                { 
                  FoundRoomData = true;
                  if( (room.status&16) ) 
                  { 
                    if(StatusSet) { elemRoomStatus.innerHTML += " User in waiting room."; }
                    else { elemRoomStatus.innerHTML = "User in waiting room."; StatusSet = true; }
                  }
                  //if( (room.status&32) ) { elemRoomStatus.innerHTML = "Session ended."; StatusSet = true; }
                  if( (room.status&32) ) { elemRoomStatus.innerHTML = "Session inactive"; StatusSet = true; } // to avoid nonsense, just display the same thing
                }
              }

              if(FoundRoomData && !StatusSet) elemRoomStatus.innerHTML = "Session inactive";
            }

          }
        }
      },
      error: (e) => {
        console.log('GRI(): Error', e);
        //alert("The app is down for maintainence or is not functioning properly, please try back later! (Could not retrieve rooms)");
      }
  });  
  }

  public isPollingRoomInfo = 0;
  PollRoomInfo()
  {
    this.GetRoomsInfo();
    this.isPollingRoomInfo = 1;
    setTimeout(()=>{this.PollRoomInfo()},5000);
  }

  private SetupInvolvedNameElem(element, cid)
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GIN',{checksum, cid},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe({
        next: (data) => {
          if(data !== '') // If it's empty, don't even parse
          {
            if(data == 'N' && element) element.innerHTML = 'Deleted User';
            else
            {
            let involveddata = JSON.parse(data);
            
            if(element && involveddata)
            {
              element.innerHTML = involveddata[0].displaynamefirst + ' ' + involveddata[0].displaynamelast;
            }
  
            // element
            // Get table rows that contain roomstatus class
            /*let elemRoomStatuses = document.getElementsByClassName('roomstatus');
            if(elemRoomStatuses && elemRoomStatuses.length)
            {
              for(let i=0;i<elemRoomStatuses.length;i++)
              {
                let elemRoomStatus = elemRoomStatuses[i];
                if(!elemRoomStatus) continue;
                let RoomID = elemRoomStatus.id;
  
                let FoundRoomData = false;
                let StatusSet = false;
                for(let j=0;j<this.rooms.length;j++)
                {
                  let room = this.rooms[j];
                  if(!room) continue;
                  if(room.room == RoomID) 
                  { 
                    FoundRoomData = true;
                    elemRoomStatus.innerHTML = "Session active; with " + room.clients + " user(s).";
                    StatusSet = true;
                  }
                }
                
                for(let j=0;j<roomdata.length;j++)
                {
                  let room = roomdata[j];
                  if(!room) continue;
                  if(room.uuid == RoomID) 
                  { 
                    FoundRoomData = true;
                    if( (room.status&16) ) 
                    { 
                      if(StatusSet) { elemRoomStatus.innerHTML += " User in waiting room."; }
                      else { elemRoomStatus.innerHTML = "User in waiting room."; StatusSet = true; }
                    }
                    //if( (room.status&32) ) { elemRoomStatus.innerHTML = "Session ended."; StatusSet = true; }
                    if( (room.status&32) ) { elemRoomStatus.innerHTML = "Session inactive"; StatusSet = true; } // to avoid nonsense, just display the same thing
                  }
                }
  
                if(FoundRoomData && !StatusSet) elemRoomStatus.innerHTML = "Session inactive";
              }
  
            }*/
            }
          }
        },
        error: (e) => {
          console.log('GIN(): Error', e);
        }
      });  
  }


  private GetInvolvedNames()
  {
    let checksum = this.g.AuthChecksum;
    let elemsCreatedBy = document.getElementsByClassName('creatorsstatus');
    if(elemsCreatedBy && elemsCreatedBy.length)
    {
      for(let i=0;i<elemsCreatedBy.length;i++)
      {
        let elemCreatedBy = elemsCreatedBy[i];
        if(!elemCreatedBy) continue;
        let elementCID = elemCreatedBy.id;
        if(elementCID !== undefined && elementCID) this.SetupInvolvedNameElem(elemCreatedBy, elementCID);
      }
    }
  }

  public accesslevel()
  {
    //console.log(this.g.userData);
    if(this.g.userData) return this.g.userData.accesslevel;
    return 0;
  }

  gotoClientVideoRoom(roomID)
  {
    if(confirm("This will take you to the video session, continue?"))
    {
      this.r.navigate(["/startSession/" + roomID]);
    }
  }

  sortctablebyname(n)
  {
    let table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("clientTable");
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
        if(n==0)
        {
        x = rows[i].getElementsByTagName("a")[n];
        y = rows[i + 1].getElementsByTagName("a")[n];
        }
        else 
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

  public NavigateActions(clientID)
  {
    window.location.href = window.location.href + "/viewclient/" + clientID;
  }

  focusSearch()
  {
    let elem = document.getElementById('clienttablesearch');
    if(elem) elem.focus();
  }

  GetUserDatalocal()
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GUD',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          if(data !== '') // If it's empty, don't even parse
          {
            if(!this.g.userData) this.g.userData = JSON.parse(data);
          }

          let isPaginated = 0;

          if((this.g.userData.status&128)!=0)
          {
            isPaginated = 1;
            this.pageCurrentLimit = parseInt(this.g.userData.pagelimit);
          }

          if(isPaginated) this.SetupClientTableDataPagination();
          else this.SetupClientTableData();
        },
        error => {
          console.log('GetUserDatalocal(): Error', error);
        }
    ); 
  }

  userPaginationSettingEnabled()
  {
    if(!this.g.userData) return 0;
    let userStatus = this.g.userData.status;
    if((userStatus&128)!=0) return 1;
    else return 0;
  }

  paginationIsRequired()
  {
    if(!this.g.userData) return 0;
    let userStatus = this.g.userData.status;
    let conditionOne = 0, conditionTwo = 0;
    if((userStatus&128)!=0) conditionOne = 1;
    if(this.clientscount && this.clientscount>=(this.pageCurrentLimit-1)) conditionTwo = 1;
    if(conditionOne && conditionTwo) 
    {
      // Set num pages
      let numClients = this.paginatedtotalclientscount;
      this.currentPages = 1;
      this.currentPagesAngularFix = [1];
      while(numClients>0)
      {
          if(numClients%this.pageCurrentLimit==0) this.currentPages++;
          numClients--;
      }
      this.currentPagesAngularFix = Array(this.currentPages).fill(0).map((x,i)=>i);
      //console.log(this.currentPagesAngularFix, this.currentPages);

      // Return pagination should be visible
      return 1;
    }

    else return 0;
  }

  // Handle pagination
  currentPageLoaded = 0; // the current page index being displayed and loaded successfully
  handlePagination(event, index)
  {
    if(index<0) return;
    if(index>this.currentPages) return;
    this.SetupClientTableDataPagination(index);

    if(event)
    {
      let clickedelement = event.target;
      let otherPageNumElems = document.getElementsByClassName("page-link");
      if(otherPageNumElems.length)
      {
        for(let i=0;i<otherPageNumElems.length;i++)
        {
          let elem = otherPageNumElems[i];
          if(!elem) continue;
          elem.parentElement.classList.remove("active");
        }
      }
      clickedelement.parentElement.classList.add("active");
    }
  }
  handlePaginationNext()
  {
    let index = this.currentPageLoaded;
    if(index<0) { index=this.currentPageLoaded=1; }
    if(index>=this.currentPages) { index = this.currentPageLoaded = this.currentPages-1; }
    index++;
    this.SetupClientTableDataPagination(index);
  }
  handlePaginationPrev()
  {
    let index = this.currentPageLoaded;
    if(index>this.currentPages) { index = this.currentPages; }
    index--;
    if(index<1) { index=this.currentPages=1; }

    this.SetupClientTableDataPagination(index);
  }

  setPaginationOffAndSearch()
  {
    let searchString = this.tablesearch;
    if(!searchString) return;

    // Set pagination off locally for now
    if(!this.g.userData) return;
    this.g.userData.status &= ~128; 
    
    // Request new table data, and it will handle search with the search value
    this.SetupClientTableData();
  }


  ngOnInit(): void {
    // Setup statistical data
    //this.SetupClientData();

    // Setup getUserData then call Setup table/client data
    this.GetUserDatalocal();

    // Setup table/client data
    //this.SetupClientTableData();

    // Setup table search debounce
    this.tablesearchSubscription = this.tablesearchChanged.pipe(debounceTime(300),distinctUntilChanged()).subscribe(newText => {
        this.tablesearch = newText;
        this.SetTableSearchResults(this.tablesearch);
    });
  }

  ngOnDestroy() {
    this.tablesearchSubscription.unsubscribe();
  }
}
