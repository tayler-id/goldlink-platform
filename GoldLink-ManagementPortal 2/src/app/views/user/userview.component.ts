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

@Component({
  templateUrl: 'userview.component.html'
})
export class UserViewComponent implements OnInit {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  public responsetype:number = 0;
  public userresponsetype:number = 0;
  public userclientsresponsetype:number = 0;
  public userID:string = '';
  public isCollapsed:boolean = false;
  public isLoaded:boolean = false;
  public user:object = {};
  public userclients = [];

  @ViewChild('primaryModal') public primaryModal: ModalDirective;

  GetUserInfo(id)
  {
      let checksum = this.g.AuthChecksum;
      this.userresponsetype = 0;
      this.http.post(this.g.API + 'GUI',{checksum,id},{
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

              this.user['statusname'] = 'Active';
              let status = this.user['status'];
              if(status && (status&1)) this.user['statusname'] = 'Inactive';

              // Set successful response
              this.userresponsetype = 1;
              this.isLoaded = true;
            }
            else this.userresponsetype = 2;
          },
          error => {
            console.log('GetUserInfo(): Error', error);
          }
      ); 
  }

  GetUserClients(id)
  {
      let checksum = this.g.AuthChecksum;
      this.userclientsresponsetype = 0;
      this.http.post(this.g.API + 'GUC',{checksum,id},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0 && data != 'N')
            {
              // Parse user data
              this.userclients = JSON.parse(data);

              // Set type
              for(let i=0;i<this.userclients['length'];i++)
              {
                let client = this.userclients[i];
                if(!client) continue;
                if(client.compid == 1 && client.uid != this.g.userData.id) client.type = 'Private';
                else client.type = 'Nonprivate';
              }
        
              // Set Response
              this.userclientsresponsetype = 2;

            }
            else this.userclientsresponsetype=1;
          },
          error => {
            console.log('GetUserClients(): Error', error);
          }
      ); 
  }

  copyuserVideoURL() 
  {
    let text = this.user['emulatedVideoRoomURL'];
    navigator.clipboard.writeText(text).then().catch(e => console.log(e));
    alert("Session link has been copied to your clipboard.");
  }

  public deleteCurrentuser()
  {
    if(confirm("Are you sure want to remove this user?"))
    {
      let checksum = this.g.AuthChecksum;
      let uid = this.userID;
      this.http.post(this.g.API + 'DU',{checksum, uid},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        }).subscribe({
          next: (data) => {
            if(data !== '') // If it's empty, don't even parse
            {
              if(data == 'Y') this.r.navigate(['users']);
            }
          },
          error: (e) => {
            console.log('DU(): Error', e);
          }
        });  
    }
  }

  public getAccessLevel()
  {
    if(!this.g.userData) return 1;
    else return this.g.userData['accesslevel'];
  }

  gotoEdit() {
    this.r.navigate(["/users/edit/" + this.userID]);
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

  gotoClient(id)
  {
    this.r.navigate(["/client/view/" + id]);
  }

  ngOnInit(): void {

    let str = window.location.href;
    let id = str.substring(str.lastIndexOf("/") + 1, str.length);
    this.userID = id;
    if(this.userID != 'view' && this.userID != '') 
    {
      this.g.GetUserData();
      this.GetUserInfo(this.userID);
      sessionStorage.setItem('BMLastUser', this.userID);
      this.GetUserClients(this.userID);
    }
  }
  ngOnDestroy(): void {
    //this.useremailSubscription.unsubscribe();
  }
}
