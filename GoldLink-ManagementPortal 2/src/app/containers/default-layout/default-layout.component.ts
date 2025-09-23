import {Component, OnDestroy, OnInit} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { GlobalVariables } from '../../app.globals';
import { navItems } from '../../_nav';
import { INavData } from '@coreui/angular';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent implements OnInit, OnDestroy {
  constructor(private g: GlobalVariables) {}

  public sidebarMinimized = false;
  public navItems = this.g.getNavBarData();
  getNavBarData: Subscription;
  getThemeChanged: Subscription;

  toggleMinimize(e) {
    this.sidebarMinimized = e;
  }

  getNavItems()
  {
    return this.navItems;
  }

  getUserName()
  {
    let retText = 'Account';
    if(this.g.userData === undefined || !this.g.userData) return retText;
    if(this.g.userData.displaynamelast) 
    {
      retText = ''+this.g.userData.displaynamefirst + ' ' + this.g.userData.displaynamelast;
    }
    else if(this.g.userData.displaynamefirst) retText = ''+this.g.userData.displaynamefirst;

    // Create important callback for theme setting here
    this.checkAndSetTheme(this.g.userData.status);

    return retText;
  }

  getUserInitials()
  {
    let retText = '';
    if(this.g.userData === undefined || !this.g.userData) return retText;
    if(this.g.userData.displaynamefirst) retText += '' + this.g.userData.displaynamefirst.charAt(0).toUpperCase();
    else if(this.g.userData.displaynamelast) retText += '' + this.g.userData.displaynamelast.charAt(0).toUpperCase();

    // Adjust slightly for certain letters
    let adjustInitialsElem = document.getElementById('userInitials');
    if(adjustInitialsElem)
    {
      if(retText == 'J' || retText == 'L' || retText == 'I') adjustInitialsElem.style['padding-left'] = '3px';
      else if(retText == 'B' || retText == 'P' || retText == 'R' || retText == 'S' || retText == 'T' || retText == 'Y') { adjustInitialsElem.style['padding-left'] = '1px'; adjustInitialsElem.style['opacity'] = '0.9'; }
      else if(retText == 'E' || retText == 'F' || retText == 'K') adjustInitialsElem.style['padding-left'] = '1.5px'; 
      else if(retText == 'M' || retText == 'W') adjustInitialsElem.style['margin-left'] = '-37px'; 
      else { adjustInitialsElem.style['padding-left'] = '0'; adjustInitialsElem.style['padding-right'] = '0'; }
    }

    return retText;
  }

  public layoutMode:Number = -1; // 0 = corporate, 1 = blue, 2 = gold, 3 = black&gold, -1=not initialized
  public enforceblue = false;
  ChangeLayout(type=0)
  {
    if(type==0)
    {
      this.layoutMode = 0;
      let currentElements = document.getElementsByTagName('app-sidebar');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        let sidebarNavElem = currentElements[0];
        if(sidebarNavElem) sidebarNavElem['style']['background'] = '#2f353a';
      } 
      currentElements = document.getElementsByTagName('app-header');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        let headerElem = currentElements[0];
        if(headerElem) { 
          headerElem['style']['background-color'] = '#fff';
          headerElem['style']['border-bottom'] = '1px solid #c8ced3';
        }
      } 
      currentElements = document.getElementsByTagName('app-sidebar-nav-title');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        for(let i=0;i<currentElements.length;i++)
        {
          let titleElem = currentElements[i];
          if(titleElem) { 
            titleElem['style']['color'] = '';
          }
        }
      } 
      currentElements = document.getElementsByClassName('nav-icon');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        for(let i=0;i<currentElements.length;i++)
        {
          let titleElem = currentElements[i];
          if(titleElem) { 
            titleElem['style']['color'] = '';
          }
        }
      } 
      let elem = document.getElementById("logotop");
      if(elem) elem.style.display = 'none';
      document.documentElement.style.setProperty('--navselectorcolor', '#3a4248');
      document.documentElement.style.setProperty('--navhovercolor', '#20a8d8'); // primary theme color
      elem = document.getElementById("displaynameArea");
      if(elem) elem.style.removeProperty('color');
    }
    else if(type==1)
    {
      this.layoutMode = 1;
      let currentElements = document.getElementsByTagName('app-sidebar');
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
      currentElements = document.getElementsByTagName('app-sidebar-nav-title');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        let titleElem = currentElements[0];
        if(titleElem) { 
          titleElem['style']['color'] = '';
        }
      } 
      currentElements = document.getElementsByClassName('nav-icon');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        for(let i=0;i<currentElements.length;i++)
        {
          let titleElem = currentElements[i];
          if(titleElem) { 
            titleElem['style']['color'] = '';
          }
        }
      } 
      let elem = document.getElementById("logotop");
      if(elem) elem.style.display = 'block';
      document.documentElement.style.setProperty('--navselectorcolor', '#1b83d082'); // or #3a4248
      document.documentElement.style.setProperty('--navhovercolor', '#20a8d8'); // primary theme color
      elem = document.getElementById("displaynameArea");
      if(elem) elem.style.removeProperty('color');
    }
    else if(type==2)
    {
      this.layoutMode = 2;
      let currentElements = document.getElementsByTagName('app-sidebar');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        let sidebarNavElem = currentElements[0];
        if(sidebarNavElem) sidebarNavElem['style']['background'] = 'rgb(217, 216, 0)'; //#d5b33a
      } 
      currentElements = document.getElementsByTagName('app-header');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        let headerElem = currentElements[0];
        if(headerElem) { 
          headerElem['style']['background-color'] = 'rgba(219, 217, 61)';
          headerElem['style']['border-bottom'] = '1px solid rgba(26, 113, 185, 0.03)';
        }
      } 
      currentElements = document.getElementsByTagName('app-sidebar-nav-title');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        for(let i=0;i<currentElements.length;i++)
        {
          let titleElem = currentElements[i];
          if(titleElem) { 
            titleElem['style']['color'] = '#ffffff';
          }
        }
      } 
      currentElements = document.getElementsByClassName('nav-icon');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        for(let i=0;i<currentElements.length;i++)
        {
          let titleElem = currentElements[i];
          if(titleElem) { 
            titleElem['style']['color'] = '#eff0bd';
          }
        }
      } 
      setTimeout( ()=> { 
        currentElements = document.getElementsByTagName('app-sidebar-nav-title');
        if(currentElements.length>0)
        {
          //console.log(currentElements);
          for(let i=0;i<currentElements.length;i++)
          {
            let titleElem = currentElements[i];
            if(titleElem) { 
              titleElem['style']['color'] = '#ffffff';
            }
          }
        } 
        currentElements = document.getElementsByClassName('nav-icon');
        if(currentElements.length>0)
        {
          //console.log(currentElements);
          for(let i=0;i<currentElements.length;i++)
          {
            let titleElem = currentElements[i];
            if(titleElem) { 
              titleElem['style']['color'] = '#eff0bd';
            }
          }
        } 
      }, 750);
      let elem = document.getElementById("logotop");
      if(elem) elem.style.display = 'block';
      document.documentElement.style.setProperty('--navselectorcolor', '#031c2d25'); // or #3a4248
      document.documentElement.style.setProperty('--navhovercolor', '#031c2d85'); 
      elem = document.getElementById("displaynameArea");
      if(elem) elem.style.removeProperty('color');
    }
    else if(type==3)
    {
      this.layoutMode = 3;
      let currentElements = document.getElementsByTagName('app-sidebar');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        let sidebarNavElem = currentElements[0];
        if(sidebarNavElem) sidebarNavElem['style']['background'] = '';
      } 
      currentElements = document.getElementsByTagName('app-header');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        let headerElem = currentElements[0];
        if(headerElem) { 
          headerElem['style']['background-color'] = '#000000cf';
          headerElem['style']['border-bottom'] = '1px solid #c8ced317';
        }
      } 
      currentElements = document.getElementsByTagName('app-sidebar-nav-title');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        for(let i=0;i<currentElements.length;i++)
        {
          let titleElem = currentElements[i];
          if(titleElem) { 
            titleElem['style']['color'] = '#ffffff';
          }
        }
      } 
      currentElements = document.getElementsByClassName('nav-icon');
      if(currentElements.length>0)
      {
        //console.log(currentElements);
        for(let i=0;i<currentElements.length;i++)
        {
          let titleElem = currentElements[i];
          if(titleElem) { 
            titleElem['style']['color'] = '#eff0bd';
          }
        }
      } 
      setTimeout( ()=> { 
        currentElements = document.getElementsByTagName('app-sidebar-nav-title');
        if(currentElements.length>0)
        {
          //console.log(currentElements);
          for(let i=0;i<currentElements.length;i++)
          {
            let titleElem = currentElements[i];
            if(titleElem) { 
              titleElem['style']['color'] = '#ffffff';
            }
          }
        } 
        currentElements = document.getElementsByClassName('nav-icon');
        if(currentElements.length>0)
        {
          //console.log(currentElements);
          for(let i=0;i<currentElements.length;i++)
          {
            let titleElem = currentElements[i];
            if(titleElem) { 
              titleElem['style']['color'] = '#eff0bd';
            }
          }
        } 
      }, 750);
      let elem = document.getElementById("logotop");
      if(elem) elem.style.display = 'block';
      document.documentElement.style.setProperty('--navselectorcolor', '#031c2d25'); // or #3a4248
      document.documentElement.style.setProperty('--navhovercolor', '#031c2d85'); 

      elem = document.getElementById("displaynameArea");
      if(elem) elem.style.color = 'gold';
    }

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

  checkAndSetTheme(status)
  {
    let userStatus = parseInt(status);
    if(userStatus<0) userStatus = 0;
    //console.log(userStatus, this.layoutMode);
    if((userStatus&16)!=0 && this.layoutMode!=1) this.ChangeLayout(1);
    else if((userStatus&32)!=0 && this.layoutMode!=2) this.ChangeLayout(2);
    else if((userStatus&64)!=0 && this.layoutMode!=3) this.ChangeLayout(3);
    else if((userStatus&16)==0 && (userStatus&32)==0 && (userStatus&64)==0 && this.layoutMode!=0) this.ChangeLayout(0);
  }

  ngOnInit(): void {
    // Subscribe to save form data when navigating away
    this.getNavBarData = this.g.navbarDataChanged.subscribe((data) => {
      this.navItems = data;
    });

    // Subscribe on theme settings changed
    this.getThemeChanged = this.g.themeDataChanged.subscribe((data) => {
      //console.log(data);
      //this.checkAndSetTheme(data);
      location.reload(); // lazy way
    });

    //setTimeout( ()=> {
    //this.ChangeLayout(2);
    //}, 200);
  }

  ngOnDestroy(): void {
    this.getNavBarData.unsubscribe();
    this.getThemeChanged.unsubscribe();
  }
}
