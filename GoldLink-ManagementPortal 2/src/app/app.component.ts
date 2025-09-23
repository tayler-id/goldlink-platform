import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { IconSetService } from '@coreui/icons-angular';
import { freeSet } from '@coreui/icons';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GlobalVariables } from './app.globals';
import tippy from '../../node_modules/tippy.js/dist/tippy.umd.min.js';


@Component({
  // tslint:disable-next-line
  selector: 'body',
  template: '<router-outlet></router-outlet>',
  providers: [IconSetService],
})
export class AppComponent implements OnInit, AfterViewInit {
  constructor(
    private router: Router,
    private http: HttpClient,
    private g: GlobalVariables,
    public iconSet: IconSetService
  ) {
    // iconSet singleton
    iconSet.icons = { ...freeSet };
  }

  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);

              // setup Tipsy Tooltips?
              setTimeout( ()=> { 
                let navbarTogglers = document.getElementsByTagName('app-sidebar-nav-link');
                if(navbarTogglers)
                {
                  for (let i = 0; i < navbarTogglers.length; i++) 
                  {
                    //console.log(navbarTogglers[i]);
                    let navbarElem = navbarTogglers[i];
                    if(!navbarElem) continue;
                    navbarElem.id = "navbarElem" + i;
                  }
                }
          
                tippy('#navbarElem0', {
                  content: '<strong>View Clients <span style="color: aqua;">Helper</span></strong><br/><p>To view, filter, and create video sessions, click here.</p><p>Clients will show in the table, you may click them and then press Start a Session.</p><p>Any information is searchable on the top-right of the table.</p>',
                  allowHTML: true,
                  placement: 'right',
                  delay: 600,
                  
                });
          
                tippy('#navbarElem1', {
                  content: '<strong>Add Client <span style="color: aqua;">Helper</span></strong><br/><p>To add a new client, click here.</p><p>Required fields are name and jurisdiction; the others are optional.</p><p>To send text or email invitations, the optional phone or email field(s) must be filled, or can be edited in later.</p>',
                  allowHTML: true,
                  placement: 'right',
                  delay: 600
                });
          
                tippy('#navbarElem2', {
                  content: '<strong>View Calendar <span style="color: aqua;">Helper</span></strong><br/><p>To view, edit, or add schedules, click here.</p><p>Automatic notification settings will appear if the client has respective email/phone fields filled in.</p><p>A notification will be sent to the client once a session is set up, and at selected times.</p><p>The time on the server is EST UTC-5 (Eastern Standard) time, please check "Your Timezone" to see if the timezone adjusted properly.</p>',
                  allowHTML: true,
                  placement: 'right',
                  delay: 600
                });
          
                tippy('#navbarElem3', {
                  content: '<strong>Users <span style="color: aqua;">Helper</span></strong><br/><p>To view, edit, or add company users, click here.</p><p>After adding a new user, their login credentials must be copied & sent to them.</p><p>Users marked as inactive, excluding administrator accounts, will be unable to login.</p>',
                  allowHTML: true,
                  placement: 'right',
                  delay: 600
                });

                // Let's dynamically reset color schemes (test)
               /* let currentElements = document.getElementsByTagName('app-sidebar');
                if(currentElements.length>0)
                {
                  //console.log(currentElements);
                  let sidebarNavElem = currentElements[0];
                  if(sidebarNavElem) sidebarNavElem['style']['background'] = '#3c4b64';
                } 
                currentElements = document.getElementsByTagName('app-header');
                if(currentElements.length>0)
                {
                  //console.log(currentElements);
                  let headerElem = currentElements[0];
                  if(headerElem) { 
                    headerElem['style']['background-color'] = '#3c4b64';
                    headerElem['style']['border-bottom'] = '1px solid #c8ced317';
                  }
                } 

                document.documentElement.style.setProperty('--navselectorcolor', '#1b83d082'); // or #3a4248
                */

              },250);


    });

    // Get user data
    if(!this.g.userData) this.g.GetUserData();

    /*setTimeout( ()=> { // temp solution to remove navbar-toggle, until i find where it is
      let navbarTogglers = document.getElementsByClassName('navbar-toggler');
      if(navbarTogglers)
      {
        for (let i = 0; i < navbarTogglers.length; i++) 
        {
          //console.log(navbarTogglers[i]);
          if(i==2) navbarTogglers[i].remove();
        }
      }
    },10);*/
  }

  ngAfterViewInit(): void {

  }

}
