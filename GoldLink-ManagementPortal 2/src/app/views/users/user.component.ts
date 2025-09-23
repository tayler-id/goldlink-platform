import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GlobalVariables } from '../../app.globals';

@Component({
  templateUrl: 'user.component.html'
})
export class UsersComponent implements OnInit, OnDestroy {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  isLoaded:boolean = false;
  isUserTableCollapsed:boolean = false;
  userscount: number = 0;

  /* Client table related functions */
  public tablesearchChanged: Subject<string> = new Subject<string>();
  private tablesearchSubscription: Subscription;
  public tablesearch: string = '';
  public isClientTableCollapsed:boolean  = false;
  public SetTableSearchResults(input) // Set table visible rows based on search criteria
  {
      let filter, found, table, tr, td, i, j, spans;
      //input = document.getElementById("myInput");
      filter = input.toUpperCase();
      table = document.getElementById("usertableBody"); // use tBody with ID or something for this to be specific
      tr = table.getElementsByTagName("tr");
      for (i = 0; i < tr.length; i++) {
          td = tr[i].getElementsByTagName("td");
          spans = tr[i].getElementsByTagName("span");
          for (j = 0; j < td.length; j++) {
              if (td[j].innerHTML.toUpperCase().indexOf(filter) > -1) {
                  found = true;
              }
          }
          for (j = 0; j < spans.length; j++) {
            if (spans[j].innerHTML.toUpperCase().indexOf(filter) > -1) {
                found = true;
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
    let elem = <HTMLInputElement>document.getElementById("usertablesearch");
    if(elem) 
    {
      this.tablesearch = elem.value;
      this.tablesearchChanged.next(this.tablesearch);
    }
  }
  /* end Client table related functions */

  focusSearch()
  {
    let elem = document.getElementById('usertablesearch');
    if(elem) elem.focus();
  }

  gotoAddUsers()
  {
    this.r.navigate(['/users/add']);
  }

  private SetupUserTableData() // Get table data and add it
  {
    let checksum = this.g.AuthChecksum;
    this.http.post(this.g.API + 'GUTD',{checksum},{
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
      responseType:'text'
      },
      )
      .subscribe(
        data => {
          //console.log(data);

          let tableRef = document.getElementById('userTable').getElementsByTagName('tbody')[0];
          let arrayofdata = JSON.parse(data);
          this.userscount = arrayofdata.length;
          if(tableRef && arrayofdata.length>0)
          {
            for(let i=0;i<arrayofdata.length;i++)
            {
              let currentobj = arrayofdata[i];
              if(!currentobj) continue;
              let newRow = tableRef.insertRow(tableRef.rows.length);
              newRow.innerHTML = "<tr>";
              newRow.innerHTML += "<td style='font-size:15px;'><a href='" + window.location.href + "/view/" + currentobj['id'] + "'>" + currentobj['displaynamefirst'] + ' ' + currentobj['displaynamelast'] +" </a><span style='display:none'>" + currentobj['email'] +","+currentobj['phone']+"</span></td>";
              //newRow.innerHTML += "<td>" +  currentobj['creationtime'] + "</td>";
              let status = parseInt(currentobj['status']);
              let isInactive = (status & 1);
              newRow.innerHTML += "<td>"+ currentobj['email'] +"</td>";
              newRow.innerHTML += "<td>"+ currentobj['phone'] +"</td>";
              let group = 'User';
              if(currentobj['accesslevel']>4) group = 'Administrator';
              newRow.innerHTML += "<td>"+ group +"</td>";
              if(isInactive) newRow.innerHTML += "<td>Inactive</td>";
              else newRow.innerHTML += "<td>Active</td>";
              newRow.innerHTML += "</tr>";
            }
          }

          this.isLoaded = true;
        },
        error => {
          console.log('SetupUserTableData(): Error', error);
        }
    ); 
    }

  ngOnInit(): void {

    // Setup table/client data
    this.SetupUserTableData();

    // Setup table search debounce
    this.tablesearchSubscription = this.tablesearchChanged.pipe(debounceTime(300),distinctUntilChanged()).subscribe(newText => {
      this.tablesearch = newText;
      this.SetTableSearchResults(this.tablesearch);
    });

    // Breadcrumb Fixer
    /*let breadcrumbelement = document.getElementsByTagName('cui-breadcrumb');
    if(breadcrumbelement)
    {
      let elem = breadcrumbelement[0];
      //console.log(elem);
      let childnodes = elem.childNodes;
      let childelem = childnodes[0];
      //console.log(childelem);
      let childofchildelem = childelem.childNodes;
      if(childofchildelem)
      {
        console.log(childofchildelem);
        childofchildelem[0]['innerHTML'] = '';
        childofchildelem[0]['innerText'] = '';
      }
      //childnodes[3]['innerHTML'] = 'Users';
      //if(elem) elem.innerHTML = 'Users';
    }*/

    /*let lastViewedUser = sessionStorage.getItem('BMLastUser');
    if(lastViewedUser) this.r.navigate(['/user/view/'+lastViewedUser]);*/
  }

  ngOnDestroy(): void {
    this.tablesearchSubscription.unsubscribe();
  }
}
