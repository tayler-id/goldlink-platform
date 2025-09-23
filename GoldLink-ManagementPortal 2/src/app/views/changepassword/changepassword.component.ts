import { Component, OnInit } from '@angular/core';
import { getStyle, hexToRgba } from '@coreui/coreui/dist/js/coreui-utilities';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { GlobalVariables } from '../../app.globals';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  templateUrl: 'changepassword.component.html'
})
export class ChangePasswordComponent implements OnInit {
  constructor(private g: GlobalVariables, private http: HttpClient) { }

  ResetPassword()
  {
      let checksum = this.g.AuthChecksum;
      let oldpass = '', newpass = '';

      let elem = <HTMLInputElement>document.getElementById("oldpass");
      if(elem) oldpass = elem.value;
      elem = <HTMLInputElement>document.getElementById("newpass");
      if(elem) newpass = elem.value;
  
      this.http.post(this.g.API + 'RP',{checksum,oldpass,newpass},{
        headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        responseType:'text'
        },
        )
        .subscribe(
          data => {
            if(data.length>0)
            {
              if(data == 'N') this.responsetype = 1;
              else if (data == 'Y') this.responsetype = 2;
            }
          },
          error => {
            console.log('ResetPassword(): Error', error);
          }
      ); 
  }

  public newpassChanged: Subject<string> = new Subject<string>();
  private newpassSubscription: Subscription
  public newpass: string = '';
  public passwordisvalid: boolean = false;
  public responsetype: number = 0;

  newpassvalid(){
    let elem = <HTMLInputElement>document.getElementById("newpass");
    if(elem) this.newpass = elem.value;
    this.newpassChanged.next(this.newpass);
  }
  
  ngOnInit(): void {

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
